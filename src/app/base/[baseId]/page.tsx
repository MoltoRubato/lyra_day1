"use client";
// src/app/base/[baseId]/page.tsx
import { api } from "~/trpc/react";
import Link from "next/link";
import { useState, use } from "react";
import GridView from "~/app/_components/GridView";
import KanbanView from "~/app/_components/KanbanView";

type View = "grid" | "kanban";

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const utils = api.useUtils();
  const { data: base, isLoading } = api.base.getById.useQuery({ id: baseId });

  const renameTable = api.table.renameTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const deleteTable = api.table.deleteTable.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });
  const createTable = api.table.create.useMutation({ onSuccess: () => void utils.base.getById.invalidate({ id: baseId }) });

  const [activeTableId, setActiveTableId]   = useState<string | null>(null);
  const [view, setView]                     = useState<View>("grid");
  const [groupByColumnId, setGroupByColumnId] = useState<string | null>(null);
  const [renamingTable, setRenamingTable]   = useState<{ id: string; value: string } | null>(null);
  const [addingTable, setAddingTable]       = useState(false);
  const [newTableName, setNewTableName]     = useState("");

  // All hooks must be called before any early return (Rules of Hooks).
  // We read columns from the TanStack cache synchronously — no extra query fires.
  const currentTableId = activeTableId ?? base?.tables[0]?.id ?? null;
  const cachedTable = utils.table.getById.getData({ id: currentTableId ?? "" });
  const groupableCols = (cachedTable?.columns ?? []).filter((c) =>
    ["TEXT", "SINGLE_SELECT"].includes(c.type)
  );

  function commitRename() {
    if (!renamingTable?.value.trim()) { setRenamingTable(null); return; }
    renameTable.mutate({ tableId: renamingTable.id, name: renamingTable.value.trim() });
    setRenamingTable(null);
  }

  function handleDelete(tableId: string) {
    if ((activeTableId ?? base?.tables[0]?.id) === tableId) setActiveTableId(null);
    deleteTable.mutate({ tableId });
  }

  function handleAddTable() {
    if (!newTableName.trim()) return;
    createTable.mutate({ baseId, name: newTableName.trim() }, { onSuccess: (t) => setActiveTableId(t.id) });
    setNewTableName(""); setAddingTable(false);
  }

  if (isLoading) return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center" style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="text-white/30 text-sm animate-pulse">Loading...</div>
    </div>
  );

  if (!base) return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center" style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="text-center">
        <p className="text-white/40 mb-4">Base not found</p>
        <Link href="/" className="text-[#5b6af7] text-sm hover:underline">← Back home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white flex flex-col" style={{ fontFamily: "'DM Mono', monospace" }}>
      {/* Top nav */}
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

      {/* Table tabs + toolbar */}
      <div className="border-b border-white/10 px-6 flex items-center justify-between flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center">
          {base.tables.map((table) => {
            const isActive   = currentTableId === table.id;
            const isRenaming = renamingTable?.id === table.id;
            return (
              <div key={table.id} className={`group/tab relative flex items-center border-b-2 transition-colors ${isActive ? "border-[#5b6af7]" : "border-transparent"}`}>
                {isRenaming ? (
                  <input autoFocus className="mx-2 my-2 bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-0.5 text-sm outline-none w-32"
                    value={renamingTable.value} onChange={(e) => setRenamingTable({ ...renamingTable, value: e.target.value })}
                    onBlur={commitRename} onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingTable(null); }} />
                ) : (
                  <button onClick={() => { setActiveTableId(table.id); setGroupByColumnId(null); }}
                    onDoubleClick={() => setRenamingTable({ id: table.id, value: table.name })}
                    className={`px-3 py-3 text-sm transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`}
                    title="Double-click to rename">
                    {table.name}
                  </button>
                )}
                {!isRenaming && base.tables.length > 1 && (
                  <button onClick={() => handleDelete(table.id)}
                    className="opacity-0 group-hover/tab:opacity-100 mr-1 text-white/20 hover:text-red-400 transition-all text-xs p-0.5 rounded">✕</button>
                )}
              </div>
            );
          })}
          {addingTable ? (
            <div className="flex items-center gap-1 ml-1 py-2">
              <input autoFocus className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-0.5 text-sm outline-none w-28"
                placeholder="Table name..." value={newTableName} onChange={(e) => setNewTableName(e.target.value)}
                onBlur={() => { if (!newTableName.trim()) setAddingTable(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableName(""); } }} />
              <button onClick={handleAddTable} className="px-2 py-0.5 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-xs transition-colors">Add</button>
              <button onClick={() => { setAddingTable(false); setNewTableName(""); }} className="text-white/30 hover:text-white text-xs px-1">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingTable(true)} className="ml-1 px-3 py-3 text-white/30 hover:text-[#5b6af7] transition-colors text-lg leading-none" title="Add table">+</button>
          )}
        </div>

        {/* Right toolbar */}
        <div className="flex items-center gap-3">
          {groupableCols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">Group by</span>
              <select value={groupByColumnId ?? ""} onChange={(e) => setGroupByColumnId(e.target.value || null)}
                className="bg-[#1a1a1e] border border-white/15 rounded px-2 py-1 text-xs text-white/60 outline-none hover:border-white/30 focus:border-[#5b6af7] transition-colors cursor-pointer">
                <option value="">{view === "kanban" ? "Auto (Status)" : "None"}</option>
                {groupableCols.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {(["grid", "kanban"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${view === v ? "bg-[#5b6af7] text-white" : "text-white/40 hover:text-white/70"}`}>
                {v === "grid" ? "⊞" : "⊟"} {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentTableId ? (
          view === "grid"
            ? <GridView tableId={currentTableId} groupByColumnId={groupByColumnId} />
            : <KanbanView tableId={currentTableId} groupByColumnId={groupByColumnId} />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">No tables yet. Hit + to add one.</div>
        )}
      </div>
    </div>
  );
}