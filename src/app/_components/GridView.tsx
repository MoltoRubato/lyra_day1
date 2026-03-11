"use client";
// src/app/_components/GridView.tsx
import { useState, useRef, useCallback, Fragment } from "react";
import { api } from "~/trpc/react";
import { getCellValue, sortRows, groupRows, formatCellValue, inputTypeForField, FIELD_TYPES, FIELD_TYPE_GROUPS, type RowWithCells } from "./tableUtils";

type SortState   = { columnId: string; dir: "asc" | "desc" } | null;
type EditingCell = { rowId: string; columnId: string; value: string };

// ── Colour palette for select options ────────────────────────────────────────
const OPTION_COLORS = ["#5b6af7","#9b6af7","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#ec4899"];

// ── Field type picker ─────────────────────────────────────────────────────────
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

// ── Options manager (for select columns) ──────────────────────────────────────
type SelectOption = { id: string; label: string; color: string; order: number; columnId: string };

function OptionsPanel({ columnId, options, onAdd, onDelete, onUpdate }: {
  columnId: string; options: SelectOption[];
  onAdd: (label: string, color: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, color: string) => void;
}) {
  const [newLabel, setNewLabel]   = useState("");
  const [newColor, setNewColor]   = useState(OPTION_COLORS[0]!);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-[#1a1a1e] border border-white/15 rounded-lg shadow-2xl p-3 w-64" onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Options</p>
      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 group/opt">
            {editingId === opt.id ? (
              <>
                <input className="flex-1 bg-[#0e0e10] border border-[#5b6af7] rounded px-2 py-0.5 text-xs outline-none"
                  value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); } }}
                  autoFocus />
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                <span className="flex-1 text-xs text-white/70 cursor-pointer" onDoubleClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}>{opt.label}</span>
                {/* Color swatches inline on hover */}
                <div className="hidden group-hover/opt:flex gap-0.5">
                  {OPTION_COLORS.map((c) => (
                    <button key={c} onClick={() => onUpdate(opt.id, opt.label, c)}
                      className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                      style={{ background: c }} />
                  ))}
                </div>
                <button onClick={() => onDelete(opt.id)} className="opacity-0 group-hover/opt:opacity-100 text-white/20 hover:text-red-400 text-[10px] ml-1">✕</button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="text-xs text-white/20 italic">No options yet</p>}
      </div>
      {/* Add new option */}
        <div className="flex items-center gap-1 border-t border-white/10 pt-2">
        <div className="relative">
            <div
            className="w-5 h-5 rounded-full cursor-pointer"
            style={{ background: newColor }}
            onClick={(e) => {
                e.stopPropagation();
                setShowPalette((p) => !p);
            }}
            />

            {showPalette && (
            <div
                className="absolute bottom-full mb-1 left-0 flex gap-0.5 bg-[#1a1a1e] border border-white/10 rounded p-1"
                onClick={(e) => e.stopPropagation()}
            >
                {OPTION_COLORS.map((c) => (
                <button
                    key={c}
                    onClick={() => {
                    setNewColor(c);
                    setShowPalette(false);
                    }}
                    className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                    style={{ background: c }}
                />
                ))}
            </div>
            )}
        </div>

        <input
            className="flex-1 bg-[#0e0e10] border border-white/15 rounded px-2 py-0.5 text-xs outline-none focus:border-[#5b6af7]"
            placeholder="New option…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) {
                onAdd(newLabel.trim(), newColor);
                setNewLabel("");
            }
            }}
        />

        <button
            onClick={() => {
            if (newLabel.trim()) {
                onAdd(newLabel.trim(), newColor);
                setNewLabel("");
            }
            }}
            className="px-2 py-0.5 bg-[#5b6af7] hover:bg-[#4a59e6] rounded text-xs transition-colors"
        >
            +
        </button>
        </div>
    </div>
  );
}

// ── Select cell ───────────────────────────────────────────────────────────────
function SelectCell({
  cellId,
  openSelectCell,
  setOpenSelectCell,
  value,
  options,
  multi,
  onSelect
}: {
  cellId: string
  openSelectCell: string | null
  setOpenSelectCell: (id: string | null) => void
  value: string
  options: SelectOption[]
  multi: boolean
  onSelect: (v: string) => void
}) {
  const open = openSelectCell === cellId;
  const selected = multi
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : value ? [value] : [];

  function toggle(label: string) {
    if (multi) {
      const next = selected.includes(label) ? selected.filter((s) => s !== label) : [...selected, label];
      onSelect(next.join(", "));
    } else {
      onSelect(selected[0] === label ? "" : label);
      setOpenSelectCell(null);
    }
  }

  return (
    <div className="relative" onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenSelectCell(open ? null : cellId);
                                                }}>
      <div className="flex flex-wrap gap-1 min-h-[20px] cursor-pointer">
        {selected.map((lbl) => {
          const opt = options.find((o) => o.label === lbl);
          return (
            <span key={lbl} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: (opt?.color ?? "#5b6af7") + "33", color: opt?.color ?? "#5b6af7", border: `1px solid ${opt?.color ?? "#5b6af7"}55` }}>
              {lbl}
            </span>
          );
        })}
        {selected.length === 0 && <span className="text-white/15 italic text-[11px]">—</span>}
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-[#1a1a1e] border border-white/15 rounded-lg shadow-2xl p-1 w-48 max-h-56 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          {options.length === 0 && <p className="text-xs text-white/30 p-2">No options — use the header icon to add some</p>}
          {options.map((opt) => (
            <button key={opt.id} onClick={() => toggle(opt.label)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-white/5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              <span className="text-xs text-white/80 flex-1">{opt.label}</span>
              {selected.includes(opt.label) && <span className="text-[#5b6af7] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Attachment cell ───────────────────────────────────────────────────────────
function AttachmentCell({ value, onUpload }: { value: string; onUpload: (url: string, name: string) => void }) {
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
      onUpload(data.url, data.name);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    return (
      <div className="flex items-center gap-1 text-xs">
        {isImage
          ? <img src={value} alt="attachment" className="h-6 w-6 object-cover rounded" />
          : <span className="text-[10px]">📎</span>}
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-[#5b6af7] hover:underline truncate max-w-[120px]" onClick={(e) => e.stopPropagation()}>
          {value.split("/").pop()}
        </a>
        <button onClick={(e) => { e.stopPropagation(); if (fileRef.current) fileRef.current.click(); }}
          className="text-white/20 hover:text-white/60 text-[10px] ml-auto">↑</button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); if (fileRef.current) fileRef.current.click(); }}
      className="flex items-center gap-1 text-xs text-white/20 hover:text-white/50 transition-colors">
      {uploading ? "Uploading…" : <><span>📎</span> Upload</>}
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GridView({ tableId, groupByColumnId }: {
  tableId: string; groupByColumnId?: string | null;
}) {
  const utils = api.useUtils();
  const { data: table } = api.table.getById.useQuery({ id: tableId });

  const patchCache = useCallback((updater: Parameters<typeof utils.table.getById.setData>[1]) => {
    utils.table.getById.setData({ id: tableId }, updater);
  }, [utils, tableId]);
  const invalidate = useCallback(() => void utils.table.getById.invalidate({ id: tableId }), [utils, tableId]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateCell = api.table.updateCell.useMutation({
    onMutate: ({ rowId, columnId, value }) => patchCache((prev) => prev ? {
      ...prev, rows: prev.rows.map((r) => r.id !== rowId ? r : {
        ...r, cells: r.cells.map((c) => c.columnId !== columnId ? c : { ...c, value }),
      }),
    } : prev),
    onError: invalidate, onSettled: invalidate,
  });

  const addRow = api.table.addRow.useMutation({
    onMutate: () => patchCache((prev) => {
      if (!prev) return prev;
      const tempId = `temp-${Date.now()}`;
      return { ...prev, rows: [...prev.rows, {
        id: tempId, tableId, order: prev.rows.length, createdAt: new Date(), updatedAt: new Date(),
        cells: prev.columns.map((c) => ({ id: `tc-${c.id}`, rowId: tempId, columnId: c.id, value: null, createdAt: new Date(), updatedAt: new Date() })),
      }]};
    }),
    onSettled: invalidate,
  });

  const deleteRow      = api.table.deleteRow.useMutation({ onMutate: ({ rowId }) => patchCache((p) => p ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p), onSettled: invalidate });
  const addColumn      = api.table.addColumn.useMutation({
    onMutate: ({ name, type }) => patchCache((prev) => {
      if (!prev) return prev;
      const tempId = `temp-col-${Date.now()}`;
      return { ...prev,
        columns: [...prev.columns, { id: tempId, name, type: type ?? "TEXT", order: prev.columns.length, width: 180, tableId, createdAt: new Date(), updatedAt: new Date(), selectOptions: [] }],
        rows: prev.rows.map((r) => ({ ...r, cells: [...r.cells, { id: `tc-${tempId}-${r.id}`, rowId: r.id, columnId: tempId, value: null, createdAt: new Date(), updatedAt: new Date() }] })),
      };
    }),
    onSettled: invalidate,
  });
  const deleteColumn   = api.table.deleteColumn.useMutation({ onMutate: ({ columnId }) => patchCache((p) => p ? { ...p, columns: p.columns.filter((c) => c.id !== columnId), rows: p.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => c.columnId !== columnId) })) } : p), onSettled: invalidate });
  const renameColumn   = api.table.renameColumn.useMutation({ onMutate: ({ columnId, name }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, name } : c) } : p), onSettled: invalidate });
  const reorderColumns = api.table.reorderColumns.useMutation({ onMutate: ({ orderedIds }) => patchCache((prev) => { if (!prev) return prev; const byId = Object.fromEntries(prev.columns.map((c) => [c.id, c])); return { ...prev, columns: orderedIds.map((id, i) => ({ ...byId[id]!, order: i })) }; }), onSettled: invalidate });
  const resizeColumn   = api.table.resizeColumn.useMutation({ onMutate: ({ columnId, width }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, width } : c) } : p), onSettled: invalidate });
  const changeType     = api.table.changeColumnType.useMutation({ onMutate: ({ columnId, type }) => patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, type } : c) } : p), onSettled: invalidate });

  // Select option mutations — invalidate to refresh option list
  const addOption    = api.table.addSelectOption.useMutation({ onSuccess: invalidate });
  const deleteOption = api.table.deleteSelectOption.useMutation({ onSuccess: invalidate });
  const updateOption = api.table.updateSelectOption.useMutation({ onSuccess: invalidate });

  // ── Local state ───────────────────────────────────────────────────────────
  const [sort, setSort]               = useState<SortState>(null);
  const [editing, setEditing]         = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [openSelectCell, setOpenSelectCell] = useState<string | null>(null);
  // Each column header can show either the type picker or options panel
  const [headerPanel, setHeaderPanel] = useState<{ colId: string; panel: "type" | "options" } | null>(null);
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

  function toggleSort(colId: string) {
    setSort((p) => p?.columnId === colId ? (p.dir === "asc" ? { columnId: colId, dir: "desc" } : null) : { columnId: colId, dir: "asc" });
  }

  function handleCellClick(row: RowWithCells, col: typeof cols[0]) {
    setHeaderPanel(null);
    if (editing?.rowId === row.id && editing.columnId === col.id) return;
    if (col.type === "CHECKBOX") {
      updateCell.mutate({ rowId: row.id, columnId: col.id, value: getCellValue(row, col.id) === "true" ? "false" : "true" });
    } else if (col.type === "SINGLE_SELECT" || col.type === "MULTI_SELECT" || col.type === "ATTACHMENT") {
      // These render their own interactive UI — handled in cell render below
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
      const w = Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX);
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === resizingRef.current!.colId ? { ...c, width: w } : c) } : p);
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

  const isSelect = (type: string) => type === "SINGLE_SELECT" || type === "MULTI_SELECT";

  return (
    <div className="w-full overflow-x-auto select-none" style={{ fontFamily: "'DM Mono', monospace" }}
      onClick={() => {
        setHeaderPanel(null)
        setOpenSelectCell(null)
        }}>
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr className="border-b border-white/10">
            <th className="w-10 px-3 py-3 text-left text-xs text-white/20 sticky left-0 bg-[#0e0e10]">#</th>
            {cols.map((col) => {
              const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
              const isCurrentPanel = headerPanel?.colId === col.id;
              return (
                <th key={col.id} style={{ width: col.width, minWidth: col.width }}
                  className={`relative px-0 py-0 text-left group/col border-r border-white/5 ${dragOverColId === col.id ? "bg-[#5b6af7]/10" : ""}`}
                  draggable onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }}
                  onDragEnd={onDragEnd}>
                  <div className="flex items-center h-9 px-2 gap-1">
                    {/* Type icon — click opens type picker; select columns also get options button */}
                    <button onClick={(e) => { e.stopPropagation(); setHeaderPanel(isCurrentPanel && headerPanel?.panel === "type" ? null : { colId: col.id, panel: "type" }); }}
                      className="text-white/30 hover:text-[#5b6af7] text-xs transition-colors flex-shrink-0" title="Change field type">
                      {ft.icon}
                    </button>
                    {isSelect(col.type) && (
                      <button onClick={(e) => { e.stopPropagation(); setHeaderPanel(isCurrentPanel && headerPanel?.panel === "options" ? null : { colId: col.id, panel: "options" }); }}
                        className="text-white/20 hover:text-[#5b6af7] text-[9px] transition-colors flex-shrink-0" title="Manage options">
                        ⚙
                      </button>
                    )}
                    {renamingCol?.id === col.id ? (
                      <input autoFocus className="bg-transparent border-b border-[#5b6af7] px-1 text-xs outline-none flex-1 min-w-0"
                        value={renamingCol.value}
                        onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                        onBlur={() => { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); } if (e.key === "Escape") setRenamingCol(null); }} />
                    ) : (
                      <button onClick={() => toggleSort(col.id)} onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                        className="flex-1 min-w-0 text-left text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 truncate"
                        title="Click sort · Double-click rename">
                        {col.name}
                        {sort?.columnId === col.id && <span className="text-[#5b6af7] ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    )}
                    <button onClick={() => deleteColumn.mutate({ columnId: col.id })}
                      className="opacity-0 group-hover/col:opacity-100 text-white/20 hover:text-red-400 text-xs flex-shrink-0 transition-all">✕</button>
                  </div>

                  {/* Type picker dropdown */}
                  {isCurrentPanel && headerPanel?.panel === "type" && (
                    <FieldTypePicker current={col.type}
                      onSelect={(t) => { changeType.mutate({ columnId: col.id, type: t as any }); setHeaderPanel(null); }} />
                  )}
                  {/* Options panel */}
                  {isCurrentPanel && headerPanel?.panel === "options" && (
                    <OptionsPanel columnId={col.id} options={(col.selectOptions ?? []) as SelectOption[]}
                      onAdd={(label, color) => addOption.mutate({ columnId: col.id, label, color })}
                      onDelete={(id) => deleteOption.mutate({ optionId: id })}
                      onUpdate={(id, label, color) => updateOption.mutate({ optionId: id, label, color })} />
                  )}
                  {/* Resize handle */}
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#5b6af7]/60 transition-colors"
                    onMouseDown={(e) => startResize(e, col.id, col.width)} />
                </th>
              );
            })}
            <th className="px-2 py-2 text-left w-10 relative">
              {addingCol ? (
                <div className="flex items-center gap-1" style={{ minWidth: 240 }}>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowTypePicker((p) => !p); }}
                      className="text-sm px-1 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">{FIELD_TYPES[newColType]?.icon ?? "T"}</button>
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
                        className="px-3 py-1.5 border-r border-white/5 overflow-visible"
                        onClick={() => handleCellClick(row as RowWithCells, col)}>
                        {col.type === "CHECKBOX" ? (
                          <input type="checkbox" checked={value === "true"} readOnly className="w-4 h-4 accent-[#5b6af7] cursor-pointer" />
                        ) : isSelect(col.type) ? (
                          <SelectCell
                            cellId={`${row.id}-${col.id}`}
                            openSelectCell={openSelectCell}
                            setOpenSelectCell={setOpenSelectCell}
                            value={value}
                            options={(col.selectOptions ?? []) as SelectOption[]}
                            multi={col.type === "MULTI_SELECT"}
                            onSelect={(v) =>
                                updateCell.mutate({ rowId: row.id, columnId: col.id, value: v || null })
                            }
                            />
                        ) : col.type === "ATTACHMENT" ? (
                          <AttachmentCell value={value}
                            onUpload={(url) => updateCell.mutate({ rowId: row.id, columnId: col.id, value: url })} />
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