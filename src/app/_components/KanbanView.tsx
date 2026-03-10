"use client";

// src/app/_components/KanbanView.tsx
import { useState } from "react";
import { api } from "~/trpc/react";
import type { Column } from "@prisma/client";
import { getCellValue, resolveGroupColumn, resolveNameColumn, type RowWithCells } from "./tableUtils";

// Column header / card border colours keyed on lowercased group value
const HEADER_COLORS: Record<string, string> = {
  "todo":        "border-slate-600/60 text-slate-300",
  "in progress": "border-blue-500/50 text-blue-300",
  "done":        "border-emerald-500/50 text-emerald-300",
};
const CARD_COLORS: Record<string, string> = {
  "todo":        "border-slate-700/50 hover:border-slate-500/60",
  "in progress": "border-blue-900/50 hover:border-blue-500/40",
  "done":        "border-emerald-900/50 hover:border-emerald-500/40",
};
const headerColor = (g: string) => HEADER_COLORS[g.toLowerCase()] ?? "border-purple-500/50 text-purple-300";
const cardColor   = (g: string) => CARD_COLORS[g.toLowerCase()]   ?? "border-purple-900/50 hover:border-purple-500/40";

export default function KanbanView({ tableId, groupByColumnId }: { tableId: string; groupByColumnId?: string | null }) {
  const utils = api.useUtils();
  const { data: table } = api.table.getById.useQuery({ id: tableId });

  // Optimistic cell update (same pattern as GridView)
  function optimisticCellUpdate(rowId: string, columnId: string, value: string | null) {
    utils.table.getById.setData({ id: tableId }, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row) =>
          row.id !== rowId ? row : {
            ...row,
            cells: row.cells.map((cell) =>
              cell.columnId !== columnId ? cell : { ...cell, value }
            ),
          }
        ),
      };
    });
  }

  const updateCell = api.table.updateCell.useMutation({
    onMutate: ({ rowId, columnId, value }) => optimisticCellUpdate(rowId, columnId, value),
    onError: () => void utils.table.getById.invalidate({ id: tableId }),
    onSettled: () => void utils.table.getById.invalidate({ id: tableId }),
  });

  const addRow = api.table.addRow.useMutation({
    onSuccess: () => void utils.table.getById.invalidate({ id: tableId }),
  });
  const deleteRow = api.table.deleteRow.useMutation({
    onMutate: ({ rowId }) => {
      utils.table.getById.setData({ id: tableId }, (prev) =>
        prev ? { ...prev, rows: prev.rows.filter((r) => r.id !== rowId) } : prev
      );
    },
    onSettled: () => void utils.table.getById.invalidate({ id: tableId }),
  });

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState("");

  if (!table) return <div className="p-6 text-white/30 text-sm animate-pulse">Loading...</div>;

  const groupCol = resolveGroupColumn(table.columns, groupByColumnId);
  const nameCol  = resolveNameColumn(table.columns);

  if (!groupCol || !nameCol) {
    return <div className="p-6 text-white/30 text-sm">Add at least one TEXT column to use Kanban view.</div>;
  }

  // Unique group values in row-order (empty cells = "No value")
  const groupValues = Array.from(
    new Set(table.rows.map((r) => getCellValue(r as RowWithCells, groupCol.id) || "No value"))
  );

  async function handleAddCard(groupValue: string) {
    if (!newCardName.trim()) return;
    const row = await addRow.mutateAsync({ tableId });
    await updateCell.mutateAsync({ rowId: row.id, columnId: nameCol!.id, value: newCardName.trim() });
    if (groupValue !== "No value") {
      await updateCell.mutateAsync({ rowId: row.id, columnId: groupCol!.id, value: groupValue });
    }
    setNewCardName("");
    setAddingTo(null);
  }

  function moveCard(rowId: string, toGroup: string) {
    updateCell.mutate({ rowId, columnId: groupCol!.id, value: toGroup === "No value" ? null : toGroup });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full p-6" style={{ fontFamily: "'DM Mono', monospace" }}>
      {groupValues.map((group) => {
        const groupRows = table.rows.filter(
          (r) => (getCellValue(r as RowWithCells, groupCol.id) || "No value") === group
        );

        return (
          <div key={group} className="flex-shrink-0 w-72 flex flex-col">
            {/* Column header */}
            <div className={`flex items-center justify-between mb-3 pb-2 border-b ${headerColor(group)}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest">{group}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/10 text-white/50">{groupRows.length}</span>
              </div>
              <button onClick={() => { setAddingTo(group); setNewCardName(""); }} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">+</button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {groupRows.map((row) => {
                const title = getCellValue(row as RowWithCells, nameCol.id) || "Untitled";
                const meta = table.columns
                  .filter((c) => c.id !== nameCol.id && c.id !== groupCol.id)
                  .map((c) => ({ col: c, value: getCellValue(row as RowWithCells, c.id) }))
                  .filter((m) => m.value);

                return (
                  <div key={row.id} className={`rounded-lg border bg-[#1a1a1e] p-3 group/card transition-all duration-150 ${cardColor(group)}`}>
                    <p className="text-sm font-medium mb-2 leading-snug">{title}</p>

                    {meta.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {meta.map(({ col, value }) => (
                          <span key={col.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            <span className="text-white/20">{col.name}: </span>{value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Move to other groups */}
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                      {groupValues.filter((g) => g !== group).map((g) => (
                        <button
                          key={g}
                          onClick={() => moveCard(row.id, g)}
                          className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-white/30 hover:text-white/60 hover:border-white/30 transition-all"
                        >
                          → {g}
                        </button>
                      ))}
                      <button
                        onClick={() => deleteRow.mutate({ rowId: row.id })}
                        className="ml-auto text-[9px] px-1.5 py-0.5 rounded text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/card:opacity-100"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add card inline */}
              {addingTo === group ? (
                <div className="rounded-lg border border-[#5b6af7]/40 bg-[#1e1e28] p-3">
                  <input
                    autoFocus
                    className="bg-transparent border-b border-[#5b6af7] px-1 py-0.5 w-full outline-none text-sm mb-2"
                    placeholder="Card name..."
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddCard(group);
                      if (e.key === "Escape") setAddingTo(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => void handleAddCard(group)} className="px-3 py-1 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-xs font-medium transition-colors">Add</button>
                    <button onClick={() => setAddingTo(null)} className="px-2 text-white/40 hover:text-white text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(group); setNewCardName(""); }}
                  className="text-left text-xs text-white/20 hover:text-white/50 transition-colors py-1"
                >
                  + Add card
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}