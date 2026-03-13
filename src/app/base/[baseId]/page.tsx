"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { use, useRef, useState } from "react";
import {
  DEFAULT_VIEW_CONFIG,
  type ViewConfig,
} from "~/app/_components/ViewToolbar";
import type { ViewType } from "@prisma/client";
import { BasePageShell } from "~/app/base/_components/BasePageShell";
export default function BasePage({
  params,
}: {
  params: Promise<{ baseId: string }>;
}) {
  const { baseId } = use(params);
  const utils = api.useUtils();

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

  // -- Mutations --------------------------------------------------------------

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
    onSettled: invalidateBase,
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
  const bulkAddRows = api.table.bulkAddRows.useMutation({
    onSuccess: () => {
      void utils.table.getById.invalidate({ id: currentTableId ?? "" });
    },
    onSettled: () => setBulkAdding(false),
  });

  function handleBulkAddRows() {
    if (!currentTableId || bulkAdding) return;
    setBulkAdding(true);
    bulkAddRows.mutate({ tableId: currentTableId, count: 100_000 });
  }

  // -- UI state ---------------------------------------------------------------
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const tempViewToRealId = useRef<Record<string, string>>({});
  const [viewSidebarOpen, setViewSidebar] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [renamingTable, setRenamingTable] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [renamingView, setRenamingView] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [addingTable, setAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [addingView, setAddingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState<ViewType>("GRID");

  const [viewConfigs, setViewConfigs] = useState<Record<string, ViewConfig>>(
    {},
  );

  function getViewConfig(viewId: string): ViewConfig {
    return viewConfigs[viewId] ?? { ...DEFAULT_VIEW_CONFIG };
  }
  function updateViewConfig(viewId: string, patch: Partial<ViewConfig>) {
    setViewConfigs((prev) => ({
      ...prev,
      [viewId]: { ...getViewConfig(viewId), ...patch },
    }));
  }

  // -- Derived state ----------------------------------------------------------
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

  // -- Handlers ---------------------------------------------------------------
  function commitTableRename() {
    if (!renamingTable?.value.trim()) {
      setRenamingTable(null);
      return;
    }
    renameTable.mutate({
      tableId: renamingTable.id,
      name: renamingTable.value.trim(),
    });
    setRenamingTable(null);
  }
  function handleDeleteTable(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId)
      setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }
  function handleAddTable() {
    if (!newTableName.trim()) return;
    const name = newTableName.trim();
    setNewTableName("");
    setAddingTable(false);
    createTable.mutate(
      { baseId, name },
      {
        onSuccess: (t) => {
          setActiveTableId(t.id);
          setActiveViewId(null);
        },
      },
    );
  }
  function commitViewRename() {
    if (!renamingView?.value.trim()) {
      setRenamingView(null);
      return;
    }
    renameView.mutate({
      viewId: renamingView.id,
      name: renamingView.value.trim(),
    });
    setRenamingView(null);
  }
  function handleAddView() {
    if (!newViewName.trim() || !currentTableId) return;
    createView.mutate({
      tableId: currentTableId,
      name: newViewName.trim(),
      type: newViewType,
    });
    setNewViewName("");
    setAddingView(false);
  }

  // -- Loading / error --------------------------------------------------------
  if (isLoading || (!base && !error))
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        <div className="animate-pulse text-[13px] text-[#aaa]">Loading…</div>
      </div>
    );
  if (!base)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        <div className="text-center">
          <p className="mb-4 text-[13px] text-[#aaa]">Base not found</p>
          <Link href="/" className="text-[13px] text-[#0069ff] hover:underline">
            ← Home
          </Link>
        </div>
      </div>
    );

  return (
    <BasePageShell
      base={base}
      baseId={baseId}
      panelOpen={panelOpen}
      setPanelOpen={setPanelOpen}
      updateApp={updateApp}
      toggleStar={toggleStar}
      viewSidebarOpen={viewSidebarOpen}
      setViewSidebar={setViewSidebar}
      currentTableId={currentTableId}
      renamingTable={renamingTable}
      setRenamingTable={setRenamingTable}
      commitTableRename={commitTableRename}
      setActiveTableId={setActiveTableId}
      setActiveViewId={setActiveViewId}
      baseTablesLength={base.tables.length}
      handleDeleteTable={handleDeleteTable}
      addingTable={addingTable}
      setAddingTable={setAddingTable}
      newTableName={newTableName}
      setNewTableName={setNewTableName}
      handleAddTable={handleAddTable}
      activeView={activeView}
      currentCfg={currentCfg}
      currentTable={currentTable}
      updateViewConfig={updateViewConfig}
      bulkAdding={bulkAdding}
      handleBulkAddRows={handleBulkAddRows}
      views={views}
      renamingView={renamingView}
      setRenamingView={setRenamingView}
      getViewConfig={getViewConfig}
      deleteView={deleteView}
      commitViewRename={commitViewRename}
      addingView={addingView}
      setAddingView={setAddingView}
      newViewName={newViewName}
      setNewViewName={setNewViewName}
      handleAddView={handleAddView}
      newViewType={newViewType}
      setNewViewType={setNewViewType}
    />
  );
}
