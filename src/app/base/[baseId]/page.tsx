"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use } from "react";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";
import type { ViewType } from "@prisma/client";

const VIEW_ICONS: Record<string, string> = { GRID: "⊞", KANBAN: "⊟" };

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();

  const { data: base, isLoading } = api.base.getById.useQuery({ id: baseId });

  // ── Table mutations ──────────────────────────────────────────────────────
  const renameTable  = api.table.renameTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const deleteTable  = api.table.deleteTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const createTable  = api.table.create.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });

  // ── View mutations ────────────────────────────────────────────────────────
  const createView   = api.view.create.useMutation({ onSuccess: (v) => { void utils.view.getByTableId.invalidate({ tableId: v.tableId }); setActiveViewId(v.id); } });
  const renameView   = api.view.rename.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });
  const deleteView   = api.view.delete.useMutation({ onSuccess: () => void utils.view.getByTableId.invalidate({ tableId: activeTableId ?? "" }) });
  const updateConfig = api.view.updateConfig.useMutation({ onSuccess: (v) => void utils.view.getByTableId.invalidate({ tableId: v.tableId }) });

  // ── UI state ──────────────────────────────────────────────────────────────
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

  const { data: views = [] } = api.view.getByTableId.useQuery(
    { tableId: currentTableId ?? "" },
    { enabled: !!currentTableId }
  );
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0] ?? null;

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

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  );
  if (!base) return (
    <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <div className="text-center">
        <p className="text-gray-400 mb-4">Base not found</p>
        <Link href="/" className="text-[#166a5b] text-sm hover:underline">← Home</Link>
      </div>
    </div>
  );

  // Base icon colour derived from name
  const baseColor = "#166a5b";

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>

      {/* ── Row 1: Brand bar ─────────────────────────────────────────────────── */}
      <header className="h-11 bg-white border-b border-[#e5e5e4] flex items-center px-4 gap-4 flex-shrink-0">
        {/* Left: base icon + name */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: baseColor }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="0.5" fill="white" opacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="0.5" fill="white" opacity="0.9"/>
                <rect x="1" y="8" width="5" height="5" rx="0.5" fill="white" opacity="0.9"/>
                <rect x="8" y="8" width="5" height="5" rx="0.5" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-800">{base.name}</span>
          </Link>
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Center: "Data" tab (our only tab) */}
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="relative flex items-center h-11">
            <span className="text-sm font-medium text-[#166a5b] px-1">Data</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#166a5b] rounded-full" />
          </div>
        </div>

        {/* Right: back to home */}
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Home</Link>
      </header>

      {/* ── Row 2: Table tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center bg-[#f2faf7] border-b border-[#c8e6de] px-2 flex-shrink-0 h-9">
        <div className="flex items-center flex-1 overflow-hidden">
          {base.tables.map((table) => {
            const isActive   = currentTableId === table.id;
            const isRenaming = renamingTable?.id === table.id;
            return (
              <div key={table.id}
                className={`group/tab relative flex items-center flex-shrink-0 h-9 transition-colors ${
                  isActive
                    ? "bg-white border border-b-white border-[#c8e6de] rounded-t text-gray-800 font-medium -mb-px z-10"
                    : "text-[#166a5b] hover:bg-[#e8f5f0]"
                }`}>
                {isRenaming ? (
                  <input autoFocus
                    className="mx-2 my-1 bg-white border border-blue-400 rounded px-2 py-0.5 text-xs outline-none w-28"
                    value={renamingTable.value}
                    onChange={(e) => setRenamingTable({ ...renamingTable, value: e.target.value })}
                    onBlur={commitTableRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitTableRename(); if (e.key === "Escape") setRenamingTable(null); }} />
                ) : (
                  <button
                    onClick={() => { setActiveTableId(table.id); setActiveViewId(null); }}
                    onDoubleClick={() => setRenamingTable({ id: table.id, value: table.name })}
                    className="px-3 h-full text-xs transition-colors"
                    title="Double-click to rename">
                    {table.name}
                  </button>
                )}
                {!isRenaming && base.tables.length > 1 && (
                  <button onClick={() => handleDeleteTable(table.id)}
                    className="opacity-0 group-hover/tab:opacity-100 mr-1 text-gray-400 hover:text-red-500 transition-all text-[10px] p-0.5 rounded">✕</button>
                )}
              </div>
            );
          })}

          {addingTable ? (
            <div className="flex items-center gap-1 ml-1 px-1">
              <input autoFocus
                className="bg-white border border-blue-400 rounded px-2 py-0.5 text-xs outline-none w-28"
                placeholder="Table name…" value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onBlur={() => { if (!newTableName.trim()) setAddingTable(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableName(""); } }} />
              <button onClick={handleAddTable} className="px-2 py-0.5 bg-[#166a5b] hover:bg-[#125a4d] text-white rounded text-[10px] transition-colors">Add</button>
              <button onClick={() => { setAddingTable(false); setNewTableName(""); }} className="text-gray-400 text-[10px] px-1">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingTable(true)}
              className="ml-1 flex items-center gap-1 px-2 py-1 text-[#166a5b] hover:bg-[#e8f5f0] rounded text-xs transition-colors">
              + Add or import
            </button>
          )}
        </div>
      </div>

      {/* ── Body: view sidebar + content ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: View sidebar ─────────────────────────────────────────────── */}
        <aside className={`flex-shrink-0 bg-white border-r border-[#e5e5e4] flex flex-col transition-all duration-200 ${viewSidebarOpen ? "w-[248px]" : "w-9"} overflow-hidden`}>

          {/* Sidebar top toolbar */}
          <div className={`flex items-center border-b border-[#e5e5e4] h-9 px-2 flex-shrink-0 ${viewSidebarOpen ? "justify-between" : "justify-center"}`}>
            <button onClick={() => setViewSidebar((p) => !p)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title={viewSidebarOpen ? "Collapse" : "Expand"}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="7" y="2" width="7" height="4" rx="1" fill="currentColor" opacity="0.3"/>
                <rect x="7" y="7" width="7" height="4" rx="1" fill="currentColor" opacity="0.3"/>
              </svg>
            </button>
            {viewSidebarOpen && (
              <button onClick={() => { setAddingView(true); setNewViewName(""); }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#166a5b] font-medium hover:bg-[#f0faf7] rounded transition-colors">
                + Create new…
              </button>
            )}
          </div>

          {viewSidebarOpen && (
            <>
              {/* Find a view */}
              <div className="px-3 py-2 border-b border-[#e5e5e4]">
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded border border-gray-200 text-xs text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 8L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Find a view
                </div>
              </div>

              {/* View list */}
              <div className="flex-1 overflow-hidden py-1">
                {views.map((view) => {
                  const isActive   = activeView?.id === view.id;
                  const isRenaming = renamingView?.id === view.id;
                  return (
                    <div key={view.id}
                      className={`group/view flex items-center gap-2 mx-1 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        isActive ? "bg-[#e8f5f0] text-[#166a5b]" : "text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={() => setActiveViewId(view.id)}>
                      <span className={`text-xs flex-shrink-0 ${isActive ? "text-[#166a5b]" : "text-gray-400"}`}>
                        {VIEW_ICONS[view.type] ?? "⊞"}
                      </span>
                      {isRenaming ? (
                        <input autoFocus
                          className="flex-1 bg-white border border-blue-400 rounded px-1 py-0.5 text-xs outline-none min-w-0"
                          value={renamingView.value}
                          onChange={(e) => setRenamingView({ ...renamingView, value: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitViewRename}
                          onKeyDown={(e) => { if (e.key === "Enter") commitViewRename(); if (e.key === "Escape") setRenamingView(null); }} />
                      ) : (
                        <span className={`flex-1 text-xs truncate font-medium ${isActive ? "text-[#166a5b]" : "text-gray-700"}`}
                          onDoubleClick={(e) => { e.stopPropagation(); setRenamingView({ id: view.id, value: view.name }); }}>
                          {view.name}
                        </span>
                      )}
                      {!isRenaming && views.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteView.mutate({ viewId: view.id }); }}
                          className="opacity-0 group-hover/view:opacity-100 text-gray-300 hover:text-red-400 text-[10px] flex-shrink-0 transition-all">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add view form */}
              {addingView && (
                <div className="border-t border-[#e5e5e4] p-3 space-y-2">
                  <input autoFocus
                    className="w-full bg-white border border-blue-400 rounded px-2 py-1.5 text-xs outline-none"
                    placeholder="View name…" value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddView(); if (e.key === "Escape") setAddingView(false); }} />
                  <div className="flex gap-1">
                    {(["GRID", "KANBAN"] as ViewType[]).map((t) => (
                      <button key={t} onClick={() => setNewViewType(t)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${
                          newViewType === t
                            ? "bg-[#e8f5f0] border-[#c8e6de] text-[#166a5b]"
                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>
                        {VIEW_ICONS[t]} {t === "GRID" ? "Grid" : "Kanban"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleAddView}
                      className="flex-1 px-2 py-1.5 bg-[#166a5b] hover:bg-[#125a4d] text-white rounded text-[10px] font-medium transition-colors">
                      Add view
                    </button>
                    <button onClick={() => setAddingView(false)}
                      className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-[10px] border border-gray-200 rounded transition-colors">✕</button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        {/* ── Right: Toolbar + content ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar row */}
          <div className="h-9 border-b border-[#e5e5e4] flex items-center px-3 gap-2 flex-shrink-0 bg-white">
            {/* Left: Active view label */}
            {activeView && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <span className="text-gray-400">{VIEW_ICONS[activeView.type]}</span>
                {activeView.name}
                <svg className="w-3 h-3 text-gray-400 ml-0.5" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Right toolbar */}
            <div className="flex items-center gap-0.5 ml-auto">
              {groupableCols.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="1" width="11" height="2.5" rx="0.5" fill="#6b7280"/>
                      <rect x="1" y="5.25" width="8" height="2.5" rx="0.5" fill="#6b7280"/>
                      <rect x="1" y="9.5" width="5" height="2.5" rx="0.5" fill="#6b7280"/>
                    </svg>
                    <select
                      value={activeView?.groupByColumnId ?? ""}
                      onChange={(e) => handleGroupByChange(e.target.value || null)}
                      className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer">
                      <option value="">{activeView?.type === "KANBAN" ? "Group: Auto" : "Group"}</option>
                      {groupableCols.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                    </select>
                  </div>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                </>
              )}
              {[
                { label: "Hide fields", icon: "👁" },
                { label: "Filter",      icon: "⊟" },
                { label: "Sort",        icon: "↑↓" },
              ].map((btn) => (
                <button key={btn.label}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 transition-colors">
                  <span className="text-[11px]">{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View content */}
          <div className="flex-1 overflow-hidden">
            {!currentTableId ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                No tables yet — press "+ Add or import" to create one.
              </div>
            ) : !activeView ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400 animate-pulse">
                Loading views…
              </div>
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