"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use, useRef } from "react";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import ViewToolbar, {
  DEFAULT_VIEW_CONFIG,
  type OpenPanel,
  type ViewConfig,
} from "~/app/_components/ViewToolbar";
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

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();

  const { data: base, isLoading, error } = api.base.getById.useQuery(
    { id: baseId },
    {
      retry: (failureCount, err) => {
        const isNotFound = (err as { data?: { code?: string } })?.data?.code === "NOT_FOUND";
        return isNotFound && failureCount < 4;
      },
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 3000),
    }
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const cancelBase    = () => utils.base.getById.cancel({ id: baseId });
  const snapshotBase  = () => utils.base.getById.getData({ id: baseId });
  const patchBase     = (updater: Parameters<typeof utils.base.getById.setData>[1]) =>
    utils.base.getById.setData({ id: baseId }, updater);
  const restoreBase   = (snap: ReturnType<typeof snapshotBase>) =>
    utils.base.getById.setData({ id: baseId }, snap);
  const invalidateBase = () => {
    void utils.base.getById.invalidate({ id: baseId });
    void utils.base.getAll.invalidate();
  };

  const cancelViews   = (tableId: string) => utils.view.getByTableId.cancel({ tableId });
  const snapshotViews = (tableId: string) => utils.view.getByTableId.getData({ tableId });
  const patchViews    = (tableId: string, updater: Parameters<typeof utils.view.getByTableId.setData>[1]) =>
    utils.view.getByTableId.setData({ tableId }, updater);
  const invalidateViews = (tableId: string) =>
    void utils.view.getByTableId.invalidate({ tableId });

  const renameTable = api.table.renameTable.useMutation({
    onMutate: async ({ tableId, name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) => p ? { ...p, tables: p.tables.map((t) => t.id === tableId ? { ...t, name } : t) } : p);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const deleteTable = api.table.deleteTable.useMutation({
    onMutate: async ({ tableId }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((p) => p ? { ...p, tables: p.tables.filter((t) => t.id !== tableId) } : p);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const createTable = api.table.create.useMutation({
    onMutate: async ({ name }) => {
      await cancelBase();
      const snapshot = snapshotBase();
      const tempId = `temp-tbl-${Date.now()}`;
      patchBase((p) => p ? {
        ...p,
        tables: [...p.tables, {
          id: tempId, name, baseId, order: p.tables.length,
          createdAt: new Date(), updatedAt: new Date(),
          _count: { rows: 0 },
        }],
      } : p);
      return { snapshot, tempId };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const createView = api.view.create.useMutation({
    onMutate: async ({ tableId, name, type }) => {
      await cancelViews(tableId);
      const snapshot = snapshotViews(tableId);
      const tempId   = `temp-view-${Date.now()}`;
      patchViews(tableId, (p) => {
        const views = p ?? [];
        return [...views, {
          id: tempId, name, type: type ?? "GRID",
          order: views.length, groupByColumnId: null,
          tableId, createdAt: new Date(), updatedAt: new Date(),
        }];
      });
      return { snapshot, tempId, tableId };
    },
    onSuccess: (v, _vars, ctx) => {
      if (ctx?.tempId) tempViewToRealId.current[ctx.tempId] = v.id;
      patchViews(v.tableId, (p) =>
        p?.map((view) => view.id === ctx?.tempId ? v : view)
      );
      setActiveViewId((prev) =>
        prev === null || prev === ctx?.tempId ? v.id : prev
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
      patchViews(tid, (p) => p?.map((v) => v.id === viewId ? { ...v, name } : v));
      return { snapshot, tid };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tid) utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      if ((ctx as { tid?: string })?.tid) invalidateViews((ctx as { tid: string }).tid);
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
      if (ctx?.tid) utils.view.getByTableId.setData({ tableId: ctx.tid }, ctx.snapshot);
    },
    onSettled: (_d, _e, _v, ctx) => {
      invalidateViews((ctx as { tid?: string })?.tid ?? currentTableId ?? "");
    },
  });

  const updateApp = api.base.updateAppearance.useMutation({
    onMutate: async (vars) => {
      await cancelBase();
      const snapshot = snapshotBase();
      patchBase((prev) => prev ? { ...prev, ...vars } : prev);
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
      patchBase((prev) => prev ? { ...prev, starred } : prev);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restoreBase(ctx?.snapshot),
    onSettled: invalidateBase,
  });

  const [bulkAdding, setBulkAdding] = useState(false);
  const bulkAddRows = api.table.bulkAddRows.useMutation({
    onMutate: async ({ tableId, count }) => {
      await utils.table.getById.cancel({ id: tableId });
      const snapshot = utils.table.getById.getData({ id: tableId });
      utils.table.getById.setData({ id: tableId }, (prev) =>
        prev ? { ...prev, rowCount: prev.rowCount + count } : prev,
      );
      return { snapshot, count };
    },
    onSuccess: ({ inserted }, vars) => {
      if (inserted !== vars.count) {
        utils.table.getById.setData({ id: vars.tableId }, (prev) =>
          prev
            ? {
                ...prev,
                rowCount: Math.max(prev.rows.length, prev.rowCount - vars.count + inserted),
              }
            : prev,
        );
      }
      void utils.table.getById.invalidate({ id: vars.tableId });
      void utils.base.getById.invalidate({ id: baseId });
      void utils.base.getAll.invalidate();
    },
    onError: (_error, vars, ctx) => {
      utils.table.getById.setData({ id: vars.tableId }, ctx?.snapshot);
    },
    onSettled: () => setBulkAdding(false),
  });
  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: async ({ tableId, orderedIds }) => {
      await utils.table.getById.cancel({ id: tableId });
      const snapshot = utils.table.getById.getData({ id: tableId });
      utils.table.getById.setData({ id: tableId }, (prev) => {
        if (!prev) return prev;
        const columnsById = new Map(prev.columns.map((column) => [column.id, column]));
        return {
          ...prev,
          columns: orderedIds
            .map((columnId, order) => {
              const column = columnsById.get(columnId);
              return column ? { ...column, order } : null;
            })
            .filter((column): column is (typeof prev.columns)[number] => column !== null),
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

  function handleBulkAddRows() {
    if (!currentTableId || bulkAdding) return;
    setBulkAdding(true);
    bulkAddRows.mutate({ tableId: currentTableId, count: 100_000 });
  }

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId]   = useState<string | null>(null);
  const tempViewToRealId                  = useRef<Record<string, string>>({});
  const [viewSidebarOpen, setViewSidebar] = useState(true);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [viewDescriptions, setViewDescriptions] = useState<Record<string, string>>({});
  const [viewFavorites, setViewFavorites] = useState<Record<string, boolean>>({});
  const [recordLabels, setRecordLabels]   = useState<Record<string, string>>({});
  const pendingRecordLabel = useRef<{ name: string; label: string } | null>(null);

  const [viewConfigs, setViewConfigs] = useState<Record<string, ViewConfig>>({});
  const [forcedToolbarPanel, setForcedToolbarPanel] = useState<Exclude<OpenPanel, null> | null>(null);

  function getViewConfig(viewId: string): ViewConfig {
    return { ...DEFAULT_VIEW_CONFIG, ...(viewConfigs[viewId] ?? {}) };
  }
  function updateViewConfig(viewId: string, patch: Partial<ViewConfig>) {
    setViewConfigs((prev) => ({
      ...prev,
      [viewId]: { ...DEFAULT_VIEW_CONFIG, ...(prev[viewId] ?? {}), ...patch },
    }));
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
  const activeView = views.find((v) => v.id === resolvedActiveViewId) ?? views[0] ?? null;

  const { data: currentTable } = api.table.getById.useQuery(
    { id: currentTableId ?? "" },
    { enabled: !!currentTableId },
  );

  const currentCfg = activeView ? getViewConfig(activeView.id) : DEFAULT_VIEW_CONFIG;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleRenameTable(tableId: string, name: string) {
    renameTable.mutate({ tableId, name });
  }
  function handleDeleteTable(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId) setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }
  function handleCreateTable(name: string, recordLabel?: string) {
    if (recordLabel) pendingRecordLabel.current = { name, label: recordLabel };
    createTable.mutate({ baseId, name }, {
      onSuccess: (t) => {
        setActiveTableId(t.id);
        setActiveViewId(null);
        const pending = pendingRecordLabel.current;
        if (pending?.name === t.name && pending?.label) {
          pendingRecordLabel.current = null;
          setRecordLabels((prev) => ({ ...prev, [t.id]: pending.label }));
        }
      },
    });
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
    createView.mutate({ tableId: currentTableId, name: `${v.name} copy`, type: v.type });
  }
  function handleDeleteView(viewId: string) {
    deleteView.mutate({ viewId });
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading || (!base && !error)) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}>
      <div className="text-[13px] text-[#aaa] animate-pulse">Loading…</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}>
      <div className="text-center">
        <p className="text-[#aaa] mb-4 text-[13px]">Base not found</p>
        <Link href="/" className="text-[#0069ff] text-[13px] hover:underline">← Home</Link>
      </div>
    </div>
  );

  const baseColor = base.color ?? "#dc043b";
  const baseIcon  = base.icon  ?? "default";
  const toolbarIconSubtle = "rgb(97, 102, 112)";
  const shareTextColor = getContrastTextColor(baseColor);

  return (
    <div className="h-screen flex overflow-hidden"
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        fontSize: "13px",
      }}>

      <LeftSidebar/>

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top nav bar ──────────────────────────────────────────────────── */}
        <header className="h-[56px] bg-white border-b border-[#e0e0e0] flex items-center px-3 gap-0 flex-shrink-0 relative">

          {/* Left: base name button */}
          <button onClick={() => setPanelOpen((p) => !p)}
            className={`group mr-2 flex flex-shrink-0 items-center gap-1.5 rounded transition-colors ${
              panelOpen
                ? "border-2 border-[#2d323a] bg-white px-1.5 py-0.5"
                : "px-2 py-1 hover:bg-[#f0f0ef]"
            }`}>
            <BaseIconSVG iconId={baseIcon} color={baseColor} size={32}/>
            <span
              className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                color: "rgb(29, 31, 37)",
                fontFamily:
                  "\"Inter Display\", -apple-system, system-ui, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\"",
                fontSize: "17px",
                fontWeight: 675,
                lineHeight: "24px",
                letterSpacing: "-0.16px",
                WebkitFontSmoothing: "antialiased",
              }}
            >
              {base.name}
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#999] group-hover:text-[#555] transition-colors flex-shrink-0">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Center: nav tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
            <div className="relative flex items-center h-full">
              <span className="text-[13px] font-medium text-[#172b4d] px-3 cursor-default">Data</span>
              <div
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                style={{ backgroundColor: baseColor }}
              />
            </div>
            {["Automations","Interfaces","Forms"].map((t) => (
              <button key={t} className="text-[13px] text-[#555] hover:text-[#172b4d] px-3 h-full transition-colors">{t}</button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <SyncIndicator/>
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[#616670] hover:bg-[#f0f0ef] transition-colors"
              title="Revision history"
            >
              <TopBarAssetIcon asset={334} tintColor={toolbarIconSubtle} width={12.52} height={12} />
            </button>
            <button className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-[13px] text-[#1d1f25] bg-[#efefef] rounded-full hover:bg-[#e7e7e7] transition-colors">
              <AirtableAssetIcon asset={452} alt="" size={16} tintColor={toolbarIconSubtle} />
              Upgrade
            </button>
            <button className="h-7 inline-flex items-center justify-center gap-1.5 px-2 text-[13px] text-[#1d1f25] border border-[#d8dbe1] rounded-[8px] hover:bg-[#f5f5f4] transition-colors">
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <AirtableAssetIcon asset={87} alt="" size={16} tintColor={toolbarIconSubtle} />
                <span className="absolute -bottom-[1px] -right-[1px] border-l-[4px] border-l-transparent border-t-[4px] border-t-[#616670]" />
              </span>
              Launch
            </button>
            <button className="h-7 w-7 inline-flex items-center justify-center rounded-[8px] border border-[#d8dbe1] hover:bg-[#f5f5f4] transition-colors">
              <TopBarAssetIcon asset={190} tintColor={toolbarIconSubtle} width={11.99} height={11.99} />
            </button>
            <button
              className="h-7 px-3 text-[13px] font-medium rounded-[8px] transition-colors hover:brightness-95"
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
            onBulkAddRows={activeView.type === "GRID" ? handleBulkAddRows : undefined}
            bulkAdding={bulkAdding}
            onToggleSidebar={() => setViewSidebar((p) => !p)}
            forcedOpenPanel={forcedToolbarPanel}
            onForcedOpenHandled={() => setForcedToolbarPanel(null)}
          />
        ) : (
          <div className="h-10 border-b border-[#e0e0e0] bg-white flex-shrink-0" />
        )}

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          <ViewSidebar
            open={viewSidebarOpen}
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

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden bg-white">
              {!currentTableId ? (
                <div className="flex items-center justify-center h-full text-[13px] text-[#aaa]">
                  No tables yet — click the + to create one.
                </div>
              ) : !activeView ? (
                <div className="flex items-center justify-center h-full text-[13px] text-[#aaa] animate-pulse">Loading views…</div>
              ) : activeView.type === "GRID" ? (
                <GridView
                  key={activeView.id}
                  tableId={currentTableId}
                  hiddenFields={currentCfg.hiddenFields}
                  filters={currentCfg.filters}
                  sorts={currentCfg.sorts}
                  groups={currentCfg.groups}
                  rowHeight={currentCfg.rowHeight}
                  frozenColumnCount={currentCfg.frozenColumnCount}
                  recordLabel={getRecordLabel(currentTableId) ?? "Record"}
                  onSortsChange={(sorts) => updateViewConfig(activeView.id, { sorts })}
                  onFiltersChange={(filters) => updateViewConfig(activeView.id, { filters })}
                  onGroupsChange={(groups) => updateViewConfig(activeView.id, { groups })}
                  onFrozenColumnCountChange={(count) =>
                    updateViewConfig(activeView.id, { frozenColumnCount: count })
                  }
                  onRequestOpenSortPanel={() => setForcedToolbarPanel("sort")}
                  onRequestOpenFilterPanel={() => setForcedToolbarPanel("filter")}
                  onRequestOpenGroupPanel={() => setForcedToolbarPanel("group")}
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
            name:    base.name,
            color:   base.color ?? "#dc043b",
            icon:    base.icon  ?? "default",
            guide:   base.guide ?? null,
            starred: base.starred,
          }}
          onClose={() => setPanelOpen(false)}
          onRename={(name) => renameBase.mutate({ id: baseId, name })}
          onUpdateColor={(c) => updateApp.mutate({ id: baseId, color: c })}
          onUpdateIcon={(i) => updateApp.mutate({ id: baseId, icon: i })}
          onUpdateGuide={(g) => updateApp.mutate({ id: baseId, guide: g })}
          onToggleStar={() => toggleStar.mutate({ id: baseId, starred: !base.starred })}
        />
      )}
    </div>
  );
}
