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
    onSuccess: () => { void utils.table.getById.invalidate({ id: currentTableId ?? "" }); },
    onSettled: () => setBulkAdding(false),
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
    return viewConfigs[viewId] ?? { ...DEFAULT_VIEW_CONFIG };
  }
  function updateViewConfig(viewId: string, patch: Partial<ViewConfig>) {
    setViewConfigs((prev) => ({
      ...prev,
      [viewId]: { ...getViewConfig(viewId), ...patch },
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
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-[13px] text-[#aaa] animate-pulse">Loading…</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-white flex items-center justify-center"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="text-center">
        <p className="text-[#aaa] mb-4 text-[13px]">Base not found</p>
        <Link href="/" className="text-[#0069ff] text-[13px] hover:underline">← Home</Link>
      </div>
    </div>
  );

  const baseColor = base.color ?? "#f82b60";
  const baseIcon  = base.icon  ?? "default";

  return (
    <div className="h-screen flex overflow-hidden"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", fontSize: "13px" }}>

      <LeftSidebar/>

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top nav bar ──────────────────────────────────────────────────── */}
        <header className="h-[56px] bg-white border-b border-[#e0e0e0] flex items-center px-3 gap-0 flex-shrink-0 relative">

          {/* Left: base name button */}
          <button onClick={() => setPanelOpen((p) => !p)}
            className="flex items-center gap-1.5 group rounded hover:bg-[#f0f0ef] px-2 py-1 transition-colors mr-2 flex-shrink-0">
            <BaseIconSVG iconId={baseIcon} color={baseColor} size={22}/>
            <span className="text-[13px] font-semibold text-[#172b4d] max-w-[160px] truncate">{base.name}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#999] group-hover:text-[#555] transition-colors flex-shrink-0">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Center: nav tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
            <div className="relative flex items-center h-full">
              <span className="text-[13px] font-medium text-[#172b4d] px-3 cursor-default">Data</span>
              <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#166a5b] rounded-full"/>
            </div>
            {["Automations","Interfaces","Forms"].map((t) => (
              <button key={t} className="text-[13px] text-[#555] hover:text-[#172b4d] px-3 h-full transition-colors">{t}</button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <SyncIndicator/>
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[#4d5158] hover:bg-[#f0f0ef] transition-colors"
              title="Revision history"
            >
              <AirtableAssetIcon asset={334} alt="Base history" size={16} />
            </button>
            <button className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-[13px] text-[#1d1f25] border border-[#d8dbe1] rounded-full hover:bg-[#f5f5f4] transition-colors">
              <AirtableAssetIcon asset={452} alt="" size={16} />
              Upgrade
            </button>
            <button className="h-7 inline-flex items-center justify-center gap-1.5 px-2 text-[13px] text-[#1d1f25] border border-[#d8dbe1] rounded-[8px] hover:bg-[#f5f5f4] transition-colors">
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <AirtableAssetIcon asset={87} alt="" size={16} />
                <span className="absolute -bottom-[1px] -right-[1px] border-l-[4px] border-l-transparent border-t-[4px] border-t-[#1d1f25]" />
              </span>
              Launch
            </button>
            <button className="h-7 w-7 inline-flex items-center justify-center rounded-[8px] border border-[#d8dbe1] hover:bg-[#f5f5f4] transition-colors">
              <AirtableAssetIcon asset={190} alt="Copy link" size={16} />
            </button>
            <button
              className="h-7 px-3 text-[#1d1f25] text-[13px] font-medium rounded-[8px] transition-colors hover:brightness-95"
              style={{ background: "#ffba05" }}
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
                  recordLabel={getRecordLabel(currentTableId) ?? "Record"}
                  onSortsChange={(sorts) => updateViewConfig(activeView.id, { sorts })}
                  onFiltersChange={(filters) => updateViewConfig(activeView.id, { filters })}
                  onGroupsChange={(groups) => updateViewConfig(activeView.id, { groups })}
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
            color:   base.color ?? "#f82b60",
            icon:    base.icon  ?? "default",
            guide:   base.guide ?? null,
            starred: base.starred,
          }}
          onClose={() => setPanelOpen(false)}
          onUpdateColor={(c) => updateApp.mutate({ id: baseId, color: c })}
          onUpdateIcon={(i) => updateApp.mutate({ id: baseId, icon: i })}
          onUpdateGuide={(g) => updateApp.mutate({ id: baseId, guide: g })}
          onToggleStar={() => toggleStar.mutate({ id: baseId, starred: !base.starred })}
        />
      )}
    </div>
  );
}
