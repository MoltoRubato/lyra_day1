"use client";

// src/app/_components/GridView.tsx
import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import type { Column, Row, Cell, ColumnType } from "@prisma/client";

type RowWithCells = Row & { cells: Cell[] };
type TableData = {
  columns: Column[];
  rows: RowWithCells[];
};

type SortState = { columnId: string; dir: "asc" | "desc" } | null;

function getCellValue(row: RowWithCells, columnId: string): string {
  return row.cells.find((c) => c.columnId === columnId)?.value ?? "";
}

function sortRows(rows: RowWithCells[], sort: SortState, columns: Column[]): RowWithCells[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = getCellValue(a, sort.columnId);
    const bv = getCellValue(b, sort.columnId);
    const dir = sort.dir === "asc" ? 1 : -1;
    if (col.type === "NUMBER") {
      return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
    }
    return dir * av.localeCompare(bv);
  });
}

interface EditingCell { rowId: string; columnId: string; value: string }

export default function GridView({ tableId }: { tableId: string }) {
  const { data: table, refetch } = api.table.getById.useQuery({ id: tableId });
  const updateCell = api.table.updateCell.useMutation({ onSuccess: () => void refetch() });
  const addRow = api.table.addRow.useMutation({ onSuccess: () => void refetch() });
  const deleteRow = api.table.deleteRow.useMutation({ onSuccess: () => void refetch() });
  const addColumn = api.table.addColumn.useMutation({ onSuccess: () => void refetch() });
  const deleteColumn = api.table.deleteColumn.useMutation({ onSuccess: () => void refetch() });
  const renameColumn = api.table.renameColumn.useMutation({ onSuccess: () => void refetch() });

  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("TEXT");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!table) return <div className="p-6 text-white/30 text-sm animate-pulse">Loading...</div>;

  const sorted = sortRows(table.rows, sort, table.columns);

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (prev?.columnId === columnId) {
        return prev.dir === "asc" ? { columnId, dir: "desc" } : null;
      }
      return { columnId, dir: "asc" };
    });
  }

  function startEdit(rowId: string, columnId: string) {
    const row = table!.rows.find((r) => r.id === rowId);
    const value = row ? getCellValue(row as RowWithCells, columnId) : "";
    setEditing({ rowId, columnId, value });
  }

  function commitEdit() {
    if (!editing) return;
    updateCell.mutate({ rowId: editing.rowId, columnId: editing.columnId, value: editing.value || null });
    setEditing(null);
  }

  function commitRename() {
    if (!renamingCol || !renamingCol.value.trim()) { setRenamingCol(null); return; }
    renameColumn.mutate({ columnId: renamingCol.id, name: renamingCol.value.trim() });
    setRenamingCol(null);
  }

  function handleAddColumn() {
    if (!newColName.trim()) return;
    addColumn.mutate({ tableId, name: newColName.trim(), type: newColType });
    setNewColName("");
    setNewColType("TEXT");
    setAddingCol(false);
  }

  const SortIcon = ({ colId }: { colId: string }) => {
    if (sort?.columnId !== colId) return <span className="text-white/20 ml-1 text-[10px]">⇅</span>;
    return <span className="text-[#5b6af7] ml-1 text-[10px]">{sort.dir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="w-full overflow-x-auto" style={{ fontFamily: "'DM Mono', monospace" }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {/* Row number gutter */}
            <th className="w-10 px-3 py-3 text-left text-xs text-white/20">#</th>

            {table.columns.map((col) => (
              <th key={col.id} className="px-3 py-2 text-left min-w-[160px] group/col">
                <div className="flex items-center gap-1">
                  {renamingCol?.id === col.id ? (
                    <input
                      autoFocus
                      className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-0.5 text-xs outline-none w-full"
                      value={renamingCol.value}
                      onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                      onBlur={commitRename}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingCol(null); }}
                    />
                  ) : (
                    <button
                      onClick={() => toggleSort(col.id)}
                      onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                      className="flex items-center text-xs uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
                      title="Click to sort · Double-click to rename"
                    >
                      <span className="mr-1 text-white/20">{col.type === "NUMBER" ? "№" : "T"}</span>
                      {col.name}
                      <SortIcon colId={col.id} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteColumn.mutate({ columnId: col.id })}
                    className="ml-1 opacity-0 group-hover/col:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs"
                    title="Delete column"
                  >
                    ✕
                  </button>
                </div>
              </th>
            ))}

            {/* Add column button */}
            <th className="px-3 py-2 w-10">
              {addingCol ? (
                <div className="flex items-center gap-1 min-w-[220px]">
                  <input
                    autoFocus
                    className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-1 text-xs outline-none flex-1"
                    placeholder="Column name..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") setAddingCol(false); }}
                  />
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value as ColumnType)}
                    className="bg-[#1a1a1e] border border-white/20 rounded px-1 py-1 text-xs outline-none text-white/60"
                  >
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                  </select>
                  <button onClick={handleAddColumn} className="px-2 py-1 bg-[#5b6af7] rounded text-xs">Add</button>
                  <button onClick={() => setAddingCol(false)} className="text-white/30 hover:text-white text-xs px-1">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="text-white/30 hover:text-[#5b6af7] transition-colors text-lg leading-none font-light"
                  title="Add column"
                >
                  +
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.025] group transition-colors">
              {/* Row number */}
              <td className="px-3 py-2 text-xs text-white/20 select-none">{idx + 1}</td>

              {table.columns.map((col) => {
                const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                const value = getCellValue(row as RowWithCells, col.id);
                return (
                  <td
                    key={col.id}
                    className="px-3 py-1.5 min-w-[160px]"
                    onClick={() => !isEditing && startEdit(row.id, col.id)}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="bg-[#1e1e28] border border-[#5b6af7] rounded px-2 py-1 w-full outline-none text-sm"
                        value={editing.value}
                        type={col.type === "NUMBER" ? "number" : "text"}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                      />
                    ) : (
                      <span className={`cursor-pointer block truncate ${value ? "text-white" : "text-white/20"} hover:text-[#5b6af7] transition-colors text-sm`}>
                        {value || <span className="italic text-xs">empty</span>}
                      </span>
                    )}
                  </td>
                );
              })}

              {/* Delete row */}
              <td className="px-2">
                <button
                  onClick={() => deleteRow.mutate({ rowId: row.id })}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs p-1"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row */}
      <button
        onClick={() => addRow.mutate({ tableId })}
        className="mt-1 ml-[52px] flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors py-2"
      >
        <span className="text-base leading-none">+</span> Add row
      </button>
    </div>
  );
}