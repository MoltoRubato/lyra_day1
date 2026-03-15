import { useState } from "react";
import { formatCellValue, inputTypeForField, FIELD_TYPES, type FilterCondition, type GroupRule, type RowWithCells, type SortRule } from "~/app/_components/tableUtils";
import { AttachmentCell, FieldTypePicker, OptionsPanel, SelectCell, type SelectOption } from "~/app/_components/gridViewCells";
import type { ColumnType } from "@prisma/client";

type EditingCell = { rowId: string; columnId: string; value: string };

type HeaderPanel = { colId: string; panel: "type" | "options" } | null;

const GROUP_DEPTH_COLORS = [
  { bg: "#f0f4f8", text: "#374151", border: "#e2e8f0", dot: "#6b7280" },
  { bg: "#f5f3ff", text: "#5b21b6", border: "#ede9fe", dot: "#8b5cf6" },
  { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", dot: "#f97316" },
];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function FieldTypeIcon({ type, className = "text-[#111827]" }: { type: string; className?: string }) {
  const common = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none" } as const;
  if (type === "CHECKBOX") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="2" width="10" height="10" rx="1.5" />
        <path d="M4.2 7.1l1.9 2 3.7-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "NUMBER" || type === "CURRENCY" || type === "PERCENT") return <span className={className}>#</span>;
  if (type === "SINGLE_SELECT" || type === "MULTI_SELECT") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <path d="M3 4h8M3 7h6M3 10h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "ATTACHMENT") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <path d="M4.2 6.8l3.2-3.2a2 2 0 112.8 2.8L6.3 10.3a2.2 2.2 0 11-3.1-3.1l3.7-3.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "DATE") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="3" width="10" height="9" rx="1.5" />
        <path d="M2 5.5h10M4.5 2v3M9.5 2v3" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className={className}>A</span>;
}

export function GridViewTable({
  containerRef,
  handleScroll,
  rowH,
  table,
  sorts: _sorts,
  filters,
  groups,
  onSortsChange: _onSortsChange,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
  visCols,
  dragOverColId,
  setDragColId,
  setDragOverColId,
  onDragEnd,
  headerPanel,
  setHeaderPanel,
  renamingCol,
  setRenamingCol,
  handleHeaderSortClick,
  deleteColumn,
  renameColumn,
  changeType,
  updateColumnDescription,
  duplicateColumn,
  insertColumnLeft,
  insertColumnRight,
  addOption,
  deleteOption,
  updateOption,
  startResize,
  addingCol,
  setAddingCol,
  showTypePicker,
  setShowTypePicker,
  newColType,
  setNewColType,
  newColName,
  setNewColName,
  handleAddColumn,
  loadedCount,
  topPad,
  bottomPad,
  visItems,
  startIdx,
  rowNumbers,
  isTall,
  editing,
  setEditing,
  openSelectCell,
  setOpenSelectCell,
  handleCellClick,
  getCellValue,
  isSelect,
  safeUpdateCell,
  commitEdit,
  deleteRow,
  addRow,
  tableId,
  chunkLoading,
  trueTotal,
  totalRows,
  recordLabel = "record",
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  rowH: number;
  table: { rowCount: number } | null | undefined;
  sorts: SortRule[];
  filters: FilterCondition[];
  groups: GroupRule[];
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  visCols: Array<{ id: string; name: string; description?: string | null; type: string; width: number; selectOptions?: SelectOption[] }>;
  dragOverColId: string | null;
  setDragColId: (id: string | null) => void;
  setDragOverColId: (id: string | null) => void;
  onDragEnd: () => void;
  headerPanel: HeaderPanel;
  setHeaderPanel: (v: HeaderPanel) => void;
  renamingCol: { id: string; value: string } | null;
  setRenamingCol: (v: { id: string; value: string } | null) => void;
  handleHeaderSortClick: (colId: string) => void;
  deleteColumn: { mutate: (v: { columnId: string }) => void };
  renameColumn: { mutate: (v: { columnId: string; name: string }) => void };
  changeType: { mutate: (v: { columnId: string; type: ColumnType }) => void };
  updateColumnDescription: { mutate: (v: { columnId: string; description: string | null }) => void };
  duplicateColumn: { mutate: (v: { columnId: string; duplicateCells: boolean }) => void };
  insertColumnLeft: { mutate: (v: { tableId: string; anchorColumnId: string; name: string; type: ColumnType }) => void };
  insertColumnRight: { mutate: (v: { tableId: string; anchorColumnId: string; name: string; type: ColumnType }) => void };
  addOption: { mutate: (v: { columnId: string; label: string; color: string }) => void };
  deleteOption: { mutate: (v: { optionId: string }) => void };
  updateOption: { mutate: (v: { optionId: string; label: string; color: string }) => void };
  startResize: (e: React.MouseEvent, colId: string, startW: number) => void;
  addingCol: boolean;
  setAddingCol: (v: boolean) => void;
  showTypePicker: boolean;
  setShowTypePicker: (v: boolean | ((p: boolean) => boolean)) => void;
  newColType: string;
  setNewColType: (v: string) => void;
  newColName: string;
  setNewColName: (v: string) => void;
  handleAddColumn: () => void;
  loadedCount: number;
  topPad: number;
  bottomPad: number;
  visItems: Array<{ kind: "group"; node: { key: string; depth: number; value: string }; totalRows: number } | { kind: "row"; row: RowWithCells }>;
  startIdx: number;
  rowNumbers: Array<number | null>;
  isTall: boolean;
  editing: EditingCell | null;
  setEditing: (v: EditingCell | null | ((p: EditingCell | null) => EditingCell | null)) => void;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  handleCellClick: (row: RowWithCells, col: { id: string; type: string }) => void;
  getCellValue: (row: RowWithCells, columnId: string) => string;
  isSelect: (type: string) => boolean;
  safeUpdateCell: (rowId: string, columnId: string, value: string | null) => void;
  commitEdit: () => void;
  deleteRow: { mutate: (v: { rowId: string }) => void };
  addRow: { mutate: (v: { tableId: string }) => void };
  tableId: string;
  chunkLoading: boolean;
  trueTotal: number;
  totalRows: number;
  recordLabel?: string;
}) {
  const [menuForCol, setMenuForCol] = useState<string | null>(null);
  const [hoveredInfoCol, setHoveredInfoCol] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<{ colId: string; value: string } | null>(null);
  const [fieldTypeListOpen, setFieldTypeListOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ colId: string; name: string; type: string; description: string; showDescription: boolean } | null>(null);
  const [duplicatingField, setDuplicatingField] = useState<{ colId: string; name: string; duplicateCells: boolean } | null>(null);

  const label = (recordLabel || "record").trim() || "record";
  const labelLower = label.toLowerCase();
  const pluralLabel = (n: number) => (n === 1 ? labelLower : (labelLower.endsWith("s") ? labelLower : `${labelLower}s`));

  function openColMenu(colId: string, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuForCol(colId);
  }

  function closeColMenu() {
    setMenuForCol(null);
  }

  function applyFieldEdit() {
    if (!editingField) return;
    renameColumn.mutate({ columnId: editingField.colId, name: editingField.name.trim() || "Field" });
    changeType.mutate({ columnId: editingField.colId, type: editingField.type as ColumnType });
    updateColumnDescription.mutate({
      columnId: editingField.colId,
      description: editingField.showDescription ? (editingField.description.trim() || null) : null,
    });
    setEditingField(null);
  }

  function addFilterFor(colId: string) {
    const next: FilterCondition[] = [
      ...filters,
      { id: uid("f"), columnId: colId, op: "contains", value: "" },
    ];
    onFiltersChange?.(next);
    onRequestOpenFilterPanel?.();
  }

  function addGroupFor(colId: string) {
    if (groups.some((g) => g.columnId === colId)) {
      onRequestOpenGroupPanel?.();
      return;
    }
    const next: GroupRule[] = [
      ...groups,
      { id: uid("g"), columnId: colId, dir: "asc" },
    ];
    onGroupsChange?.(next);
    onRequestOpenGroupPanel?.();
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto select-none bg-white"
      onScroll={handleScroll}
      onClick={() => { setHeaderPanel(null); setOpenSelectCell(null); closeColMenu(); }}
    >
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <thead className="sticky top-0 z-20">
          <tr className="border-b border-[#e2e5e9] bg-[#f9fafb]">
            <th className="w-12 px-3 py-0 text-left bg-[#f9fafb] z-10 border-r border-[#e2e5e9]">
              <div className="flex items-center" style={{ height: rowH }}>
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 hover:opacity-100" />
              </div>
            </th>

            {visCols.map((col) => {
              const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
              const isCurrentPanel = headerPanel?.colId === col.id;

              return (
                <th
                  key={col.id}
                  style={{ width: col.width, minWidth: col.width }}
                  className={`relative px-0 py-0 text-left group/col border-r border-[#e2e5e9] bg-[#f9fafb] ${dragOverColId === col.id ? "bg-[#e8f5f1]" : ""}`}
                  draggable
                  onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }}
                  onDragEnd={onDragEnd}
                >
                  <div className="flex items-center px-2 gap-1.5" style={{ height: rowH }}>
                    <span className="text-[#111827] text-[16px] leading-none flex-shrink-0" title={ft.label}>
                      <FieldTypeIcon type={col.type} />
                    </span>

                    {isSelect(col.type) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHeaderPanel(isCurrentPanel && headerPanel?.panel === "options" ? null : { colId: col.id, panel: "options" });
                        }}
                        className="text-[#9ca3af] hover:text-[#166254] text-[11px] transition-colors flex-shrink-0"
                        title="Manage options"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M1 2.5h10M2.5 6h7M4 9.5h4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}

                    {renamingCol?.id === col.id ? (
                      <input
                        autoFocus
                        className="bg-transparent border-b-2 border-[#166254] px-1 text-xs outline-none flex-1 min-w-0 text-[#1f2937]"
                        value={renamingCol.value}
                        onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                        onBlur={() => { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameColumn.mutate({ columnId: col.id, name: renamingCol.value.trim() || col.name }); setRenamingCol(null); }
                          if (e.key === "Escape") setRenamingCol(null);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => handleHeaderSortClick(col.id)}
                        onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                        className="flex-1 min-w-0 text-left text-[13px] font-medium text-[#111827] hover:text-[#1f2937] truncate"
                        title="Click to sort, double-click to rename"
                      >
                        {col.name}
                      </button>
                    )}

                    {!!col.description && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDescription({ colId: col.id, value: col.description ?? "" });
                          }}
                          onMouseEnter={() => setHoveredInfoCol(col.id)}
                          onMouseLeave={() => setHoveredInfoCol((prev) => (prev === col.id ? null : prev))}
                          className="text-[#9ca3af] hover:text-[#6b7280]"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                            <circle cx="7" cy="7" r="5.5" />
                            <path d="M7 6v3M7 4.2h.01" strokeLinecap="round" />
                          </svg>
                        </button>
                        {hoveredInfoCol === col.id && (
                          <div className="absolute top-full right-0 mt-1 bg-[#2f3542] text-white text-[13px] px-2 py-1 rounded-[4px] whitespace-nowrap z-50">
                            {col.description}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); openColMenu(col.id, e); }}
                      className="opacity-0 group-hover/col:opacity-100 text-[#9ca3af] hover:text-[#6b7280] text-xs flex-shrink-0 transition-all p-0.5 rounded hover:bg-[#eef0f3]"
                      title="Field actions"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {isCurrentPanel && headerPanel?.panel === "type" && (
                    <FieldTypePicker current={col.type} onSelect={(t) => { changeType.mutate({ columnId: col.id, type: t as ColumnType }); setHeaderPanel(null); }} />
                  )}
                  {isCurrentPanel && headerPanel?.panel === "options" && (
                    <OptionsPanel
                      columnId={col.id}
                      options={col.selectOptions ?? []}
                      onAdd={(label, color) => addOption.mutate({ columnId: col.id, label, color })}
                      onDelete={(id) => deleteOption.mutate({ optionId: id })}
                      onUpdate={(id, label, color) => updateOption.mutate({ optionId: id, label, color })}
                    />
                  )}

                  {menuForCol === col.id && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 w-[320px] max-h-[168px] overflow-y-auto bg-white border border-[#d8d8d8] rounded-[8px] shadow-lg py-1.5 text-[13px] font-normal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { label: "Edit field", icon: "✎", onClick: () => { setEditingField({ colId: col.id, name: col.name, type: col.type, description: col.description ?? "", showDescription: !!col.description }); setFieldTypeListOpen(false); closeColMenu(); } },
                        { label: "Duplicate field", icon: "⧉", onClick: () => { setDuplicatingField({ colId: col.id, name: col.name, duplicateCells: true }); closeColMenu(); } },
                        { divider: true },
                        { label: "Insert left", icon: "←", onClick: () => { insertColumnLeft.mutate({ tableId, anchorColumnId: col.id, name: "New field", type: "TEXT" }); closeColMenu(); } },
                        { label: "Insert right", icon: "→", onClick: () => { insertColumnRight.mutate({ tableId, anchorColumnId: col.id, name: "New field", type: "TEXT" }); closeColMenu(); } },
                        { divider: true },
                        { label: "Copy field URL", icon: "⟲", onClick: () => { void navigator.clipboard?.writeText(`${window.location.href}#field-${col.id}`); closeColMenu(); } },
                        { label: "Edit field description", icon: "ⓘ", onClick: () => { setEditingDescription({ colId: col.id, value: col.description ?? "" }); closeColMenu(); } },
                        { label: "Edit field permissions", icon: "⌂", onClick: () => closeColMenu() },
                        { divider: true },
                        { label: "Sort  A -> Z", icon: "↕", onClick: () => { onRequestOpenSortPanel?.(); closeColMenu(); } },
                        { label: "Sort  Z -> A", icon: "↕", onClick: () => { onRequestOpenSortPanel?.(); closeColMenu(); } },
                        { divider: true },
                        { label: "Filter by this field", icon: "≡", onClick: () => { addFilterFor(col.id); closeColMenu(); } },
                        { label: "Group by this field", icon: "▦", onClick: () => { addGroupFor(col.id); closeColMenu(); } },
                        { divider: true },
                        { label: "Hide field", icon: "⊘", onClick: () => closeColMenu() },
                        { label: "Delete field", icon: "⌫", danger: true, onClick: () => { deleteColumn.mutate({ columnId: col.id }); closeColMenu(); } },
                      ].map((item, idx) => item.divider ? (
                        <div key={`dd-${idx}`} className="h-px bg-[#ececec] my-1 mx-3" />
                      ) : (
                        <button
                          key={`${item.label}-${idx}`}
                          onClick={item.onClick}
                          className={`w-full px-4 py-2 text-left inline-flex items-center gap-2 font-normal ${item.danger ? "text-[#d71a5f]" : "text-[#1f2937]"} hover:bg-[#f5f7fa]`}
                        >
                          <span className="w-4 inline-flex justify-center font-normal">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#166254]/40 transition-colors z-10" onMouseDown={(e) => startResize(e, col.id, col.width)} />
                </th>
              );
            })}

            <th className="px-2 py-0 text-left w-24 bg-[#f9fafb]">
              {addingCol ? (
                <div className="flex items-center gap-1" style={{ height: rowH, minWidth: 240 }}>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowTypePicker((p) => !p); }} className="text-xs px-1.5 py-1 rounded border border-[#e2e5e9] bg-white hover:bg-[#f5f6f8] text-[#4b5563] transition-colors">
                      <FieldTypeIcon type={newColType} />
                    </button>
                    {showTypePicker && (
                      <FieldTypePicker current={newColType} onSelect={(t) => { setNewColType(t); setShowTypePicker(false); }} />
                    )}
                  </div>
                  <input
                    autoFocus
                    className="border border-[#166254] rounded-lg px-2 py-1 text-xs outline-none flex-1 bg-white text-[#1f2937] placeholder-[#9ca3af]"
                    placeholder="Name..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setAddingCol(false); setShowTypePicker(false); }
                    }}
                  />
                  <button onClick={handleAddColumn} className="px-2 py-1 bg-[#166254] text-white rounded-lg text-xs hover:bg-[#124f43] transition-colors">Add</button>
                  <button onClick={() => { setAddingCol(false); setShowTypePicker(false); }} className="text-[#9ca3af] text-xs hover:text-[#6b7280] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)} className="flex items-center gap-1 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f0f1f3] transition-colors w-full text-xs" style={{ height: rowH }} title="Add field">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 ml-2" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M2 6h8" strokeLinecap="round" /></svg>
                </button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {loadedCount === 0 && (
            <tr>
              <td colSpan={visCols.length + 2} className="px-4 py-8 text-center text-xs text-[#9ca3af]">No {pluralLabel(2)} match the current filters.</td>
            </tr>
          )}

          {topPad > 0 && (
            <tr aria-hidden="true" style={{ height: topPad }}><td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }} /></tr>
          )}

          {visItems.map((item, vi) => {
            const absIdx = startIdx + vi;
            if (item.kind === "group") {
              const { node, totalRows } = item;
              const depth = Math.min(node.depth, GROUP_DEPTH_COLORS.length - 1);
              const colors = GROUP_DEPTH_COLORS[depth]!;
              return (
                <tr key={node.key} style={{ background: colors.bg }}>
                  <td colSpan={visCols.length + 2} className="border-b border-t" style={{ borderColor: colors.border, paddingLeft: `${node.depth * 16 + 12}px`, paddingTop: "6px", paddingBottom: "6px" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                      <span className="text-[11px] font-semibold" style={{ color: colors.text }}>{node.value}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: colors.border, color: colors.text }}>{totalRows}</span>
                    </div>
                  </td>
                </tr>
              );
            }

            const { row } = item;
            const rowNum = rowNumbers[absIdx] ?? absIdx + 1;

            return (
              <tr key={row.id} className="border-b border-[#e2e5e9] hover:bg-[#f9fafb] group transition-colors" style={{ height: rowH }}>
                <td className="px-3 py-0 sticky left-0 bg-white group-hover:bg-[#f9fafb] transition-colors border-r border-[#e2e5e9] z-10">
                  <div className="flex items-center gap-1" style={{ height: rowH }}>
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[11px] text-[#9ca3af] select-none group-hover:hidden w-4 text-right">{rowNum}</span>
                  </div>
                </td>

                {visCols.map((col) => {
                  const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                  const value = getCellValue(row, col.id);
                  return (
                    <td key={col.id} style={{ width: col.width, maxWidth: col.width, height: rowH }} className="px-2 py-0 border-r border-[#e2e5e9] overflow-visible" onClick={() => handleCellClick(row, col)}>
                      <div className={`flex ${isTall ? "items-start pt-1.5" : "items-center"}`} style={{ height: rowH }}>
                        {col.type === "CHECKBOX" ? (
                          <input type="checkbox" readOnly checked={value === "true"} className="w-3.5 h-3.5 rounded accent-[#166254] cursor-pointer" />
                        ) : isSelect(col.type) ? (
                          <SelectCell cellId={`${row.id}-${col.id}`} openSelectCell={openSelectCell} setOpenSelectCell={setOpenSelectCell} value={value} options={col.selectOptions ?? []} multi={col.type === "MULTI_SELECT"} onSelect={(v) => safeUpdateCell(row.id, col.id, v || null)} />
                        ) : col.type === "ATTACHMENT" ? (
                          <AttachmentCell value={value} onUpload={(url) => safeUpdateCell(row.id, col.id, url)} />
                        ) : isEditing ? (
                          <input
                            autoFocus
                            className="border-2 border-[#166254] rounded px-2 py-0.5 w-full outline-none text-xs bg-white text-[#1f2937] shadow-sm"
                            value={editing.value}
                            type={inputTypeForField(col.type)}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          <span className={`cursor-pointer text-xs transition-colors ${isTall ? "whitespace-normal break-words line-clamp-4" : "block truncate"} ${value ? "text-[#1f2937] hover:text-[#166254]" : "text-[#d1d5db]"}`}>
                            {formatCellValue(value, col.type) || ""}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="w-8 px-1">
                  <button onClick={() => deleteRow.mutate({ rowId: row.id })} className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 text-xs p-1 transition-all rounded hover:bg-red-50" title="Delete row">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" /></svg>
                  </button>
                </td>
              </tr>
            );
          })}

          {bottomPad > 0 && (
            <tr aria-hidden="true" style={{ height: bottomPad }}><td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }} /></tr>
          )}
        </tbody>
      </table>

      <div className="border-b border-[#e2e5e9]">
        <button onClick={() => addRow.mutate({ tableId })} className="flex items-center gap-2 px-4 py-2 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f9fafb] transition-colors w-full text-xs" title={`Add ${labelLower}`}>
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M2 6h8" strokeLinecap="round" /></svg>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#ccc]">
            {chunkLoading && (
              <span className="flex items-center gap-1 text-[#f97316]">
                <span className="w-2 h-2 border border-[#f97316] border-t-transparent rounded-full animate-spin inline-block" />
                Loading {loadedCount.toLocaleString()} / {(table?.rowCount ?? 0).toLocaleString()}...
              </span>
            )}
            {!chunkLoading && trueTotal > 0 && <span>{trueTotal.toLocaleString()} {pluralLabel(trueTotal)}</span>}
          </span>
        </button>
      </div>

      <div className="sticky bottom-0 left-0 z-10 w-fit px-2 py-1 pointer-events-none">
        <span className="inline-flex items-center rounded-sm bg-[#d9edd9] text-[#1d1f25] text-[11px] leading-[1] px-[8px] py-[3px]">
          {(Number.isFinite(totalRows) ? totalRows : 0).toLocaleString()} {pluralLabel(Number.isFinite(totalRows) ? totalRows : 0)}
        </span>
      </div>

      {editingField && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => { setEditingField(null); setFieldTypeListOpen(false); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[400px] bg-white border border-[#ddd] rounded-[8px] p-5">
            <div className="space-y-3">
              <input value={editingField.name} onChange={(e) => setEditingField({ ...editingField, name: e.target.value })} className="w-full border border-[#d8d8d8] rounded-[10px] h-10 px-3 text-[14px] text-[#1f2937]" />
              <div className="relative">
                <button onClick={() => setFieldTypeListOpen((p) => !p)} className="w-full h-10 border border-[#d8d8d8] rounded-[10px] px-3 text-left text-[14px] text-[#1f2937] flex items-center justify-between">
                  <span className="inline-flex items-center gap-2"><FieldTypeIcon type={editingField.type} /> {FIELD_TYPES[editingField.type]?.label ?? "Single line text"}</span>
                  <span className="text-[#888]">v</span>
                </button>
                {fieldTypeListOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-full bg-white border border-[#d8d8d8] rounded-[8px] p-2">
                    <input placeholder="Find a field type" className="w-full h-9 border border-[#d8d8d8] rounded-[8px] px-3 text-[13px] mb-2 outline-none" />
                    <div className="h-[168px] overflow-y-auto text-[13px]">
                      {Object.entries(FIELD_TYPES).map(([typeKey, meta]) => (
                        <button
                          key={typeKey}
                          onClick={() => { setEditingField({ ...editingField, type: typeKey }); setFieldTypeListOpen(false); }}
                          className={`w-full h-9 px-2 rounded-[6px] text-left flex items-center gap-2 ${editingField.type === typeKey ? "bg-[#eef3ff]" : "hover:bg-[#f7f7f7]"}`}
                        >
                          <FieldTypeIcon type={typeKey} />
                          <span>{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[13px] text-[#666]">Enter text.</p>

              {editingField.showDescription ? (
                <div className="pt-2">
                  <label className="block text-[16px] text-[#666] mb-2">Description</label>
                  <input value={editingField.description} onChange={(e) => setEditingField({ ...editingField, description: e.target.value })} placeholder="Describe this field (optional)" className="w-full border border-[#d8d8d8] rounded-[10px] h-10 px-3 text-[14px] text-[#1f2937]" />
                </div>
              ) : (
                <button onClick={() => setEditingField({ ...editingField, showDescription: true })} className="text-[14px] text-[#374151]">+  Add description</button>
              )}

              <div className="flex items-center justify-end gap-5 pt-2">
                <button onClick={() => { setEditingField(null); setFieldTypeListOpen(false); }} className="text-[14px] text-[#374151]">Cancel</button>
                <button onClick={applyFieldEdit} className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[14px] font-semibold px-5 h-10 rounded-[10px]">Save</button>
              </div>
            </div>
          </div>
        </>
      )}

      {duplicatingField && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => setDuplicatingField(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[460px] bg-white rounded-[8px]" style={{ padding: 32 }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-[#24292f]">Duplicate {duplicatingField.name}</h3>
              <button onClick={() => setDuplicatingField(null)} className="text-[#666] hover:text-[#222] text-[18px]">x</button>
            </div>
            <label className="flex items-center gap-3 mb-8 text-[13px] text-[#2e3338] cursor-pointer">
              <input type="checkbox" checked={duplicatingField.duplicateCells} onChange={(e) => setDuplicatingField({ ...duplicatingField, duplicateCells: e.target.checked })} className="w-4 h-4 accent-[#16a34a]" />
              Duplicate cells
            </label>
            <div className="flex justify-end gap-4">
              <button onClick={() => setDuplicatingField(null)} className="text-[14px] text-[#333] px-3 h-10">Cancel</button>
              <button
                onClick={() => {
                  duplicateColumn.mutate({ columnId: duplicatingField.colId, duplicateCells: duplicatingField.duplicateCells });
                  setDuplicatingField(null);
                }}
                className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[14px] font-semibold px-4 h-10 rounded-[10px]"
              >
                Duplicate field
              </button>
            </div>
          </div>
        </>
      )}

      {editingDescription && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setEditingDescription(null)} />
          <div className="fixed left-1/2 top-[200px] -translate-x-1/2 z-[60] w-[306px] bg-white border border-[#d8d8d8] rounded-[6px] shadow-lg p-2">
            <input
              autoFocus
              value={editingDescription.value}
              onChange={(e) => setEditingDescription({ ...editingDescription, value: e.target.value })}
              className="w-full h-12 border border-[#b9b9b9] rounded-[2px] px-3 text-[13px] text-[#1f2937]"
            />
            <div className="flex items-center justify-end gap-3 mt-3">
              <button onClick={() => setEditingDescription(null)} className="text-[13px] text-[#374151] px-2">Cancel</button>
              <button
                onClick={() => {
                  updateColumnDescription.mutate({ columnId: editingDescription.colId, description: editingDescription.value.trim() || null });
                  setEditingDescription(null);
                }}
                className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[13px] font-semibold px-3 h-10 rounded-[10px]"
              >
                Save description
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
