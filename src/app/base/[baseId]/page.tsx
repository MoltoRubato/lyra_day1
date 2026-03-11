"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use } from "react";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import type { ViewType } from "@prisma/client";

const VIEW_ICONS: Record<string, string> = { GRID: "⊞", KANBAN: "⊟" };
const VIEW_LABELS: Record<string, string> = { GRID: "Grid", KANBAN: "Kanban" };

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();

  const { data: base, isLoading } = api.base.getById.useQuery({ id: baseId });

  // ── Table mutations ────────────────────────────────────────────────────────
  const renameTable = api.table.renameTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const deleteTable = api.table.deleteTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const createTable = api.table.create.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });

  // ── View mutations ─────────────────────────────────────────────────────────
  const createView  = api.view.create.useMutation({ onSuccess: (v) => { void utils.view.getByTableId.invalidate({ tableId: v.tableId }); setActiveViewId(v.id); } });
  const renameView  = api.view.rename.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });
  const deleteView  = api.view.delete.useMutation({ onSuccess: () => void utils.view.getByTableId.invalidate({ tableId: activeTableId ?? "" }) });
  const updateConfig = api.view.updateConfig.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });

  // ── UI state — all hooks before early returns ──────────────────────────────
  const [activeTableId, setActiveTableId]   = useState<string | null>(null);
  const [activeViewId, setActiveViewId]     = useState<string | null>(null);
  const [viewSidebarOpen, setViewSidebar]   = useState(true);
  const [renamingTable, setRenamingTable]   = useState<{ id: string; value: string } | null>(null);
  const [renamingView, setRenamingView]     = useState<{ id: string; value: string } | null>(null);
  const [addingTable, setAddingTable]       = useState(false);
  const [newTableName, setNewTableName]     = useState("");
  const [addingView, setAddingView]         = useState(false);
  const [newViewName, setNewViewName]       = useState("");
  const [newViewType, setNewViewType]       = useState<ViewType>("GRID");

  const currentTableId = activeTableId ?? base?.tables[0]?.id ?? null;

  // Fetch views for current table
  const { data: views = [] } = api.view.getByTableId.useQuery(
    { tableId: currentTableId ?? "" },
    { enabled: !!currentTableId }
  );

  // Resolve active view — auto-select first view when table or views change
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0] ?? null;

  // Fetch table columns for the group-by picker
  const { data: currentTable } = api.table.getById.useQuery(
    { id: currentTableId ?? "" },
    { enabled: !!currentTableId }
  );
  const groupableCols = (currentTable?.columns ?? []).filter((c) =>
    ["TEXT", "SINGLE_SELECT"].includes(c.type)
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function commitTableRename() {
    if (!renamingTable?.value.trim()) { setRenamingTable(null); return; }
    renameTable.mutate({ tableId: renamingTable.id, name: renamingTable.value.trim() });
    setRenamingTable(null);
  }

  function handleDeleteTable(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId) setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }

  function handleAddTable() {
    if (!newTableName.trim()) return;
    createTable.mutate({ baseId, name: newTableName.trim() }, {
      onSuccess: (t) => { setActiveTableId(t.id); setActiveViewId(null); },
    });
    setNewTableName(""); setAddingTable(false);
  }

  function commitViewRename() {
    if (!renamingView?.value.trim()) { setRenamingView(null); return; }
    renameView.mutate({ viewId: renamingView.id, name: renamingView.value.trim() });
    setRenamingView(null);
  }

  function handleAddView() {
    if (!newViewName.trim() || !currentTableId) return;
    createView.mutate({ tableId: currentTableId, name: newViewName.trim(), type: newViewType });
    setNewViewName(""); setAddingView(false);
  }

  function handleGroupByChange(colId: string | null) {
    if (!activeView) return;
    updateConfig.mutate({ viewId: activeView.id, groupByColumnId: colId });
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center" style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="text-white/30 text-sm animate-pulse">Loading...</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center" style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="text-center">
        <p className="text-white/40 mb-4">Base not found</p>
        <Link href="/" className="text-[#5b6af7] text-sm hover:underline">← Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white flex flex-col" style={{ fontFamily: "'DM Mono', monospace" }}>

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/10 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="text-white/30 hover:text-white/70 transition-colors text-sm">← Home</Link>
        <span className="text-white/20">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#5b6af7] to-[#9b6af7] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {base.name[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold">{base.name}</span>
        </div>
      </nav>

      {/* ── Table tabs ───────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 flex items-center flex-shrink-0">
        {base.tables.map((table) => {
          const isActive   = currentTableId === table.id;
          const isRenaming = renamingTable?.id === table.id;
          return (
            <div key={table.id} className={`group/tab relative flex items-center border-b-2 transition-colors ${isActive ? "border-[#5b6af7]" : "border-transparent"}`}>
              {isRenaming ? (
                <input autoFocus className="mx-2 my-2 bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-0.5 text-sm outline-none w-32"
                  value={renamingTable.value} onChange={(e) => setRenamingTable({ ...renamingTable, value: e.target.value })}
                  onBlur={commitTableRename} onKeyDown={(e) => { if (e.key === "Enter") commitTableRename(); if (e.key === "Escape") setRenamingTable(null); }} />
              ) : (
                <button
                  onClick={() => { setActiveTableId(table.id); setActiveViewId(null); }}
                  onDoubleClick={() => setRenamingTable({ id: table.id, value: table.name })}
                  className={`px-3 py-3 text-sm transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`}
                  title="Double-click to rename">
                  {table.name}
                </button>
              )}
              {!isRenaming && base.tables.length > 1 && (
                <button onClick={() => handleDeleteTable(table.id)}
                  className="opacity-0 group-hover/tab:opacity-100 mr-1 text-white/20 hover:text-red-400 transition-all text-xs p-0.5 rounded">✕</button>
              )}
            </div>
          );
        })}
        {addingTable ? (
          <div className="flex items-center gap-1 ml-1 py-2">
            <input autoFocus className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-0.5 text-sm outline-none w-28"
              placeholder="Table name…" value={newTableName} onChange={(e) => setNewTableName(e.target.value)}
              onBlur={() => { if (!newTableName.trim()) setAddingTable(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableName(""); } }} />
            <button onClick={handleAddTable} className="px-2 py-0.5 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-xs transition-colors">Add</button>
            <button onClick={() => { setAddingTable(false); setNewTableName(""); }} className="text-white/30 text-xs px-1">✕</button>
          </div>
        ) : (
          <button onClick={() => setAddingTable(true)} className="ml-1 px-3 py-3 text-white/30 hover:text-[#5b6af7] transition-colors text-lg leading-none" title="Add table">+</button>
        )}
      </div>

      {/* ── Body: view sidebar + content ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* View sidebar */}
        <aside className={`flex-shrink-0 border-r border-white/10 flex flex-col transition-all duration-200 ${viewSidebarOpen ? "w-48" : "w-10"} overflow-hidden`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/10">
            {viewSidebarOpen && <span className="text-[9px] uppercase tracking-widest text-white/25 px-1">Views</span>}
            <button onClick={() => setViewSidebar((p) => !p)}
              className="ml-auto text-white/25 hover:text-white/60 transition-colors text-xs p-1 rounded hover:bg-white/5"
              title={viewSidebarOpen ? "Collapse" : "Expand"}>
              {viewSidebarOpen ? "◂" : "▸"}
            </button>
          </div>

          {/* View list */}
          <div className="flex-1 overflow-y-auto py-1">
            {views.map((view) => {
              const isActive   = activeView?.id === view.id;
              const isRenaming = renamingView?.id === view.id;
              return (
                <div key={view.id} className={`group/view flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded transition-colors cursor-pointer ${isActive ? "bg-[#5b6af7]/20 text-[#5b6af7]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                  onClick={() => setActiveViewId(view.id)}>
                  <span className="flex-shrink-0 text-xs">{VIEW_ICONS[view.type] ?? "⊞"}</span>
                  {viewSidebarOpen && (
                    isRenaming ? (
                      <input autoFocus className="flex-1 bg-transparent border-b border-[#5b6af7] text-xs outline-none min-w-0"
                        value={renamingView.value}
                        onChange={(e) => setRenamingView({ ...renamingView, value: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitViewRename}
                        onKeyDown={(e) => { if (e.key === "Enter") commitViewRename(); if (e.key === "Escape") setRenamingView(null); }} />
                    ) : (
                      <span className="flex-1 text-xs truncate" onDoubleClick={(e) => { e.stopPropagation(); setRenamingView({ id: view.id, value: view.name }); }}>
                        {view.name}
                      </span>
                    )
                  )}
                  {viewSidebarOpen && !isRenaming && views.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteView.mutate({ viewId: view.id }); }}
                      className="opacity-0 group-hover/view:opacity-100 text-white/20 hover:text-red-400 text-[10px] transition-all flex-shrink-0">✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add view */}
          {viewSidebarOpen && (
            <div className="border-t border-white/10 p-2">
              {addingView ? (
                <div className="space-y-1.5">
                  <input autoFocus className="w-full bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-1 text-xs outline-none"
                    placeholder="View name…" value={newViewName} onChange={(e) => setNewViewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddView(); if (e.key === "Escape") setAddingView(false); }} />
                  <div className="flex gap-1">
                    {(["GRID", "KANBAN"] as ViewType[]).map((t) => (
                      <button key={t} onClick={() => setNewViewType(t)}
                        className={`flex-1 flex items-center justify-center gap-1 px-1 py-1 rounded text-[10px] transition-colors ${newViewType === t ? "bg-[#5b6af7] text-white" : "bg-white/5 text-white/40 hover:text-white/70"}`}>
                        {VIEW_ICONS[t]} {VIEW_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleAddView} className="flex-1 px-2 py-1 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-[10px] transition-colors">Add</button>
                    <button onClick={() => setAddingView(false)} className="px-2 py-1 text-white/30 hover:text-white text-[10px]">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingView(true)}
                  className="w-full flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors px-1 py-1 rounded hover:bg-white/5">
                  + Add view
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main content + toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          {activeView && (
            <div className="border-b border-white/10 px-4 py-2 flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-white/30">{VIEW_ICONS[activeView.type]} {activeView.name}</span>
              <div className="w-px h-4 bg-white/10" />
              {groupableCols.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">Group by</span>
                  <select
                    value={activeView.groupByColumnId ?? ""}
                    onChange={(e) => handleGroupByChange(e.target.value || null)}
                    className="bg-[#1a1a1e] border border-white/15 rounded px-2 py-1 text-xs text-white/60 outline-none hover:border-white/30 focus:border-[#5b6af7] transition-colors cursor-pointer">
                    <option value="">{activeView.type === "KANBAN" ? "Auto (Status)" : "None"}</option>
                    {groupableCols.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* View content */}
          <div className="flex-1 overflow-auto">
            {!currentTableId ? (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">No tables yet. Hit + to add one.</div>
            ) : !activeView ? (
              <div className="flex items-center justify-center h-full text-white/30 text-sm animate-pulse">Loading views…</div>
            ) : activeView.type === "GRID" ? (
              <GridView key={activeView.id} tableId={currentTableId} groupByColumnId={activeView.groupByColumnId} />
            ) : (
              <KanbanView key={activeView.id} tableId={currentTableId} groupByColumnId={activeView.groupByColumnId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}