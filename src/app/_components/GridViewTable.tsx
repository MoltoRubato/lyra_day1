import { formatCellValue, inputTypeForField, FIELD_TYPES, type RowWithCells, type SortRule } from "~/app/_components/tableUtils";
import { AttachmentCell, FieldTypePicker, OptionsPanel, SelectCell, type SelectOption } from "~/app/_components/gridViewCells";

type EditingCell = { rowId: string; columnId: string; value: string };

const GROUP_DEPTH_COLORS = [
  { bg: "#f0f4f8", text: "#374151", border: "#e2e8f0", dot: "#6b7280" },
  { bg: "#f5f3ff", text: "#5b21b6", border: "#ede9fe", dot: "#8b5cf6" },
  { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", dot: "#f97316" },
];

export function GridViewTable({
  containerRef,
  handleScroll,
  rowH,
  table,
  sorts,
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
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  rowH: number;
  table: { rowCount: number } | null | undefined;
  sorts: SortRule[];
  visCols: Array<{ id: string; name: string; type: string; width: number; selectOptions?: SelectOption[] }>;
  dragOverColId: string | null;
  setDragColId: (id: string | null) => void;
  setDragOverColId: (id: string | null) => void;
  onDragEnd: () => void;
  headerPanel: { colId: string; panel: "type" | "options" } | null;
  setHeaderPanel: (v: { colId: string; panel: "type" | "options" } | null) => void;
  renamingCol: { id: string; value: string } | null;
  setRenamingCol: (v: { id: string; value: string } | null) => void;
  handleHeaderSortClick: (colId: string) => void;
  deleteColumn: { mutate: (v: { columnId: string }) => void };
  renameColumn: { mutate: (v: { columnId: string; name: string }) => void };
  changeType: { mutate: (v: { columnId: string; type: string }) => void };
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
  rowNumbers: number[];
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
}) {
  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto select-none bg-white"
      onScroll={handleScroll}
      onClick={() => { setHeaderPanel(null); setOpenSelectCell(null); }}
    >
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <thead className="sticky top-0 z-20">
          <tr className="border-b border-[#e2e5e9] bg-[#f9fafb]">
            <th className="w-12 px-3 py-0 text-left bg-[#f9fafb] z-10 border-r border-[#e2e5e9]">
              <div className="flex items-center" style={{ height: rowH }}>
                <input type="checkbox"
                  className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 hover:opacity-100"/>
              </div>
            </th>

            {visCols.map((col) => {
              const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
              const isCurrentPanel = headerPanel?.colId === col.id;
              const sortForCol = sorts.find((s) => s.columnId === col.id);
              return (
                <th key={col.id} style={{ width: col.width, minWidth: col.width }}
                  className={`relative px-0 py-0 text-left group/col border-r border-[#e2e5e9] bg-[#f9fafb] ${
                    dragOverColId === col.id ? "bg-[#e8f5f1]" : ""
                  }`}
                  draggable
                  onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }}
                  onDragEnd={onDragEnd}>

                  <div className="flex items-center px-2 gap-1.5" style={{ height: rowH }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeaderPanel(isCurrentPanel && headerPanel?.panel === "type" ? null : { colId: col.id, panel: "type" });
                      }}
                      className="text-[#9ca3af] hover:text-[#166254] text-xs transition-colors flex-shrink-0"
                      title="Change field type">
                      {ft.icon}
                    </button>

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
                        onClick={() => handleHeaderSortClick(col.id)}
                        onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                        className="flex-1 min-w-0 text-left text-[11px] font-medium text-[#4b5563] hover:text-[#1f2937] truncate"
                        title="Click to sort · Double-click to rename">
                        {col.name}
                        {sortForCol && (
                          <span className="text-[#166254] ml-1 text-[10px]">
                            {sortForCol.dir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                        {sortForCol && sorts.length > 1 && (
                          <span className="text-[#9ca3af] ml-0.5 text-[9px]">
                            {sorts.indexOf(sortForCol) + 1}
                          </span>
                        )}
                      </button>
                    )}

                    <button onClick={() => deleteColumn.mutate({ columnId: col.id })}
                      className="opacity-0 group-hover/col:opacity-100 text-[#9ca3af] hover:text-red-500 text-xs flex-shrink-0 transition-all p-0.5 rounded hover:bg-red-50">✕</button>
                  </div>

                  {isCurrentPanel && headerPanel?.panel === "type" && (
                    <FieldTypePicker current={col.type}
                      onSelect={(t) => { changeType.mutate({ columnId: col.id, type: t }); setHeaderPanel(null); }}/>
                  )}
                  {isCurrentPanel && headerPanel?.panel === "options" && (
                    <OptionsPanel
                      columnId={col.id}
                      options={col.selectOptions ?? []}
                      onAdd={(label, color) => addOption.mutate({ columnId: col.id, label, color })}
                      onDelete={(id) => deleteOption.mutate({ optionId: id })}
                      onUpdate={(id, label, color) => updateOption.mutate({ optionId: id, label, color })}/>
                  )}

                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#166254]/40 transition-colors z-10"
                    onMouseDown={(e) => startResize(e, col.id, col.width)}/>
                </th>
              );
            })}

            <th className="px-2 py-0 text-left w-24 bg-[#f9fafb]">
              {addingCol ? (
                <div className="flex items-center gap-1" style={{ height: rowH, minWidth: 240 }}>
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
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setAddingCol(false); setShowTypePicker(false); }
                    }}/>
                  <button onClick={handleAddColumn}
                    className="px-2 py-1 bg-[#166254] text-white rounded-lg text-xs hover:bg-[#124f43] transition-colors">Add</button>
                  <button onClick={() => { setAddingCol(false); setShowTypePicker(false); }}
                    className="text-[#9ca3af] text-xs hover:text-[#6b7280] transition-colors">✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)}
                  className="flex items-center gap-1 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f0f1f3] transition-colors w-full text-xs"
                  style={{ height: rowH }}
                  title="Add field">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 ml-2" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
                  </svg>
                  Add field
                </button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {loadedCount === 0 && (
            <tr>
              <td colSpan={visCols.length + 2} className="px-4 py-8 text-center text-xs text-[#9ca3af]">
                No records match the current filters.
              </td>
            </tr>
          )}

          {topPad > 0 && (
            <tr aria-hidden="true" style={{ height: topPad }}>
              <td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }}/>
            </tr>
          )}

          {visItems.map((item, vi) => {
            const absIdx = startIdx + vi;

            if (item.kind === "group") {
              const { node, totalRows } = item;
              const depth = Math.min(node.depth, GROUP_DEPTH_COLORS.length - 1);
              const colors = GROUP_DEPTH_COLORS[depth]!;
              return (
                <tr key={node.key} style={{ background: colors.bg }}>
                  <td colSpan={visCols.length + 2}
                    className="border-b border-t"
                    style={{
                      borderColor: colors.border,
                      paddingLeft: `${node.depth * 16 + 12}px`,
                      paddingTop: "6px",
                      paddingBottom: "6px",
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }}/>
                      <span className="text-[11px] font-semibold" style={{ color: colors.text }}>
                        {node.value}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: colors.border, color: colors.text }}>
                        {totalRows}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            }

            const { row } = item;
            const rowNum = rowNumbers[absIdx] ?? absIdx + 1;

            return (
              <tr key={row.id}
                className="border-b border-[#e2e5e9] hover:bg-[#f9fafb] group transition-colors"
                style={{ height: rowH }}>

                <td className="px-3 py-0 sticky left-0 bg-white group-hover:bg-[#f9fafb] transition-colors border-r border-[#e2e5e9] z-10">
                  <div className="flex items-center gap-1" style={{ height: rowH }}>
                    <input type="checkbox"
                      className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#166254] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"/>
                    <span className="text-[11px] text-[#9ca3af] select-none group-hover:hidden w-4 text-right">
                      {rowNum}
                    </span>
                  </div>
                </td>

                {visCols.map((col) => {
                  const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                  const value = getCellValue(row, col.id);
                  return (
                    <td key={col.id}
                      style={{ width: col.width, maxWidth: col.width, height: rowH }}
                      className="px-2 py-0 border-r border-[#e2e5e9] overflow-visible"
                      onClick={() => handleCellClick(row, col)}>

                      <div className={`flex ${isTall ? "items-start pt-1.5" : "items-center"}`} style={{ height: rowH }}>

                        {col.type === "CHECKBOX" ? (
                          <input type="checkbox" readOnly checked={value === "true"}
                            className="w-3.5 h-3.5 rounded accent-[#166254] cursor-pointer"/>

                        ) : isSelect(col.type) ? (
                          <SelectCell
                            cellId={`${row.id}-${col.id}`}
                            openSelectCell={openSelectCell}
                            setOpenSelectCell={setOpenSelectCell}
                            value={value}
                            options={col.selectOptions ?? []}
                            multi={col.type === "MULTI_SELECT"}
                            onSelect={(v) => safeUpdateCell(row.id, col.id, v || null)}/>

                        ) : col.type === "ATTACHMENT" ? (
                          <AttachmentCell value={value}
                            onUpload={(url) => safeUpdateCell(row.id, col.id, url)}/>

                        ) : isEditing ? (
                          <input autoFocus
                            className="border-2 border-[#166254] rounded px-2 py-0.5 w-full outline-none text-xs bg-white text-[#1f2937] shadow-sm"
                            value={editing.value}
                            type={inputTypeForField(col.type)}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}/>

                        ) : (
                          <span
                            className={`cursor-pointer text-xs transition-colors ${
                              isTall
                                ? "whitespace-normal break-words line-clamp-4"
                                : "block truncate"
                            } ${value ? "text-[#1f2937] hover:text-[#166254]" : "text-[#d1d5db]"}`}>
                            {formatCellValue(value, col.type) || ""}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="w-8 px-1">
                  <button onClick={() => deleteRow.mutate({ rowId: row.id })}
                    className="opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-red-500 text-xs p-1 transition-all rounded hover:bg-red-50">✕</button>
                </td>
              </tr>
            );
          })}

          {bottomPad > 0 && (
            <tr aria-hidden="true" style={{ height: bottomPad }}>
              <td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }}/>
            </tr>
          )}
        </tbody>
      </table>

      <div className="border-b border-[#e2e5e9]">
        <button onClick={() => addRow.mutate({ tableId })}
          className="flex items-center gap-2 px-4 py-2 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f9fafb] transition-colors w-full text-xs">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2v8M2 6h8" strokeLinecap="round"/>
          </svg>
          Add record
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#ccc]">
            {chunkLoading && (
              <span className="flex items-center gap-1 text-[#f97316]">
                <span className="w-2 h-2 border border-[#f97316] border-t-transparent rounded-full animate-spin inline-block"/>
                Loading {loadedCount.toLocaleString()} / {(table?.rowCount ?? 0).toLocaleString()}…
              </span>
            )}
            {!chunkLoading && trueTotal > 0 && (
              <span>{trueTotal.toLocaleString()} rows</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
