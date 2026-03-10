"use client";
// src/app/_components/GridView.tsx
import { useState, useRef, useCallback, Fragment } from "react";
import { api } from "~/trpc/react";
import { getCellValue, sortRows, groupRows, formatCellValue, inputTypeForField, FIELD_TYPES, FIELD_TYPE_GROUPS, type RowWithCells } from "./tableUtils";

type SortState   = { columnId: string; dir: "asc" | "desc" } | null;
type EditingCell = { rowId: string; columnId: string; value: string };

function FieldTypePicker({ current, onSelect }: { current: string; onSelect: (t: string) => void }) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-[#1a1a1e] border border-white/15 rounded-lg shadow-2xl p-1 w-52 max-h-72 overflow-y-auto">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] uppercase tracking-widest text-white/25 px-2 pt-2 pb-1">{group.label}</p>
          {group.types.map((t) => {
            const f = FIELD_TYPES[t]!;
            return (
              <button key={t} onClick={() => onSelect(t)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${current === t ? "bg-[#5b6af7]/20 text-[#5b6af7]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <span className="w-4 text-center">{f.icon}</span> {f.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function GridView({ tableId, groupByColumnId }: { tableId: string; groupByColumnId?: string | null }) {
  const utils = api.useUtils();
  const { data: table } = api.table.getById.useQuery({ id: tableId });

  const patchCache = useCallback((updater: Parameters<typeof utils.table.getById.setData>[1]) => {
    utils.table.getById.setData({ id: tableId }, updater);
  }, [utils, tableId]);
  const invalidate = useCallback(() => void utils.table.getById.invalidate({ id: tableId }), [utils, tableId]);

  const updateCell     = api.table.updateCell.useMutation({
    onMutate: ({ rowId, columnId, value }) => patchCache((prev) => prev ? { ...prev, rows: prev.rows.map((r) => r.id !== rowId ? r : { ...r, cells: r.cells.map((c) => c.columnId !== columnId ? c : { ...c, value }) }) } : prev),
    onError: invalidate, onSettled: invalidate,
  });
  const addRow         = api.table.addRow.useMutation({
    onMutate: () => patchCache((prev) => {
      if (!prev) return prev;
      const tempId = `temp-${Date.now()}`;
      return { ...prev, rows: [...prev.rows, { id: tempId, tableId, order: prev.rows.length, createdAt: new Date(), updatedAt: new Date(), cells: prev.columns.map((c) => ({ id: `tc-${c.id}`, rowId: tempId, columnId: c.id, value: null, createdAt: new Date(), updatedAt: new Date() })) }] };
    }),
    onSettled: invalidate,
  });
  const deleteRow      = api.table.deleteRow.useMutation({ onMutate: ({ rowId }) => patchCache((p) => p ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p), onSettled: invalidate });
  const addColumn      = api.table.addColumn.useMutation({
    onMutate: ({ name, type }) => patchCache((prev) => {
      if (!prev) return prev;
      const tempId = `temp-col-${Date.now()}`;
      return { ...prev, columns: [...prev.columns, { id: tempId, name, type: type ?? "TEXT", order: prev.columns.length, width: 180, tableId, createdAt: new Date(), updatedAt: new Date() }], rows: prev.rows.map((r) => ({ ...r, cells: [...r.cells, { id: `tc-${tempId}-${r.id}`, rowId: r.id, columnId: tempId, value: null, createdAt: new Date(), updatedAt: new Date() }] })) };
    }),
    onSettled: invalidate,
  });
  const deleteColumn   = api.table.deleteColumn.useMutation({ onMutate: ({ columnId }) => patchCache((p) => p ? { ...p, columns: p.columns.filter((c) => c.id !== columnId), rows: p.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => c.columnId !== columnId) })) } : p), onSettled: invalidate });
  const renameColumn   = api.table.renameColumn.useMutation({ onMutate: ({ columnId, name }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, name } : c) } : p), onSettled: invalidate });
  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: ({ orderedIds }) => patchCache((prev) => {
      if (!prev) return prev;
      const byId = Object.fromEntries(prev.columns.map((c) => [c.id, c]));
      return { ...prev, columns: orderedIds.map((id, i) => ({ ...byId[id]!, order: i })) };
    }),
    onSettled: invalidate,
  });
  const resizeColumn     = api.table.resizeColumn.useMutation({ onMutate: ({ columnId, width }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, width } : c) } : p), onSettled: invalidate });
  const changeColumnType = api.table.changeColumnType.useMutation({ onMutate: ({ columnId, type }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, type } : c) } : p), onSettled: invalidate });

  const [sort, setSort]               = useState<SortState>(null);
  const [editing, setEditing]         = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [typePickerColId, setTypePickerColId] = useState<string | null>(null);
  const [addingCol, setAddingCol]     = useState(false);
  const [newColName, setNewColName]   = useState("");
  const [newColType, setNewColType]   = useState("TEXT");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dragColId, setDragColId]     = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);

  if (!table) return <div className="p-8 text-white/30 text-sm animate-pulse">Loading…</div>;

  const cols    = [...table.columns].sort((a, b) => a.order - b.order);
  const sorted  = sortRows(table.rows as RowWithCells[], sort, table.columns);
  const grouped = groupRows(sorted, groupByColumnId ?? null);

  function toggleSort(columnId: string) {
    setSort((p) => p?.columnId === columnId ? (p.dir === "asc" ? { columnId, dir: "desc" } : null) : { columnId, dir: "asc" });
  }

  function handleCellClick(row: RowWithCells, col: typeof cols[0]) {
    if (editing?.rowId === row.id && editing.columnId === col.id) return;
    if (col.type === "CHECKBOX") {
      // Toggle directly — no edit state needed
      const current = getCellValue(row, col.id);
      updateCell.mutate({ rowId: row.id, columnId: col.id, value: current === "true" ? "false" : "true" });
    } else {
      setEditing({ rowId: row.id, columnId: col.id, value: getCellValue(row, col.id) });
    }
  }

  function commitEdit() {
    if (!editing) return;
    updateCell.mutate({ rowId: editing.rowId, columnId: editing.columnId, value: editing.value || null });
    setEditing(null);
  }

  function handleAddColumn() {
    if (!newColName.trim()) return;
    addColumn.mutate({ tableId, name: newColName.trim(), type: newColType as any });
    setNewColName(""); setNewColType("TEXT"); setAddingCol(false); setShowTypePicker(false);
  }

  function onDragEnd() {
    if (dragColId && dragOverColId && dragColId !== dragOverColId) {
      const from = cols.findIndex((c) => c.id === dragColId);
      const to   = cols.findIndex((c) => c.id === dragOverColId);
      const reordered = [...cols];
      reordered.splice(to, 0, reordered.splice(from, 1)[0]!);
      reorderColumns.mutate({ tableId, orderedIds: reordered.map((c) => c.id) });
    }
    setDragColId(null); setDragOverColId(null);
  }

  function startResize(e: React.MouseEvent, colId: string, startW: number) {
    e.preventDefault();
    resizingRef.current = { colId, startX: e.clientX, startW };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === resizingRef.current!.colId ? { ...c, width: Math.max(80, resizingRef.current!.startW + ev.clientX - resizingRef.current!.startX) } : c) } : p);
    };
    const onUp = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      resizeColumn.mutate({ columnId: resizingRef.current.colId, width: Math.round(Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX)) });
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="w-full overflow-x-auto select-none" style={{ fontFamily: "'DM Mono', monospace" }}
      onClick={() => setTypePickerColId(null)}>
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr className="border-b border-white/10">
            <th className="w-10 px-3 py-3 text-left text-xs text-white/20 sticky left-0 bg-[#0e0e10]">#</th>
            {cols.map((col) => {
              const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
              return (
                <th key={col.id} style={{ width: col.width, minWidth: col.width }}
                  className={`relative px-0 py-0 text-left group/col border-r border-white/5 ${dragOverColId === col.id ? "bg-[#5b6af7]/10" : ""}`}
                  draggable onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }} onDragEnd={onDragEnd}>
                  <div className="flex items-center h-9 px-2 gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setTypePickerColId(typePickerColId === col.id ? null : col.id); }}
                      className="text-white/30 hover:text-[#5b6af7] text-xs transition-colors flex-shrink-0" title="Change field type">
                      {ft.icon}
                    </button>
                    {renamingCol?.id === col.id ? (
                      <input autoFocus className="bg-transparent border-b border-[#5b6af7] px-1 text-xs outline-none flex-1 min-w-0"
                        value={renamingCol.value} onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                        onBlur={() => { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); } if (e.key === "Escape") setRenamingCol(null); }} />
                    ) : (
                      <button onClick={() => toggleSort(col.id)} onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                        className="flex-1 min-w-0 text-left text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 truncate" title="Click sort · Double-click rename">
                        {col.name}{sort?.columnId === col.id && <span className="text-[#5b6af7] ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    )}
                    <button onClick={() => deleteColumn.mutate({ columnId: col.id })}
                      className="opacity-0 group-hover/col:opacity-100 text-white/20 hover:text-red-400 text-xs flex-shrink-0 transition-all">✕</button>
                  </div>
                  {typePickerColId === col.id && (
                    <FieldTypePicker current={col.type} onSelect={(t) => { changeColumnType.mutate({ columnId: col.id, type: t as any }); setTypePickerColId(null); }} />
                  )}
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#5b6af7]/60 transition-colors"
                    onMouseDown={(e) => startResize(e, col.id, col.width)} />
                </th>
              );
            })}
            <th className="px-2 py-2 text-left w-10 relative">
              {addingCol ? (
                <div className="flex items-center gap-1" style={{ minWidth: 260 }}>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowTypePicker((p) => !p); }}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-white/60 border border-white/10">
                      <span>{FIELD_TYPES[newColType]?.icon ?? "T"}</span>
                      <span>{FIELD_TYPES[newColType]?.label ?? "Text"}</span>
                    </button>
                    {showTypePicker && <FieldTypePicker current={newColType} onSelect={(t) => { setNewColType(t); setShowTypePicker(false); }} />}
                  </div>
                  <input autoFocus className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-1 text-xs outline-none flex-1"
                    placeholder="Name…" value={newColName} onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") { setAddingCol(false); setShowTypePicker(false); } }} />
                  <button onClick={handleAddColumn} className="px-2 py-1 bg-[#5b6af7] rounded text-xs">Add</button>
                  <button onClick={() => { setAddingCol(false); setShowTypePicker(false); }} className="text-white/30 text-xs px-1">✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)} className="text-white/30 hover:text-[#5b6af7] text-lg" title="Add column">+</button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ value: groupValue, rows: groupRows }) => (
            <Fragment key={groupValue || "__ungrouped__"}>
              {groupByColumnId && (
                <tr className="bg-white/[0.02]">
                  <td colSpan={cols.length + 2} className="px-4 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest border-b border-white/5">
                    {groupValue || "—"} <span className="font-normal text-white/20 ml-2 normal-case">({groupRows.length})</span>
                  </td>
                </tr>
              )}
              {groupRows.map((row, idx) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.025] group transition-colors">
                  <td className="px-3 py-2 text-xs text-white/20 select-none sticky left-0 bg-[#0e0e10]">{idx + 1}</td>
                  {cols.map((col) => {
                    const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                    const value = getCellValue(row as RowWithCells, col.id);
                    return (
                      <td key={col.id} style={{ width: col.width, maxWidth: col.width }}
                        className="px-3 py-1.5 border-r border-white/5 overflow-hidden"
                        onClick={() => handleCellClick(row as RowWithCells, col)}>
                        {col.type === "CHECKBOX" ? (
                          <input type="checkbox" checked={value === "true"} readOnly
                            className="w-4 h-4 accent-[#5b6af7] cursor-pointer" />
                        ) : isEditing ? (
                          <input autoFocus className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-1 w-full outline-none text-sm"
                            value={editing.value} type={inputTypeForField(col.type)}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={commitEdit}
                            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }} />
                        ) : (
                          <span className={`cursor-pointer block truncate text-sm transition-colors ${value ? "text-white hover:text-[#5b6af7]" : "text-white/15"}`}>
                            {formatCellValue(value, col.type) || <span className="italic text-[11px]">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2">
                    <button onClick={() => deleteRow.mutate({ rowId: row.id })}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 text-xs p-1 transition-all">✕</button>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <button onClick={() => addRow.mutate({ tableId })}
        className="mt-1 ml-10 flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors py-2">
        + Add row
      </button>
    </div>
  );
}