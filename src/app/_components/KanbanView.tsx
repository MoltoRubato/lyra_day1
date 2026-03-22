"use client";
// src/app/_components/KanbanView.tsx
import { useState } from "react";
import { api } from "~/trpc/react";
import { getCellValue, resolveGroupColumn, resolveNameColumn, type RowWithCells } from "./tableUtils";

// ─── Status colour map ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "todo":        { bg: "#f0f0ef", text: "#6b7280", border: "#e5e5e4", dot: "#9ca3af" },
  "in progress": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  "done":        { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
  "high":        { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", dot: "#f97316" },
  "medium":      { bg: "#fefce8", text: "#a16207", border: "#fde68a", dot: "#eab308" },
  "low":         { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
};

function getStatusStyle(group: string) {
  return STATUS_COLORS[group.toLowerCase()] ?? { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe", dot: "#8b5cf6" };
}

// ─── Main KanbanView ──────────────────────────────────────────────────────────

export default function KanbanView({ tableId, groupByColumnId }: {
  tableId: string;
  groupByColumnId?: string | null;
}) {
  const utils = api.useUtils();

  const { data: table, isLoading, error } = api.table.getById.useQuery({ id: tableId });

  // Shared helpers
  const patchCache = (updater: Parameters<typeof utils.table.getById.setData>[1]) =>
    utils.table.getById.setData({ id: tableId }, updater);
  const invalidate = () => void utils.table.getById.invalidate({ id: tableId });

  // updateCell: optimistic with rollback
  const updateCell = api.table.updateCell.useMutation({
    onMutate: ({ rowId, columnId, value }) =>
      patchCache((prev) => prev ? {
        ...prev,
        rows: prev.rows.map((r) => r.id !== rowId ? r : {
          ...r,
          cells: r.cells.map((c) => c.columnId !== columnId ? c : { ...c, value }),
        }),
      } : prev),
    onError:   invalidate,
    onSettled: invalidate,
  });

  // addRow: insert a placeholder card immediately in the target group
  const addRow = api.table.addRow.useMutation({
    onMutate: () =>
      patchCache((prev) => {
        if (!prev) return prev;
        const tempId = `temp-${Date.now()}`;
        return {
          ...prev,
          rows: [...prev.rows, {
            id: tempId, tableId, order: prev.rows.length,
            createdAt: new Date(), updatedAt: new Date(),
            cells: prev.columns.map((c) => ({
              id: `tc-${c.id}-${tempId}`, rowId: tempId, columnId: c.id,
              value: null, createdAt: new Date(), updatedAt: new Date(),
            })),
          }],
        };
      }),
    onSettled: invalidate,
  });

  // deleteRow: remove immediately
  const deleteRow = api.table.deleteRow.useMutation({
    onMutate: ({ rowId }) =>
      patchCache((prev) => prev ? { ...prev, rows: prev.rows.filter((r) => r.id !== rowId) } : prev),
    onError:   invalidate,
    onSettled: invalidate,
  });

  const [addingTo, setAddingTo]       = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState("");

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-sm text-red-400">Failed to load table. Please refresh.</p>
    </div>
  );
  if (!table) return null;

  const groupCol = resolveGroupColumn(table.columns, groupByColumnId);
  const nameCol  = resolveNameColumn(table.columns);

  if (!groupCol || !nameCol) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Add at least one text column to use Kanban view.</p>
      </div>
    );
  }

  const groupValues = Array.from(
    new Set(table.rows.map((r) => getCellValue(r as RowWithCells, groupCol.id) || "No value"))
  );

  // Add card: optimistic row + immediately set name and group via updateCell
  async function handleAddCard(groupValue: string) {
    if (!newCardName.trim()) return;
    const row = await addRow.mutateAsync({ tableId });
    // Set name and group in parallel
    await Promise.all([
      updateCell.mutateAsync({ rowId: row.id, columnId: nameCol!.id, value: newCardName.trim() }),
      groupValue !== "No value"
        ? updateCell.mutateAsync({ rowId: row.id, columnId: groupCol!.id, value: groupValue })
        : Promise.resolve(),
    ]);
    setNewCardName("");
    setAddingTo(null);
  }

  function moveCard(rowId: string, toGroup: string) {
    updateCell.mutate({ rowId, columnId: groupCol!.id, value: toGroup === "No value" ? null : toGroup });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-3 overflow-x-auto h-full p-4 bg-[#f0f0ef]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>

      {groupValues.map((group) => {
        const groupRows = table.rows.filter(
          (r) => (getCellValue(r as RowWithCells, groupCol.id) || "No value") === group
        );
        const style = getStatusStyle(group);

        return (
          <div key={group} className="flex-shrink-0 w-64 flex flex-col">

            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: style.dot }}/>
                <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">{group}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">{groupRows.length}</span>
              </div>
              <button
                onClick={() => { setAddingTo(group); setNewCardName(""); }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors text-sm">
                +
              </button>
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
                  <div key={row.id}
                    className="bg-white rounded-lg border border-[#e5e5e4] p-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150 group/card cursor-pointer">
                    <p className="text-sm font-medium text-gray-800 mb-2 leading-snug">{title}</p>

                    {meta.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {meta.map(({ col, value }) => (
                          <span key={col.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            <span className="text-gray-400">{col.name}: </span>{value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Move + delete actions — revealed on hover */}
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      {groupValues.filter((g) => g !== group).map((g) => {
                        const gs = getStatusStyle(g);
                        return (
                          <button key={g} onClick={() => moveCard(row.id, g)}
                            className="text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all hover:opacity-80"
                            style={{ borderColor: gs.border, color: gs.text, background: gs.bg }}>
                            → {g}
                          </button>
                        );
                      })}
                      <button onClick={() => deleteRow.mutate({ rowId: row.id })}
                        className="ml-auto text-[10px] px-1.5 py-0.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add card inline form */}
              {addingTo === group ? (
                <div className="bg-white rounded-lg border border-blue-300 p-3 shadow-sm ring-1 ring-blue-100">
                  <input autoFocus
                    className="bg-transparent border-b border-blue-300 px-0 py-0.5 w-full outline-none text-sm mb-2 text-gray-800 placeholder-gray-300"
                    placeholder="Card name…"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  void handleAddCard(group);
                      if (e.key === "Escape") setAddingTo(null);
                    }}/>
                  <div className="flex gap-2">
                    <button onClick={() => void handleAddCard(group)}
                      className="px-3 py-1 bg-[#166a5b] hover:bg-[#125a4d] text-white rounded text-[13px] font-medium transition-colors">
                      Add
                    </button>
                    <button onClick={() => setAddingTo(null)}
                      className="px-2 text-gray-400 hover:text-gray-600 text-[13px] transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(group); setNewCardName(""); }}
                  className="w-full text-left text-[13px] text-gray-400 hover:text-gray-600 hover:bg-white hover:border hover:border-[#e5e5e4] transition-all py-2 px-3 rounded-lg">
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
