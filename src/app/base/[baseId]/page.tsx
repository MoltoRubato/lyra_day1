"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useState,
  use,
  useRef,
} from "react";
import GridView, {
  type BulkGeneratedRowsHint,
  type GridSearchNavigate,
  type GridSearchStatus,
} from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import ViewToolbar, {
  DEFAULT_VIEW_CONFIG,
  type OpenPanel,
  type ViewConfig,
} from "~/app/_components/ViewToolbar";
import {
  BrowserPageMetadata,
  createHomepageStyleBaseFavicon,
} from "~/app/_components/BrowserPageMetadata";
import { AppearancePanel } from "~/app/_components/base/AppearancePanel";
import { BaseIconSVG } from "~/app/_components/base/BaseIconSVG";
import { LeftSidebar } from "~/app/_components/base/LeftSidebar";
import { SyncIndicator } from "~/app/_components/base/SyncIndicator";
import { TableTabsBar } from "~/app/_components/base/TableTabsBar";
import { ViewSidebar } from "~/app/_components/base/ViewSidebar";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { getContrastTextColor } from "~/app/_components/baseAppearanceColors";

function TopBarAssetIcon({
  asset,
  tintColor,
  width,
  height,
}: {
  asset: number;
  tintColor: string;
  width: number;
  height: number;
}) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <AirtableAssetIcon
        asset={asset}
        alt=""
        tintColor={tintColor}
        style={{ width, height }}
      />
    </span>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BasePage({
  params,
}: {
  params: Promise<{ baseId: string }>;
}) {
  const { baseId } = use(params);
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  const {
    data: base,
    isLoading,
    error,
  } = api.base.getById.useQuery(
    { id: baseId },
    {
      retry: (failureCount, err) => {
        const isNotFound =
          (err as { data?: { code?: string } })?.data?.code === "NOT_FOUND";
        return isNotFound && failureCount < 4;
      },
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 3000),
    },
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const cancelBase = () => utils.base.getById.cancel({ id: baseId });
  const snapshotBase = () => utils.base.getById.getData({ id: baseId });
  const patchBase = (
    updater: Parameters<typeof utils.base.getById.setData>[1],
  ) => utils.base.getById.setData({ id: baseId }, updater);
  const restoreBase = (snap: ReturnType<typeof snapshotBase>) =>
    utils.base.getById.setData({ id: baseId }, snap);
  const invalidateBase = () => {
    void utils.base.getById.invalidate({ id: baseId });
    void utils.base.getAll.invalidate();
  };

  const cancelViews = (tableId: string) =>
    utils.view.getByTableId.cancel({ tableId });
  const snapshotViews = (tableId: string) =>
    utils.view.getByTableId.getData({ tableId });
  const patchViews = (
    tableId: string,
    updater: Parameters<typeof utils.view.getByTableId.setData>[1],
  ) => utils.view.getByTableId.setData({ tableId }, updater);
  const invalidateViews = (tableId: string) =>
    void utils.view.getByTableId.invalidate({ tableId });

  const renameTable = api.table.renameTable.useMutation({
    onMutate: async ({ tableId, name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) =>
        p
          ? {
              ...p,
              tables: p.tables.map((t) =>
                t.id === tableId ? { ...t, name } : t,
              ),
            }
          : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const deleteTable = api.table.deleteTable.useMutation({
    onMutate: async ({ tableId }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) =>
        p ? { ...p, tables: p.tables.filter((t) => t.id !== tableId) } : p,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSuccess: invalidateBase,
  });

  const createTable = api.table.create.useMutation({
    onMutate: async ({ name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      const tempId = `temp-tbl-${Date.now()}`;
      patchBase((p) =>
        p
          ? {
              ...p,
              tables: [
                ...p.tables,
                {
                  id: tempId,
                  name,
                  baseId,
                  order: p.tables.length,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  _count: { rows: 0 },
                },
              ],
            }
          : p,
      );
      return { snapshot, tempId };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const createView = api.view.create.useMutation({
    onMutate: async ({ tableId, name, type }) => {
      await cancelViews(tableId);
      const snapshot = snapshotViews(tableId);
      const tempId = `temp-view-${Date.now()}`;
      patchViews(tableId, (p) => {
        const views = p ?? [];
        return [
          ...views,
          {
            id: tempId,
            name,
            type: type ?? "GRID",
            order: views.length,
            groupByColumnId: null,
            tableId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      });
      return { snapshot, tempId, tableId };
    },
    onSuccess: (v, _vars, ctx) => {
      if (ctx?.tempId) tempViewToRealId.current[ctx.tempId] = v.id;
      patchViews(v.tableId, (p) =>
        p?.map((view) => (view.id === ctx?.tempId ? v : view)),
      );
      setActiveViewId((prev) =>
        prev === null || prev === ctx?.tempId ? v.id : prev,
      );
    },
    onError: (_e, vars, ctx) => {
      utils.view.getByTableId.setData({ tableId: vars.tableId }, ctx?.snapshot);
    },
    onSettled: (_d, _e, vars) => invalidateViews(vars.tableId),
  });

  const renameView = api.view.rename.useMutation({
    onMutate: async ({ viewId, name }) => {
      const tid = currentTableId ?? "";
      await cancelViews(tid);
      const snapshot = snapshotViews(tid);
      patchViews(tid, (p) =>
        p?.map((v) => (v.id === viewId ? { ...v, name } : v)),
      );
      return { snapshot, tid };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tid)
        utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      if ((ctx as { tid?: string })?.tid)
        invalidateViews((ctx as { tid: string }).tid);
    },
  });

  const deleteView = api.view.delete.useMutation({
    onMutate: async ({ viewId }) => {
      const tid = currentTableId ?? "";
      await cancelViews(tid);
      const snapshot = snapshotViews(tid);
      patchViews(tid, (p) => p?.filter((v) => v.id !== viewId));
      return { snapshot, tid };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tid)
        utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      invalidateViews((ctx as { tid?: string })?.tid ?? currentTableId ?? "");
    },
  });

  const updateApp = api.base.updateAppearance.useMutation({
    onMutate: async (vars) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => (prev ? { ...prev, ...vars } : prev));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const renameBase = api.base.rename.useMutation({
    onMutate: async ({ name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => (prev ? { ...prev, name } : prev));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const toggleStar = api.base.toggleStar.useMutation({
    onMutate: async ({ starred }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => (prev ? { ...prev, starred } : prev));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkAddPendingTableId, setBulkAddPendingTableId] = useState<
    string | null
  >(null);
  const [bulkGeneratedRowsHint, setBulkGeneratedRowsHint] =
    useState<BulkGeneratedRowsHint>(null);
  const bulkAddRows = api.table.bulkAddRows.useMutation({
    onMutate: async ({ tableId, count }) => {
      await utils.table.getById.cancel({ id: tableId });
      const snapshot = utils.table.getById.getData({ id: tableId });
      setBulkGeneratedRowsHint(null);
      utils.table.getById.setData({ id: tableId }, (prev) =>
        prev ? { ...prev, rowCount: prev.rowCount + count } : prev,
      );
      return { count, previousRowCount: snapshot?.rowCount ?? 0, snapshot };
    },
    onSuccess: ({ inserted, startOrder }, vars, ctx) => {
      setBulkGeneratedRowsHint({
        inserted,
        previousRowCount: ctx?.previousRowCount ?? 0,
        startOrder,
        tableId: vars.tableId,
      });
      if (inserted !== vars.count) {
        utils.table.getById.setData({ id: vars.tableId }, (prev) =>
          prev
            ? {
                ...prev,
                rowCount: Math.max(
                  prev.rows.length,
                  prev.rowCount - vars.count + inserted,
                ),
              }
            : prev,
        );
      }
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getAll.invalidate();
    },
    onError: (_error, vars, ctx) => {
      setBulkGeneratedRowsHint(null);
      utils.table.getById.setData({ id: vars.tableId }, ctx?.snapshot);
    },
    onSettled: () => {
      setBulkAdding(false);
      setBulkAddPendingTableId(null);
    },
  });
  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: async ({ tableId, orderedIds }) => {
      await utils.table.getById.cancel({ id: tableId });
      const snapshot = utils.table.getById.getData({ id: tableId });
      utils.table.getById.setData({ id: tableId }, (prev) => {
        if (!prev) return prev;
        const columnsById = new Map(
          prev.columns.map((column) => [column.id, column]),
        );
        return {
          ...prev,
          columns: orderedIds
            .map((columnId, order) => {
              const column = columnsById.get(columnId);
              return column ? { ...column, order } : null;
            })
            .filter(
              (column): column is (typeof prev.columns)[number] =>
                column !== null,
            ),
        };
      });
      return { snapshot };
    },
    onError: (_error, vars, ctx) => {
      utils.table.getById.setData({ id: vars.tableId }, ctx?.snapshot);
    },
    onSettled: (_data, _error, vars) => {
      void utils.table.getById.invalidate({ id: vars.tableId });
    },
  });

  async function handleBulkAddRows() {
    if (!currentTableId || bulkAdding) return;
    const targetTableId = currentTableId;
    setBulkAdding(true);
    setBulkAddPendingTableId(targetTableId);

    // Wait for any in-flight bulkDeleteRows mutations to finish before inserting,
    // otherwise the delete (which targets all rows by tableId) will wipe the
    // newly-inserted rows as well.
    const pendingDeletes = queryClient
      .getMutationCache()
      .getAll()
      .filter((m) => {
        const key = m.options.mutationKey;
        return (
          m.state.status === "pending" &&
          Array.isArray(key) &&
          key[0] === "table.bulkDeleteRows" &&
          key[1] === targetTableId
        );
      });
    if (pendingDeletes.length > 0) {
      const cache = queryClient.getMutationCache();
      await Promise.allSettled(
        pendingDeletes.map(
          (m) =>
            new Promise<void>((resolve) => {
              if (m.state.status !== "pending") {
                resolve();
                return;
              }
              const unsub = cache.subscribe((event) => {
                if (
                  event.mutation === m &&
                  m.state.status !== "pending"
                ) {
                  unsub();
                  resolve();
                }
              });
            }),
        ),
      );
    }

    bulkAddRows.mutate({ tableId: targetTableId, count: 100_000 });
  }

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const tempViewToRealId = useRef<Record<string, string>>({});
  const [viewSidebarOpen, setViewSidebar] = useState(true);
  const [sidebarHoverOpen, setSidebarHoverOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewDescriptions, setViewDescriptions] = useState<
    Record<string, string>
  >({});
  const [viewFavorites, setViewFavorites] = useState<Record<string, boolean>>(
    {},
  );
  const [recordLabels, setRecordLabels] = useState<Record<string, string>>({});
  const pendingRecordLabel = useRef<{ name: string; label: string } | null>(
    null,
  );

  const [viewConfigs, setViewConfigs] = useState<Record<string, ViewConfig>>(
    {},
  );
  const [collapsedGroupKeysByView, setCollapsedGroupKeysByView] = useState<
    Record<string, string[]>
  >({});
  const [availableGroupKeysByView, setAvailableGroupKeysByView] = useState<
    Record<string, string[]>
  >({});
  const [forcedToolbarPanel, setForcedToolbarPanel] = useState<Exclude<
    OpenPanel,
    null
  > | null>(null);
  const [gridSearchOpen, setGridSearchOpen] = useState(false);
  const [gridSearchQuery, setGridSearchQuery] = useState("");
  const [gridSearchMatchCount, setGridSearchMatchCount] = useState(0);
  const gridSearchNavigateRef = useRef<GridSearchNavigate | null>(null);

  function getViewConfig(viewId: string): ViewConfig {
    return { ...DEFAULT_VIEW_CONFIG, ...(viewConfigs[viewId] ?? {}) };
  }
  function updateViewConfig(viewId: string, patch: Partial<ViewConfig>) {
    setViewConfigs((prev) => ({
      ...prev,
      [viewId]: { ...DEFAULT_VIEW_CONFIG, ...(prev[viewId] ?? {}), ...patch },
    }));
  }
  function updateCollapsedGroupKeys(viewId: string, keys: string[]) {
    setCollapsedGroupKeysByView((prev) => {
      const current = prev[viewId] ?? [];
      const unchanged =
        current.length === keys.length &&
        current.every((key, index) => key === keys[index]);
      if (unchanged) return prev;
      return { ...prev, [viewId]: keys };
    });
  }
  function updateAvailableGroupKeys(viewId: string, keys: string[]) {
    setAvailableGroupKeysByView((prev) => {
      const current = prev[viewId] ?? [];
      const unchanged =
        current.length === keys.length &&
        current.every((key, index) => key === keys[index]);
      if (unchanged) return prev;
      return { ...prev, [viewId]: keys };
    });
  }
  function getViewDescription(viewId: string): string | null {
    return viewDescriptions[viewId] ?? null;
  }
  function updateViewDescription(viewId: string, description: string) {
    setViewDescriptions((prev) => ({ ...prev, [viewId]: description }));
  }
  function toggleViewFavorite(viewId: string) {
    setViewFavorites((prev) => ({ ...prev, [viewId]: !prev[viewId] }));
  }
  function getRecordLabel(tableId: string | null): string | null {
    if (!tableId) return null;
    return recordLabels[tableId] ?? null;
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentTableId = activeTableId ?? base?.tables[0]?.id ?? null;

  const { data: views = [] } = api.view.getByTableId.useQuery(
    { tableId: currentTableId ?? "" },
    { enabled: !!currentTableId },
  );
  const resolvedActiveViewId = activeViewId
    ? (tempViewToRealId.current[activeViewId] ?? activeViewId)
    : null;
  const activeView =
    views.find((v) => v.id === resolvedActiveViewId) ?? views[0] ?? null;

  const { data: currentTable } = api.table.getById.useQuery(
    { id: currentTableId ?? "" },
    { enabled: !!currentTableId },
  );

  const currentCfg = activeView
    ? getViewConfig(activeView.id)
    : DEFAULT_VIEW_CONFIG;
  const gridSearchEnabled = activeView?.type === "GRID";

  useEffect(() => {
    setGridSearchOpen(false);
    setGridSearchQuery("");
    setGridSearchMatchCount(0);
    gridSearchNavigateRef.current = null;
  }, [activeView?.id, activeView?.type, currentTableId]);

  const handleGridSearchStatusChange = useCallback(
    ({ totalMatches }: GridSearchStatus) => {
      startTransition(() => {
        setGridSearchMatchCount((prev) =>
          prev === totalMatches ? prev : totalMatches,
        );
      });
    },
    [],
  );

  const handleRegisterGridSearchNavigator = useCallback(
    (navigate: GridSearchNavigate | null) => {
      gridSearchNavigateRef.current = navigate;
    },
    [],
  );

  const handleOpenGridSearch = useCallback(() => {
    if (!gridSearchEnabled) return;
    setGridSearchOpen(true);
  }, [gridSearchEnabled]);

  const handleCloseGridSearch = useCallback(() => {
    setGridSearchOpen(false);
    setGridSearchQuery("");
    setGridSearchMatchCount(0);
  }, []);

  const handleGridSearchNavigate = useCallback((direction: 1 | -1) => {
    gridSearchNavigateRef.current?.(direction);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleRenameTable(tableId: string, name: string) {
    renameTable.mutate({ tableId, name });
  }
  function handleUpdateRecordLabel(tableId: string, label: string) {
    setRecordLabels((prev) => ({ ...prev, [tableId]: label }));
  }
  function handleDeleteTable(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId)
      setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }
  function handleCreateTable(
    name: string,
    recordLabel?: string,
    callbacks?: {
      onCreated?: (table: { id: string; name: string }) => void;
      onError?: () => void;
    },
  ) {
    if (recordLabel) pendingRecordLabel.current = { name, label: recordLabel };
    createTable.mutate(
      { baseId, name },
      {
        onSuccess: (t) => {
          setActiveTableId(t.id);
          setActiveViewId(null);
          const pending = pendingRecordLabel.current;
          if (pending?.name === t.name && pending?.label) {
            pendingRecordLabel.current = null;
            setRecordLabels((prev) => ({ ...prev, [t.id]: pending.label }));
          }
          callbacks?.onCreated?.({ id: t.id, name: t.name });
        },
        onError: () => callbacks?.onError?.(),
      },
    );
  }
  function handleRenameView(viewId: string, name: string) {
    renameView.mutate({ viewId, name });
  }
  function handleCreateView(name: string, type: "GRID" | "KANBAN") {
    if (!currentTableId) return;
    createView.mutate({ tableId: currentTableId, name, type });
  }
  function handleDuplicateView(viewId: string) {
    const v = views.find((view) => view.id === viewId);
    if (!v || !currentTableId) return;
    createView.mutate({
      tableId: currentTableId,
      name: `${v.name} copy`,
      type: v.type,
    });
  }
  function handleDeleteView(viewId: string) {
    deleteView.mutate({ viewId });
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading || (!base && !error))
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white"
        style={{
          fontFamily:
            '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        <div className="animate-pulse text-[13px] text-[#aaa]">Loading…</div>
      </div>
    );
  if (!base)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white"
        style={{
          fontFamily:
            '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        <div className="text-center">
          <p className="mb-4 text-[13px] text-[#aaa]">Base not found</p>
          <Link href="/" className="text-[13px] text-[#0069ff] hover:underline">
            ← Home
          </Link>
        </div>
      </div>
    );

  const baseColor = base.color ?? "#dc043b";
  const baseIcon = base.icon ?? "default";
  const toolbarIconSubtle = "rgb(97, 102, 112)";
  const shareTextColor = getContrastTextColor(baseColor);
  const currentTableName =
    base.tables.find((table) => table.id === currentTableId)?.name ??
    currentTable?.name ??
    null;
  const browserTitle = currentTableName
    ? `${base.name}: ${currentTableName} - Airtable`
    : `${base.name} - Airtable`;
  const browserIconHref = createHomepageStyleBaseFavicon({
    baseId: base.id,
    baseName: base.name,
    color: base.color,
    iconId: base.icon,
  });

  return (
    <>
      <BrowserPageMetadata title={browserTitle} iconHref={browserIconHref} />
      <div
        className="flex h-screen overflow-hidden"
        style={{
          fontFamily:
            '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
          fontSize: "13px",
        }}
      >
        <LeftSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ── Top nav bar ──────────────────────────────────────────────────── */}
          <header className="relative flex h-[56px] flex-shrink-0 items-center gap-0 border-b border-[#e0e0e0] bg-white px-3">
            {/* Left: base name button */}
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className={`group mr-2 flex flex-shrink-0 items-center gap-1.5 rounded transition-colors ${
                panelOpen
                  ? "border-2 border-[#2d323a] bg-white px-1.5 py-0.5"
                  : "px-2 py-1 hover:bg-[#f0f0ef]"
              }`}
            >
              <BaseIconSVG iconId={baseIcon} color={baseColor} size={32} />
              <span
                className="block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  color: "rgb(29, 31, 37)",
                  fontFamily:
                    '"Inter Display", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                  fontSize: "17px",
                  fontWeight: 675,
                  lineHeight: "24px",
                  letterSpacing: "-0.16px",
                  WebkitFontSmoothing: "antialiased",
                }}
              >
                {base.name}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="flex-shrink-0 text-[#999] transition-colors group-hover:text-[#555]"
              >
                <path
                  d="M2 3.5L5 6.5L8 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Center: nav tabs */}
            <div className="absolute left-1/2 flex h-full -translate-x-1/2 items-center">
              <div className="relative flex h-full items-center">
                <span className="cursor-default px-3 text-[13px] font-medium text-[#172b4d]">
                  Data
                </span>
                <div
                  className="absolute right-3 bottom-0 left-3 h-[2px] rounded-full"
                  style={{ backgroundColor: baseColor }}
                />
              </div>
              {["Automations", "Interfaces", "Forms"].map((t) => (
                <button
                  key={t}
                  className="h-full px-3 text-[13px] text-[#555] transition-colors hover:text-[#172b4d]"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
              <SyncIndicator />
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#616670] transition-colors hover:bg-[#f0f0ef]"
                title="Revision history"
              >
                <TopBarAssetIcon
                  asset={334}
                  tintColor={toolbarIconSubtle}
                  width={12.52}
                  height={12}
                />
              </button>
              <button className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[#efefef] px-3 text-[13px] text-[#1d1f25] transition-colors hover:bg-[#e7e7e7]">
                <AirtableAssetIcon
                  asset={452}
                  alt=""
                  size={16}
                  tintColor={toolbarIconSubtle}
                />
                Upgrade
              </button>
              <button className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[8px] border border-[#d8dbe1] px-2 text-[13px] text-[#1d1f25] transition-colors hover:bg-[#f5f5f4]">
                <span className="relative inline-flex h-4 w-4 items-center justify-center">
                  <AirtableAssetIcon
                    asset={87}
                    alt=""
                    size={16}
                    tintColor={toolbarIconSubtle}
                  />
                  <span className="absolute -right-[1px] -bottom-[1px] border-t-[4px] border-l-[4px] border-t-[#616670] border-l-transparent" />
                </span>
                Launch
              </button>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#d8dbe1] transition-colors hover:bg-[#f5f5f4]">
                <TopBarAssetIcon
                  asset={190}
                  tintColor={toolbarIconSubtle}
                  width={11.99}
                  height={11.99}
                />
              </button>
              <button
                className="h-7 rounded-[8px] px-3 text-[13px] font-medium transition-colors hover:brightness-95"
                style={{ background: baseColor, color: shareTextColor }}
              >
                Share
              </button>
            </div>
          </header>

          {/* ── Table tabs bar ───────────────────────────────────────────────── */}
          <TableTabsBar
            baseColor={baseColor}
            tables={base.tables}
            currentTableId={currentTableId}
            onSelectTable={(tableId) => {
              setActiveTableId(tableId);
              setActiveViewId(null);
            }}
            onRenameTable={handleRenameTable}
            onUpdateRecordLabel={handleUpdateRecordLabel}
            onDeleteTable={handleDeleteTable}
            onCreateTable={handleCreateTable}
            currentRecordLabel={getRecordLabel(currentTableId) ?? "Record"}
          />

          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          {activeView && currentTable ? (
            <ViewToolbar
              columns={currentTable.columns}
              config={currentCfg}
              onConfigChange={(patch) => updateViewConfig(activeView.id, patch)}
              onReorderColumns={(orderedIds) => {
                if (!currentTableId) return;
                reorderColumns.mutate({ tableId: currentTableId, orderedIds });
              }}
              frozenColumnCount={currentCfg.frozenColumnCount}
              activeViewName={activeView.name}
              activeViewType={activeView.type}
              activeViewId={activeView.id}
              activeViewDescription={getViewDescription(activeView.id)}
              onRenameView={handleRenameView}
              onUpdateViewDescription={updateViewDescription}
              onBulkAddRows={
                activeView.type === "GRID" ? handleBulkAddRows : undefined
              }
              bulkAdding={bulkAdding}
              onToggleSidebar={() => { setSidebarHoverOpen(false); setViewSidebar((p) => !p); }}
              sidebarOpen={viewSidebarOpen}
              onSidebarHoverStart={() => { if (!viewSidebarOpen) setSidebarHoverOpen(true); }}
              onSidebarHoverEnd={() => setSidebarHoverOpen(false)}
              forcedOpenPanel={forcedToolbarPanel}
              onForcedOpenHandled={() => setForcedToolbarPanel(null)}
              collapsedGroupKeys={collapsedGroupKeysByView[activeView.id] ?? []}
              availableGroupKeys={availableGroupKeysByView[activeView.id] ?? []}
              enableGridSearch={gridSearchEnabled}
              gridSearchOpen={gridSearchOpen}
              gridSearchQuery={gridSearchQuery}
              gridSearchMatchCount={gridSearchMatchCount}
              onOpenGridSearch={handleOpenGridSearch}
              onCloseGridSearch={handleCloseGridSearch}
              onGridSearchQueryChange={setGridSearchQuery}
              onGridSearchNavigate={handleGridSearchNavigate}
              onCollapseAllGroups={() =>
                updateCollapsedGroupKeys(
                  activeView.id,
                  availableGroupKeysByView[activeView.id] ?? [],
                )
              }
              onExpandAllGroups={() =>
                updateCollapsedGroupKeys(activeView.id, [])
              }
            />
          ) : (
            <div className="h-10 flex-shrink-0 border-b border-[#e0e0e0] bg-white" />
          )}

          {/* ── Body ──────────────────────────────────────────────────────────── */}
          <div className="relative flex flex-1 overflow-hidden">
            <ViewSidebar
              open={viewSidebarOpen || sidebarHoverOpen}
              views={views}
              activeViewId={activeView?.id ?? null}
              getViewConfig={getViewConfig}
              getViewDescription={getViewDescription}
              tables={base.tables}
              activeTableId={currentTableId}
              favorites={viewFavorites}
              onToggleFavorite={toggleViewFavorite}
              onDuplicateView={handleDuplicateView}
              canDeleteView={(viewId) => {
                const view = views.find((v) => v.id === viewId);
                if (!view) return false;
                if (view.type !== "GRID") return true;
                const gridCount = views.filter((v) => v.type === "GRID").length;
                return gridCount > 1;
              }}
              onSelectView={(viewId) => setActiveViewId(viewId)}
              onRenameView={handleRenameView}
              onDeleteView={handleDeleteView}
              onCreateView={handleCreateView}
            />

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden bg-white">
                {!currentTableId ? (
                  <div className="flex h-full items-center justify-center text-[13px] text-[#aaa]">
                    No tables yet — click the + to create one.
                  </div>
                ) : !activeView ? (
                  <div className="flex h-full animate-pulse items-center justify-center text-[13px] text-[#aaa]">
                    Loading views…
                  </div>
                ) : activeView.type === "GRID" ? (
                  <GridView
                    key={activeView.id}
                    tableId={currentTableId}
                    hiddenFields={currentCfg.hiddenFields}
                    filters={currentCfg.filters}
                    sorts={currentCfg.sorts}
                    groups={currentCfg.groups}
                    rowHeight={currentCfg.rowHeight}
                    wrapHeaders={currentCfg.wrapHeaders}
                    frozenColumnCount={currentCfg.frozenColumnCount}
                    recordLabel={getRecordLabel(currentTableId) ?? "Record"}
                    onSortsChange={(sorts) =>
                      updateViewConfig(activeView.id, { sorts })
                    }
                    onFiltersChange={(filters) =>
                      updateViewConfig(activeView.id, { filters })
                    }
                    onGroupsChange={(groups) =>
                      updateViewConfig(activeView.id, { groups })
                    }
                    onFrozenColumnCountChange={(count) =>
                      updateViewConfig(activeView.id, {
                        frozenColumnCount: count,
                      })
                    }
                    onRequestOpenSortPanel={() => setForcedToolbarPanel("sort")}
                    onRequestOpenFilterPanel={() =>
                      setForcedToolbarPanel("filter")
                    }
                    onRequestOpenGroupPanel={() =>
                      setForcedToolbarPanel("group")
                    }
                    collapsedGroupKeys={
                      collapsedGroupKeysByView[activeView.id] ?? []
                    }
                    onCollapsedGroupKeysChange={(keys) =>
                      updateCollapsedGroupKeys(activeView.id, keys)
                    }
                    onAvailableGroupKeysChange={(keys) =>
                      updateAvailableGroupKeys(activeView.id, keys)
                    }
                    bulkGeneratedRowsHint={bulkGeneratedRowsHint}
                    bulkAddInFlight={
                      bulkAdding && bulkAddPendingTableId === currentTableId
                    }
                    searchOpen={gridSearchOpen}
                    searchQuery={gridSearchQuery}
                    onSearchStatusChange={handleGridSearchStatusChange}
                    onRegisterSearchNavigator={handleRegisterGridSearchNavigator}
                  />
                ) : (
                  <KanbanView
                    key={activeView.id}
                    tableId={currentTableId}
                    groupByColumnId={activeView.groupByColumnId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appearance panel */}
        {panelOpen && (
          <AppearancePanel
            base={{
              name: base.name,
              color: base.color ?? "#dc043b",
              icon: base.icon ?? "default",
              guide: base.guide ?? null,
              starred: base.starred,
            }}
            onClose={() => setPanelOpen(false)}
            onRename={(name) => renameBase.mutate({ id: baseId, name })}
            onUpdateColor={(c) => updateApp.mutate({ id: baseId, color: c })}
            onUpdateIcon={(i) => updateApp.mutate({ id: baseId, icon: i })}
            onUpdateGuide={(g) => updateApp.mutate({ id: baseId, guide: g })}
            onToggleStar={() =>
              toggleStar.mutate({ id: baseId, starred: !base.starred })
            }
          />
        )}
      </div>
    </>
  );
}
