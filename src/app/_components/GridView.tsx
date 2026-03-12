"use client";
// src/app/_components/GridView.tsx
import { useState, useRef, useCallback, Fragment } from "react";
import { api } from "~/trpc/react";
import {
  getCellValue, sortRows, groupRows, formatCellValue,
  inputTypeForField, FIELD_TYPES, FIELD_TYPE_GROUPS,
  type RowWithCells,
} from "./tableUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortState   = { columnId: string; dir: "asc" | "desc" } | null;
type EditingCell = { rowId: string; columnId: string; value: string };
type SelectOption = { id: string; label: string; color: string; order: number; columnId: string };

// ─── Colour palette for select options ───────────────────────────────────────

const OPTION_COLORS = [
  "#2d7b6b","#7c3aed","#ef4444","#f97316",
  "#eab308","#22c55e","#06b6d4","#ec4899",
];

// ─── Field type picker ────────────────────────────────────────────────────────

function FieldTypePicker({ current, onSelect }: { current: string; onSelect: (t: string) => void }) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-1 w-52 max-h-72 overflow-y-auto">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] uppercase tracking-widest text-[#9ca3af] px-2 pt-2 pb-1">{group.label}</p>
          {group.types.map((t) => {
            const f = FIELD_TYPES[t]!;
            return (
              <button key={t} onClick={() => onSelect(t)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  current === t ? "bg-[#e8f5f1] text-[#166254]" : "text-[#4b5563] hover:bg-[#f5f6f8] hover:text-[#1f2937]"
                }`}>
                <span className="w-4 text-center text-[#9ca3af]">{f.icon}</span> {f.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Options panel ────────────────────────────────────────────────────────────

function OptionsPanel({ columnId, options, onAdd, onDelete, onUpdate }: {
  columnId: string;
  options: SelectOption[];
  onAdd: (label: string, color: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, color: string) => void;
}) {
  const [newLabel, setNewLabel]     = useState("");
  const [newColor, setNewColor]     = useState(OPTION_COLORS[0]!);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-3 w-64"
      onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] uppercase tracking-widest text-[#9ca3af] mb-2">Options</p>

      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 group/opt">
            {editingId === opt.id ? (
              <input autoFocus
                className="flex-1 bg-white border border-[#166254] rounded-lg px-2 py-0.5 text-xs outline-none text-[#1f2937]"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={() => { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); }
                  if (e.key === "Escape") setEditingId(null);
                }}/>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.color }}/>
                <span className="flex-1 text-xs text-[#4b5563] cursor-pointer"
                  onDoubleClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}>
                  {opt.label}
                </span>
                {/* Inline colour swatches on hover */}
                <div className="hidden group-hover/opt:flex gap-0.5">
                  {OPTION_COLORS.map((c) => (
                    <button key={c} onClick={() => onUpdate(opt.id, opt.label, c)}
                      className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125 border border-white/50"
                      style={{ background: c }}/>
                  ))}
                </div>
                <button onClick={() => onDelete(opt.id)}
                  className="opacity-0 group-hover/opt:opacity-100 text-[#9ca3af] hover:text-red-500 text-[10px] ml-1 transition-all">✕</button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="text-xs text-[#9ca3af] italic">No options yet</p>}
      </div>

      {/* Add new option */}
      <div className="flex items-center gap-1 border-t border-[#e2e5e9] pt-2">
        <div className="relative">
          <div className="w-5 h-5 rounded-full cursor-pointer border border-[#e2e5e9]"
            style={{ background: newColor }}
            onClick={(e) => { e.stopPropagation(); setShowPalette((p) => !p); }}/>
          {showPalette && (
            <div className="absolute bottom-full mb-1 left-0 flex gap-0.5 bg-white border border-[#e2e5e9] rounded-lg p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              {OPTION_COLORS.map((c) => (
                <button key={c} onClick={() => { setNewColor(c); setShowPalette(false); }}
                  className="w-4 h-4 rounded-full hover:scale-110 transition-transform border border-white/50"
                  style={{ background: c }}/>
              ))}
            </div>
          )}
        </div>
        <input
          className="flex-1 bg-white border border-[#e2e5e9] rounded-lg px-2 py-0.5 text-xs outline-none focus:border-[#166254] text-[#1f2937] placeholder-[#9ca3af]"
          placeholder="New option…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) { onAdd(newLabel.trim(), newColor); setNewLabel(""); }
          }}/>
        <button
          onClick={() => { if (newLabel.trim()) { onAdd(newLabel.trim(), newColor); setNewLabel(""); } }}
          className="px-2 py-0.5 bg-[#166254] hover:bg-[#124f43] text-white rounded-lg text-xs transition-colors">
          +
        </button>
      </div>
    </div>
  );
}

// ─── Select cell ──────────────────────────────────────────────────────────────

function SelectCell({ cellId, openSelectCell, setOpenSelectCell, value, options, multi, onSelect }: {
  cellId: string;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  value: string;
  options: SelectOption[];
  multi: boolean;
  onSelect: (v: string) => void;
}) {
  const isOpen = openSelectCell === cellId;
  const selected = multi
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : value ? [value] : [];

  function toggle(label: string) {
    if (multi) {
      const next = selected.includes(label)
        ? selected.filter((s) => s !== label)
        : [...selected, label];
      onSelect(next.join(", "));
    } else {
      onSelect(selected[0] === label ? "" : label);
      setOpenSelectCell(null);
    }
  }

  return (
    <div className="relative" onClick={(e) => { e.stopPropagation(); setOpenSelectCell(isOpen ? null : cellId); }}>
      <div className="flex flex-wrap gap-1 min-h-[18px] cursor-pointer">
        {selected.map((lbl) => {
          const opt = options.find((o) => o.label === lbl);
          return (
            <span key={lbl} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: (opt?.color ?? "#166254") + "1a",
                color: opt?.color ?? "#166254",
                border: `1px solid ${opt?.color ?? "#166254"}40`,
              }}>
              {lbl}
            </span>
          );
        })}
        {selected.length === 0 && <span className="text-[#d1d5db] text-[11px]">—</span>}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-1 w-48 max-h-56 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          {options.length === 0 && (
            <p className="text-xs text-[#9ca3af] p-2">No options — use the ⚙ icon in the column header to add some.</p>
          )}
          {options.map((opt) => (
            <button key={opt.id} onClick={() => toggle(opt.label)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[#f5f6f8]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }}/>
              <span className="text-xs text-[#1f2937] flex-1">{opt.label}</span>
              {selected.includes(opt.label) && <span className="text-[#166254] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Attachment cell ──────────────────────────────────────────────────────────

function AttachmentCell({ value, onUpload }: { value: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url: string; name: string };
      onUpload(data.url);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    return (
      <div className="flex items-center gap-1 text-xs">
        {isImage
          ? <img src={value} alt="attachment" className="h-6 w-6 object-cover rounded"/>
          : <span className="text-[10px]">📎</span>}
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-[#166254] hover:underline truncate max-w-[120px] text-[11px]"
          onClick={(e) => e.stopPropagation()}>
          {value.split("/").pop()}
        </a>
        <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          className="text-[#9ca3af] hover:text-[#4b5563] text-[10px] ml-auto transition-colors">↑</button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
      </div>
    );
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
      className="flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#4b5563] transition-colors">
      {uploading ? "Uploading…" : <><span>📎</span> Upload</>}
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
    </button>
  );
}

// ─── Main GridView ────────────────────────────────────────────────────────────

export default function GridView({ tableId, groupByColumnId }: {
  tableId: string;
  groupByColumnId?: string | null;
}) {
  const utils = api.useUtils();

  const { data: table, isLoading, error } = api.table.getById.useQuery({ id: tableId });

  // Shared cache helpers — one place to update, one place to invalidate
  const patchCache = useCallback(
    (updater: Parameters<typeof utils.table.getById.setData>[1]) => {
      utils.table.getById.setData({ id: tableId }, updater);
    },
    [utils, tableId],
  );
  const invalidate = useCallback(
    () => void utils.table.getById.invalidate({ id: tableId }),
    [utils, tableId],
  );

  // ── Cell mutations ─────────────────────────────────────────────────────────

  // updateCell: optimistic patch, rollback on error, then reconcile on settle
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

  // ── Row mutations ──────────────────────────────────────────────────────────

  // addRow: insert a temp placeholder row immediately, replace on settle
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

  // deleteRow: remove immediately, re-sync on settle
  const deleteRow = api.table.deleteRow.useMutation({
    onMutate: ({ rowId }) =>
      patchCache((p) => p ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p),
    onError:   invalidate,
    onSettled: invalidate,
  });

  // ── Column mutations ───────────────────────────────────────────────────────

  const addColumn = api.table.addColumn.useMutation({
    onMutate: ({ name, type }) =>
      patchCache((prev) => {
        if (!prev) return prev;
        const tempId = `temp-col-${Date.now()}`;
        return {
          ...prev,
          columns: [...prev.columns, {
            id: tempId, name, type: (type ?? "TEXT") as string,
            order: prev.columns.length, width: 180, tableId,
            createdAt: new Date(), updatedAt: new Date(),
            selectOptions: [],
          }],
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [...r.cells, {
              id: `tc-${tempId}-${r.id}`, rowId: r.id, columnId: tempId,
              value: null, createdAt: new Date(), updatedAt: new Date(),
            }],
          })),
        };
      }),
    onSettled: invalidate,
  });

  const deleteColumn = api.table.deleteColumn.useMutation({
    onMutate: ({ columnId }) =>
      patchCache((p) => p ? {
        ...p,
        columns: p.columns.filter((c) => c.id !== columnId),
        rows: p.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => c.columnId !== columnId) })),
      } : p),
    onError:   invalidate,
    onSettled: invalidate,
  });

  const renameColumn = api.table.renameColumn.useMutation({
    onMutate: ({ columnId, name }) =>
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, name } : c) } : p),
    onError:   invalidate,
    onSettled: invalidate,
  });

  const changeType = api.table.changeColumnType.useMutation({
    onMutate: ({ columnId, type }) =>
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, type } : c) } : p),
    onError:   invalidate,
    onSettled: invalidate,
  });

  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: ({ orderedIds }) =>
      patchCache((prev) => {
        if (!prev) return prev;
        const byId = Object.fromEntries(prev.columns.map((c) => [c.id, c]));
        return { ...prev, columns: orderedIds.map((id, i) => ({ ...byId[id]!, order: i })) };
      }),
    onError:   invalidate,
    onSettled: invalidate,
  });

  const resizeColumn = api.table.resizeColumn.useMutation({
    onMutate: ({ columnId, width }) =>
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, width } : c) } : p),
    // No invalidate on settle — width is purely cosmetic and already synced
  });

  // ── Select option mutations — ALL optimistic ───────────────────────────────

  // addSelectOption: push a temp option onto the column immediately
  const addOption = api.table.addSelectOption.useMutation({
    onMutate: ({ columnId, label, color }) =>
      patchCache((prev) => {
        if (!prev) return prev;
        const tempId = `temp-opt-${Date.now()}`;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id !== columnId ? col : {
              ...col,
              selectOptions: [
                ...(col.selectOptions ?? []),
                { id: tempId, label, color, order: (col.selectOptions ?? []).length, columnId, createdAt: new Date(), updatedAt: new Date() },
              ],
            }
          ),
        };
      }),
    onError:   invalidate,
    onSettled: invalidate,
  });

  // deleteSelectOption: remove immediately, rollback on error
  const deleteOption = api.table.deleteSelectOption.useMutation({
    onMutate: ({ optionId }) =>
      patchCache((prev) => prev ? {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          selectOptions: (col.selectOptions ?? []).filter((o) => o.id !== optionId),
        })),
      } : prev),
    onError:   invalidate,
    onSettled: invalidate,
  });

  // updateSelectOption: patch label/colour immediately
  const updateOption = api.table.updateSelectOption.useMutation({
    onMutate: ({ optionId, label, color }) =>
      patchCache((prev) => prev ? {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          selectOptions: (col.selectOptions ?? []).map((o) =>
            o.id !== optionId ? o : { ...o, label, color }
          ),
        })),
      } : prev),
    onError:   invalidate,
    onSettled: invalidate,
  });

  // ── Local UI state ─────────────────────────────────────────────────────────

  const [sort, setSort]               = useState<SortState>(null);
  const [editing, setEditing]         = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [openSelectCell, setOpenSelectCell] = useState<string | null>(null);
  const [headerPanel, setHeaderPanel] = useState<{ colId: string; panel: "type" | "options" } | null>(null);
  const [addingCol, setAddingCol]     = useState(false);
  const [newColName, setNewColName]   = useState("");
  const [newColType, setNewColType]   = useState("TEXT");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dragColId, setDragColId]     = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);

  // ── Loading / error states (workshop requirement) ──────────────────────────

  if (isLoading) return (
    <div className="p-8 text-[#9ca3af] text-sm animate-pulse">Loading…</div>
  );
  if (error) return (
    <div className="p-8 text-red-400 text-sm">Failed to load table. Please refresh.</div>
  );
  if (!table) return (
    <div className="p-8 text-[#9ca3af] text-sm">Table not found.</div>
  );

  const cols    = [...table.columns].sort((a, b) => a.order - b.order);
  const sorted  = sortRows(table.rows as RowWithCells[], sort, table.columns);
  const grouped = groupRows(sorted, groupByColumnId ?? null);
  const isSelect = (type: string) => type === "SINGLE_SELECT" || type === "MULTI_SELECT";

  // ── Event handlers ─────────────────────────────────────────────────────────

  function toggleSort(colId: string) {
    setSort((p) =>
      p?.columnId === colId
        ? p.dir === "asc" ? { columnId: colId, dir: "desc" } : null
        : { columnId: colId, dir: "asc" }
    );
  }

  function handleCellClick(row: RowWithCells, col: typeof cols[0]) {
    setHeaderPanel(null);
    setOpenSelectCell(null);
    if (editing?.rowId === row.id && editing.columnId === col.id) return;

    if (col.type === "CHECKBOX") {
      updateCell.mutate({
        rowId: row.id, columnId: col.id,
        value: getCellValue(row, col.id) === "true" ? "false" : "true",
      });
    } else if (isSelect(col.type) || col.type === "ATTACHMENT") {
      // These render their own interactive sub-UI
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
    setDragColId(null);
    setDragOverColId(null);
  }

  function startResize(e: React.MouseEvent, colId: string, startW: number) {
    e.preventDefault();
    resizingRef.current = { colId, startX: e.clientX, startW };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX);
      patchCache((p) => p ? {
        ...p, columns: p.columns.map((c) => c.id === resizingRef.current!.colId ? { ...c, width: w } : c),
      } : p);
    };

    const onUp = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.round(Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX));
      resizeColumn.mutate({ columnId: resizingRef.current.colId, width: w });
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full overflow-x-auto select-none bg-white"
      onClick={() => { setHeaderPanel(null); setOpenSelectCell(null); }}>
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>

        {/* ── Header ── */}
        <thead>
          <tr className="border-b border-[#e2e5e9] bg-[#f9fafb]">

            {/* Row number col */}
            <th className="w-12 px-3 py-0 text-left sticky left-0 bg-[#f9fafb] z-10 border-r border-[#e2e5e9]">
              <div className="flex items-center h-8">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 hover:opacity-100"/>
              </div>
            </th>

            {cols.map((col) => {
              const ft             = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
              const isCurrentPanel = headerPanel?.colId === col.id;
              return (
                <th key={col.id} style={{ width: col.width, minWidth: col.width }}
                  className={`relative px-0 py-0 text-left group/col border-r border-[#e2e5e9] bg-[#f9fafb] ${
                    dragOverColId === col.id ? "bg-[#e8f5f1]" : ""
                  }`}
                  draggable
                  onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }}
                  onDragEnd={onDragEnd}>

                  <div className="flex items-center h-8 px-2 gap-1.5">
                    {/* Field type icon — click to change type */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeaderPanel(isCurrentPanel && headerPanel?.panel === "type" ? null : { colId: col.id, panel: "type" });
                      }}
                      className="text-[#9ca3af] hover:text-[#166254] text-xs transition-colors flex-shrink-0"
                      title="Change field type">
                      {ft.icon}
                    </button>

                    {/* Options gear — only for select columns */}
                    {isSelect(col.type) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHeaderPanel(isCurrentPanel && headerPanel?.panel === "options" ? null : { colId: col.id, panel: "options" });
                        }}
                        className="text-[#9ca3af] hover:text-[#166254] text-[9px] transition-colors flex-shrink-0"
                        title="Manage options">
                        ⚙
                      </button>
                    )}

                    {/* Column name / rename input */}
                    {renamingCol?.id === col.id ? (
                      <input autoFocus
                        className="bg-transparent border-b-2 border-[#166254] px-1 text-xs outline-none flex-1 min-w-0 text-[#1f2937]"
                        value={renamingCol.value}
                        onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                        onBlur={() => { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }
                          if (e.key === "Escape") setRenamingCol(null);
                        }}/>
                    ) : (
                      <button
                        onClick={() => toggleSort(col.id)}
                        onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                        className="flex-1 min-w-0 text-left text-[11px] font-medium text-[#4b5563] hover:text-[#1f2937] truncate"
                        title="Click to sort · Double-click to rename">
                        {col.name}
                        {sort?.columnId === col.id && (
                          <span className="text-[#166254] ml-1 text-[10px]">{sort.dir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </button>
                    )}

                    {/* Delete column */}
                    <button onClick={() => deleteColumn.mutate({ columnId: col.id })}
                      className="opacity-0 group-hover/col:opacity-100 text-[#9ca3af] hover:text-red-500 text-xs flex-shrink-0 transition-all p-0.5 rounded hover:bg-red-50">✕</button>
                  </div>

                  {/* Panels */}
                  {isCurrentPanel && headerPanel?.panel === "type" && (
                    <FieldTypePicker current={col.type}
                      onSelect={(t) => { changeType.mutate({ columnId: col.id, type: t as any }); setHeaderPanel(null); }}/>
                  )}
                  {isCurrentPanel && headerPanel?.panel === "options" && (
                    <OptionsPanel
                      columnId={col.id}
                      options={(col.selectOptions ?? []) as SelectOption[]}
                      onAdd={(label, color) => addOption.mutate({ columnId: col.id, label, color })}
                      onDelete={(id) => deleteOption.mutate({ optionId: id })}
                      onUpdate={(id, label, color) => updateOption.mutate({ optionId: id, label, color })}/>
                  )}

                  {/* Resize handle */}
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#166254]/40 transition-colors z-10"
                    onMouseDown={(e) => startResize(e, col.id, col.width)}/>
                </th>
              );
            })}

            {/* Add column */}
            <th className="px-2 py-0 text-left w-24 bg-[#f9fafb]">
              {addingCol ? (
                <div className="flex items-center gap-1 h-8" style={{ minWidth: 240 }}>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowTypePicker((p) => !p); }}
                      className="text-xs px-1.5 py-1 rounded border border-[#e2e5e9] bg-white hover:bg-[#f5f6f8] text-[#4b5563] transition-colors">
                      {FIELD_TYPES[newColType]?.icon ?? "T"}
                    </button>
                    {showTypePicker && (
                      <FieldTypePicker current={newColType} onSelect={(t) => { setNewColType(t); setShowTypePicker(false); }}/>
                    )}
                  </div>
                  <input autoFocus
                    className="border border-[#166254] rounded-lg px-2 py-1 text-xs outline-none flex-1 bg-white text-[#1f2937] placeholder-[#9ca3af]"
                    placeholder="Name…"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  handleAddColumn();
                      if (e.key === "Escape") { setAddingCol(false); setShowTypePicker(false); }
                    }}/>
                  <button onClick={handleAddColumn}
                    className="px-2 py-1 bg-[#166254] text-white rounded-lg text-xs hover:bg-[#124f43] transition-colors">Add</button>
                  <button onClick={() => { setAddingCol(false); setShowTypePicker(false); }}
                    className="text-[#9ca3af] text-xs hover:text-[#6b7280] transition-colors">✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)}
                  className="flex items-center gap-1 h-8 px-2 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f0f1f3] transition-colors w-full text-xs"
                  title="Add field">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
                  </svg>
                  Add field
                </button>
              )}
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {grouped.map(({ value: groupValue, rows: groupRows }) => (
            <Fragment key={groupValue || "__ungrouped__"}>
              {groupByColumnId && (
                <tr className="bg-[#f9fafb]">
                  <td colSpan={cols.length + 2} className="px-4 py-1.5 text-[11px] font-semibold text-[#4b5563] border-b border-[#e2e5e9]">
                    {groupValue || "—"}
                    <span className="font-normal text-[#9ca3af] ml-2">({groupRows.length})</span>
                  </td>
                </tr>
              )}

              {groupRows.map((row, idx) => (
                <tr key={row.id} className="border-b border-[#e2e5e9] hover:bg-[#f9fafb] group transition-colors">

                  {/* Row number + checkbox */}
                  <td className="px-3 py-0 sticky left-0 bg-white group-hover:bg-[#f9fafb] transition-colors border-r border-[#e2e5e9] z-10">
                    <div className="flex items-center h-8 gap-1">
                      <input type="checkbox"
                        className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"/>
                      <span className="text-[11px] text-[#9ca3af] select-none group-hover:hidden w-4 text-right">{idx + 1}</span>
                    </div>
                  </td>

                  {cols.map((col) => {
                    const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                    const value     = getCellValue(row as RowWithCells, col.id);
                    return (
                      <td key={col.id} style={{ width: col.width, maxWidth: col.width }}
                        className="px-2 py-0 border-r border-[#e2e5e9] overflow-visible h-8"
                        onClick={() => handleCellClick(row as RowWithCells, col)}>
                        <div className="flex items-center h-8">

                          {col.type === "CHECKBOX" ? (
                            <input type="checkbox" readOnly checked={value === "true"}
                              className="w-3.5 h-3.5 rounded accent-[#166254] cursor-pointer"/>

                          ) : isSelect(col.type) ? (
                            <SelectCell
                              cellId={`${row.id}-${col.id}`}
                              openSelectCell={openSelectCell}
                              setOpenSelectCell={setOpenSelectCell}
                              value={value}
                              options={(col.selectOptions ?? []) as SelectOption[]}
                              multi={col.type === "MULTI_SELECT"}
                              onSelect={(v) => updateCell.mutate({ rowId: row.id, columnId: col.id, value: v || null })}/>

                          ) : col.type === "ATTACHMENT" ? (
                            <AttachmentCell value={value}
                              onUpload={(url) => updateCell.mutate({ rowId: row.id, columnId: col.id, value: url })}/>

                          ) : isEditing ? (
                            <input autoFocus
                              className="border-2 border-[#166254] rounded px-2 py-0.5 w-full outline-none text-xs bg-white text-[#1f2937] shadow-sm"
                              value={editing.value}
                              type={inputTypeForField(col.type)}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")  commitEdit();
                                if (e.key === "Escape") setEditing(null);
                              }}/>

                          ) : (
                            <span className={`cursor-pointer block truncate text-xs transition-colors ${
                              value ? "text-[#1f2937] hover:text-[#166254]" : "text-[#d1d5db]"
                            }`}>
                              {formatCellValue(value, col.type) || ""}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Delete row */}
                  <td className="w-8 px-1">
                    <button onClick={() => deleteRow.mutate({ rowId: row.id })}
                      className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 text-xs p-1 transition-all rounded hover:bg-red-50">✕</button>
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* ── Add row ── */}
      <div className="border-b border-[#e2e5e9]">
        <button onClick={() => addRow.mutate({ tableId })}
          className="flex items-center gap-2 px-4 py-2 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f9fafb] transition-colors w-full text-xs">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
          </svg>
          Add record
        </button>
      </div>
    </div>
  );
}