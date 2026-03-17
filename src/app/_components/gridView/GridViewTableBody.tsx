import { AttachmentCell, SelectCell } from "~/app/_components/gridViewCells";
import {
  formatCellValue,
  inputTypeForField,
  type RowWithCells,
} from "~/app/_components/tableUtils";
import { GROUP_DEPTH_COLORS } from "~/app/_components/gridView/tableShared";
import type {
  EditingCell,
  SummaryOption,
  VisibleColumn,
  VisibleItem,
} from "~/app/_components/gridView/tableTypes";

type GridViewTableBodyProps = {
  rowH: number;
  table: { rowCount: number } | null | undefined;
  visCols: VisibleColumn[];
  loadedCount: number;
  topPad: number;
  bottomPad: number;
  visItems: VisibleItem[];
  startIdx: number;
  rowNumbers: Array<number | null>;
  isTall: boolean;
  editing: EditingCell | null;
  setEditing: (
    v: EditingCell | null | ((p: EditingCell | null) => EditingCell | null)
  ) => void;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  handleCellClick: (row: RowWithCells, col: { id: string; type: string }) => void;
  getCellValue: (row: RowWithCells, columnId: string) => string;
  isSelect: (type: string) => boolean;
  safeUpdateCell: (rowId: string, columnId: string, value: string | null) => void;
  commitEdit: () => void;
  addRow: { mutate: (v: { tableId: string }) => void };
  tableId: string;
  chunkLoading: boolean;
  allRowsForSummary: RowWithCells[];
  labelLower: string;
  pluralLabel: (n: number) => string;
  selectedSet: Set<string>;
  dragRowId: string | null;
  setDragRowId: (id: string | null) => void;
  dragOverRowId: string | null;
  setDragOverRowId: (id: string | null) => void;
  canReorderRows: boolean;
  handleRowDrop: (targetRowId: string) => void;
  toggleRowSelection: (rowId: string) => void;
  openRowContextMenu: (e: React.MouseEvent, rowId: string) => void;
  summaryByCol: Record<string, SummaryOption>;
  hoveredSummaryCol: string | null;
  setHoveredSummaryCol: (
    v: string | null | ((prev: string | null) => string | null),
  ) => void;
  summaryMenu: { colId: string; left: number; top: number } | null;
  setSummaryMenu: (
    v:
      | { colId: string; left: number; top: number }
      | null
      | ((
          prev: { colId: string; left: number; top: number } | null,
        ) => { colId: string; left: number; top: number } | null),
  ) => void;
  setRowContextMenu: (v: { x: number; y: number } | null) => void;
  totalRows: number;
  summaryRowHeightPx: number;
  summaryBottomOffsetPx: number;
};

function summaryResult(
  colId: string,
  summaryByCol: Record<string, SummaryOption>,
  allRowsForSummary: RowWithCells[],
  getCellValue: (row: RowWithCells, columnId: string) => string,
): { label: string; value: string } | null {
  const mode = summaryByCol[colId] ?? "None";
  if (mode === "None") return null;

  const total = allRowsForSummary.length;
  const values = allRowsForSummary.map((row) => (getCellValue(row, colId) ?? "").trim());
  const emptyCount = values.filter((v) => v.length === 0).length;
  const filledCount = total - emptyCount;
  const uniqueCount = new Set(values.filter((v) => v.length > 0)).size;
  const percent = (count: number) => `${Math.round((count / Math.max(1, total)) * 100)}%`;

  if (mode === "Empty") return { label: "Empty", value: emptyCount.toLocaleString() };
  if (mode === "Filled") return { label: "Filled", value: filledCount.toLocaleString() };
  if (mode === "Unique") return { label: "Unique", value: uniqueCount.toLocaleString() };
  if (mode === "Percent Empty") {
    return { label: "Percent Empty", value: percent(emptyCount) };
  }
  if (mode === "Percent Filled") {
    return { label: "Percent Filled", value: percent(filledCount) };
  }
  return { label: "Percent Unique", value: percent(uniqueCount) };
}

export function GridViewTableBody({
  rowH,
  table,
  visCols,
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
  addRow,
  tableId,
  chunkLoading,
  allRowsForSummary,
  labelLower,
  pluralLabel,
  selectedSet,
  dragRowId,
  setDragRowId,
  dragOverRowId,
  setDragOverRowId,
  canReorderRows,
  handleRowDrop,
  toggleRowSelection,
  openRowContextMenu,
  summaryByCol,
  hoveredSummaryCol,
  setHoveredSummaryCol,
  summaryMenu,
  setSummaryMenu,
  setRowContextMenu,
  totalRows,
  summaryRowHeightPx,
  summaryBottomOffsetPx,
}: GridViewTableBodyProps) {
  return (
    <>
      <tbody>
        {loadedCount === 0 && (
          <tr>
            <td colSpan={visCols.length + 2} className="px-4 py-8 text-center text-xs text-[#9ca3af]">
              No {pluralLabel(2)} match the current filters.
            </td>
          </tr>
        )}

        {topPad > 0 && (
          <tr aria-hidden="true" style={{ height: topPad }}>
            <td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }} />
          </tr>
        )}

        {visItems.map((item, vi) => {
          const absIdx = startIdx + vi;
          if (item.kind === "group") {
            const { node, totalRows: groupedRows } = item;
            const depth = Math.min(node.depth, GROUP_DEPTH_COLORS.length - 1);
            const colors = GROUP_DEPTH_COLORS[depth]!;
            return (
              <tr key={node.key} style={{ background: colors.bg }}>
                <td
                  colSpan={visCols.length + 2}
                  className="border-b border-t"
                  style={{
                    borderColor: colors.border,
                    paddingLeft: `${node.depth * 16 + 12}px`,
                    paddingTop: "6px",
                    paddingBottom: "6px",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
                    <span className="text-[11px] font-semibold" style={{ color: colors.text }}>
                      {node.value}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: colors.border, color: colors.text }}
                    >
                      {groupedRows}
                    </span>
                  </div>
                </td>
              </tr>
            );
          }

          const { row } = item;
          const rowNum = rowNumbers[absIdx] ?? absIdx + 1;
          const rowSelected = selectedSet.has(row.id);

          return (
            <tr
              key={row.id}
              className={`border-b border-[#e2e5e9] group transition-colors ${rowSelected ? "bg-[#dfe5ef]" : "hover:bg-[#f9fafb]"} ${dragOverRowId === row.id ? "ring-1 ring-inset ring-[#1c76d2]" : ""}`}
              style={{ height: rowH }}
              onContextMenu={(e) => openRowContextMenu(e, row.id)}
              onDragOver={(e) => {
                if (!canReorderRows || !dragRowId) return;
                e.preventDefault();
                setDragOverRowId(row.id);
              }}
              onDrop={(e) => {
                if (!canReorderRows || !dragRowId) return;
                e.preventDefault();
                handleRowDrop(row.id);
                setDragRowId(null);
                setDragOverRowId(null);
              }}
            >
              <td
                className={`px-2 py-0 sticky left-0 transition-colors border-r border-[#e2e5e9] z-10 ${rowSelected ? "bg-[#dfe5ef]" : "bg-white group-hover:bg-[#f9fafb]"}`}
              >
                <div className="flex items-center gap-1.5" style={{ height: rowH }}>
                  <button
                    draggable={canReorderRows}
                    onDragStart={(e) => {
                      if (!canReorderRows) return;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", row.id);
                      setDragRowId(row.id);
                    }}
                    onDragEnd={() => {
                      setDragRowId(null);
                      setDragOverRowId(null);
                    }}
                    className={`w-3 h-3 grid grid-cols-2 gap-[2px] place-items-center text-[#7c8494] ${rowSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${canReorderRows ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-20"}`}
                    title={
                      canReorderRows
                        ? "Drag to reorder row"
                        : "Disable sort/filter/group to reorder rows"
                    }
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="w-[2px] h-[2px] rounded-full bg-current" />
                    ))}
                  </button>
                  <div className="relative h-4 w-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={rowSelected}
                      onChange={() => toggleRowSelection(row.id)}
                      className={`absolute inset-0 m-auto h-3.5 w-3.5 rounded border-[#d1d5db] accent-[#1c76d2] cursor-pointer transition-opacity ${rowSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    />
                    <span
                      className={`pointer-events-none absolute inset-0 text-[11px] text-[#68707f] select-none text-right leading-4 ${rowSelected ? "opacity-0" : "opacity-100 group-hover:opacity-0"}`}
                    >
                      {rowNum}
                    </span>
                  </div>
                </div>
              </td>

              {visCols.map((col) => {
                const isEditing = editing?.rowId === row.id && editing.columnId === col.id;
                const value = getCellValue(row, col.id);
                return (
                  <td
                    key={col.id}
                    style={{ width: col.width, maxWidth: col.width, height: rowH }}
                    className={`px-2 py-0 border-r border-[#e2e5e9] overflow-visible ${rowSelected ? "bg-[#dfe5ef]" : ""}`}
                    onClick={() => handleCellClick(row, col)}
                    onContextMenu={(e) => openRowContextMenu(e, row.id)}
                  >
                    <div className={`flex ${isTall ? "items-start pt-1.5" : "items-center"}`} style={{ height: rowH }}>
                      {col.type === "CHECKBOX" ? (
                        <input
                          type="checkbox"
                          readOnly
                          checked={value === "true"}
                          className="w-3.5 h-3.5 rounded accent-[#166254] cursor-pointer"
                        />
                      ) : isSelect(col.type) ? (
                        <SelectCell
                          cellId={`${row.id}-${col.id}`}
                          openSelectCell={openSelectCell}
                          setOpenSelectCell={setOpenSelectCell}
                          value={value}
                          options={col.selectOptions ?? []}
                          multi={col.type === "MULTI_SELECT"}
                          onSelect={(v) => safeUpdateCell(row.id, col.id, v || null)}
                        />
                      ) : col.type === "ATTACHMENT" ? (
                        <AttachmentCell
                          value={value}
                          onUpload={(url) => safeUpdateCell(row.id, col.id, url)}
                        />
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
                        <span
                          className={`cursor-pointer text-xs transition-colors ${isTall ? "whitespace-normal break-words line-clamp-4" : "block truncate"} ${value ? "text-[#1f2937] hover:text-[#166254]" : "text-[#d1d5db]"}`}
                        >
                          {formatCellValue(value, col.type) || ""}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}

              <td className="w-8 px-1">
                <button
                  className="opacity-0 group-hover:opacity-100 text-[#6d7480] text-xs p-1.5 transition-all rounded-md bg-[#f3f4f6] border border-[#d4d7dc]"
                  title="Expand row"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  >
                    <path
                      d="M4.2 1.8H1.8v2.4M7.8 10.2h2.4V7.8M10.2 4.2V1.8H7.8M1.8 7.8v2.4h2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          );
        })}

        {bottomPad > 0 && (
          <tr aria-hidden="true" style={{ height: bottomPad }}>
            <td colSpan={visCols.length + 2} style={{ padding: 0, border: "none" }} />
          </tr>
        )}

        <tr className="border-t border-[#e2e5e9] bg-white" style={{ height: rowH }}>
          <td colSpan={visCols.length + 2} className="px-0 py-0">
            <button
              onClick={() => addRow.mutate({ tableId })}
              className="flex h-full items-center gap-2 px-4 py-2 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f9fafb] transition-colors w-full text-xs"
              title={`Add ${labelLower}`}
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                className="w-3 h-3"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 2v8M2 6h8" strokeLinecap="round" />
              </svg>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#ccc]">
                {chunkLoading && (
                  <span className="flex items-center gap-1 text-[#f97316]">
                    <span className="w-2 h-2 border border-[#f97316] border-t-transparent rounded-full animate-spin inline-block" />
                    Loading {loadedCount.toLocaleString()} / {(table?.rowCount ?? 0).toLocaleString()}...
                  </span>
                )}
              </span>
            </button>
          </td>
        </tr>

        {summaryBottomOffsetPx > 0 && (
          <tr aria-hidden="true" className="bg-[#f6f8fc]">
            <td
              colSpan={visCols.length + 2}
              style={{ padding: 0, border: "none", height: summaryBottomOffsetPx }}
            />
          </tr>
        )}

        <tr aria-hidden="true" className="bg-[#f6f8fc]">
          <td colSpan={visCols.length + 2} style={{ padding: 0, height: "100%" }} />
        </tr>
      </tbody>

      <tfoot className="sticky z-[20] bg-white" style={{ bottom: summaryBottomOffsetPx }}>
        <tr className="bg-white" style={{ height: summaryRowHeightPx }}>
          <td className="w-12 px-0 py-0 sticky left-0 z-20 bg-white overflow-visible">
            <div className="relative" style={{ height: summaryRowHeightPx }}>
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] text-[#2f343c]">
                {(Number.isFinite(totalRows) ? totalRows : 0).toLocaleString()} {pluralLabel(Number.isFinite(totalRows) ? totalRows : 0)}
              </div>
            </div>
          </td>

          {visCols.map((col) => {
            const result = summaryResult(col.id, summaryByCol, allRowsForSummary, getCellValue);
            const mode = summaryByCol[col.id] ?? "None";
            const shouldShowPrompt = hoveredSummaryCol === col.id && mode === "None";
            const isSummaryCellHoverOrOpen =
              hoveredSummaryCol === col.id || summaryMenu?.colId === col.id;
            return (
              <td
                key={`summary-${col.id}`}
                className="relative box-border px-0 py-0"
                style={{ width: col.width, minWidth: col.width }}
              >
                <button
                  className={`w-full px-3 flex items-center justify-end gap-1.5 text-[#6b7280] ${isSummaryCellHoverOrOpen ? "bg-[#eeeff1]" : "bg-white hover:bg-[#eeeff1]"}`}
                  style={{ height: summaryRowHeightPx }}
                  onMouseEnter={() => setHoveredSummaryCol(col.id)}
                  onMouseLeave={() =>
                    setHoveredSummaryCol((prev) => (prev === col.id ? null : prev))
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSummaryMenu((prev) =>
                      prev?.colId === col.id
                        ? null
                        : { colId: col.id, left: rect.right - 140, top: rect.top - 4 },
                    );
                    setRowContextMenu(null);
                  }}
                >
                  {result ? (
                    <>
                      <span className="text-[11px] leading-none">{result.label}</span>
                      <span className="text-[13px] leading-none text-[#374151]">{result.value}</span>
                    </>
                  ) : shouldShowPrompt ? (
                    <>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          d="M2.5 4.5L6 8l3.5-3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-[12px]">Summary</span>
                    </>
                  ) : null}
                </button>
              </td>
            );
          })}

          <td className="w-24 bg-white px-0 py-0" />
        </tr>
      </tfoot>
    </>
  );
}
