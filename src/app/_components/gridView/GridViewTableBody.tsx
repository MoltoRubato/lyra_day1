import type { ReactElement } from "react";
import {
  AttachmentCell,
  SearchHighlightedText,
  SelectCell,
} from "~/app/_components/gridViewCells";
import {
  formatCellValue,
  getGridSearchCellKey,
  inputTypeForField,
  type RowWithCells,
} from "~/app/_components/tableUtils";
import type {
  EditingCell,
  SummaryOption,
  VisibleColumn,
  VisibleItem,
} from "~/app/_components/gridView/tableTypes";

type GridViewTableBodyProps = {
  rowH: number;
  rowNumberWidth: number;
  searchQuery: string;
  searchMatchedCellKeys: Set<string>;
  activeSearchCellKey: string | null;
  table: { rowCount: number } | null | undefined;
  visCols: VisibleColumn[];
  freezeCount: number;
  frozenOffsets: number[];
  loadedCount: number;
  topPad: number;
  loadingGapHeight: number;
  bottomPad: number;
  visItems: VisibleItem[];
  startIdx: number;
  rowNumbers: Array<number | null>;
  isTall: boolean;
  editing: EditingCell | null;
  setEditing: (
    v: EditingCell | null | ((p: EditingCell | null) => EditingCell | null),
  ) => void;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  handleCellClick: (
    row: RowWithCells,
    col: { id: string; type: string },
  ) => void;
  getCellValue: (row: RowWithCells, columnId: string) => string;
  isSelect: (type: string) => boolean;
  safeUpdateCell: (
    rowId: string,
    columnId: string,
    value: string | null,
  ) => void;
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
  summaryMenu:
    | {
        colId: string;
        targetId: string;
        left: number;
        top: number;
        placement: "top" | "bottom";
      }
    | null;
  setSummaryMenu: (
    v:
      | {
          colId: string;
          targetId: string;
          left: number;
          top: number;
          placement: "top" | "bottom";
        }
      | null
      | ((
          prev:
            | {
                colId: string;
                targetId: string;
                left: number;
                top: number;
                placement: "top" | "bottom";
              }
            | null,
        ) =>
          | {
              colId: string;
              targetId: string;
              left: number;
              top: number;
              placement: "top" | "bottom";
            }
          | null),
  ) => void;
  setRowContextMenu: (v: { x: number; y: number } | null) => void;
  totalRows: number;
  summaryRowHeightPx: number;
  summaryBottomOffsetPx: number;
  highlightedFilterColumnIds: Set<string>;
  highlightedSortColumnIds: Set<string>;
  highlightedGroupColumnIds: Set<string>;
  groupLabelColumnId: string | null;
  columnNameById: Record<string, string>;
  collapsedGroupKeySet: Set<string>;
  onToggleGroupCollapsed?: (groupKey: string) => void;
};

// Smaller chunks avoid large single-row spacer glitches in table layout engines.
const MAX_SPACER_ROW_HEIGHT = 20_000;
const SUMMARY_MENU_HEIGHT = 34 * 7;
const SUMMARY_MENU_WIDTH = 140;
const SUMMARY_MENU_GAP = 4;
const GROUP_INDENT_PX = 24;
const GROUP_GUTTER_BASE_PX = 8;

function renderSpacerRows(
  totalHeight: number,
  colSpan: number,
  keyPrefix: string,
) {
  if (totalHeight <= 0) return null;
  const rows: ReactElement[] = [];
  let remaining = totalHeight;
  let idx = 0;

  while (remaining > 0) {
    const height = Math.min(remaining, MAX_SPACER_ROW_HEIGHT);
    rows.push(
      <tr aria-hidden="true" key={`${keyPrefix}-${idx}`} style={{ height }}>
        <td colSpan={colSpan} style={{ padding: 0, border: "none" }} />
      </tr>,
    );
    remaining -= height;
    idx += 1;
  }

  return rows;
}

function summaryResult(
  colId: string,
  summaryByCol: Record<string, SummaryOption>,
  rowsForSummary: RowWithCells[],
  getCellValue: (row: RowWithCells, columnId: string) => string,
): { label: string; value: string } | null {
  const mode = summaryByCol[colId] ?? "None";
  if (mode === "None") return null;

  const total = rowsForSummary.length;
  const values = rowsForSummary.map((row) =>
    (getCellValue(row, colId) ?? "").trim(),
  );
  const emptyCount = values.filter((v) => v.length === 0).length;
  const filledCount = total - emptyCount;
  const uniqueCount = new Set(values.filter((v) => v.length > 0)).size;
  const percent = (count: number) =>
    `${Math.round((count / Math.max(1, total)) * 100)}%`;

  if (mode === "Empty")
    return { label: "Empty", value: emptyCount.toLocaleString() };
  if (mode === "Filled")
    return { label: "Filled", value: filledCount.toLocaleString() };
  if (mode === "Unique")
    return { label: "Unique", value: uniqueCount.toLocaleString() };
  if (mode === "Percent Empty") {
    return { label: "Percent Empty", value: percent(emptyCount) };
  }
  if (mode === "Percent Filled") {
    return { label: "Percent Filled", value: percent(filledCount) };
  }
  return { label: "Percent Unique", value: percent(uniqueCount) };
}

function cellHighlightColor(
  columnId: string,
  highlightedSortColumnIds: Set<string>,
  highlightedGroupColumnIds: Set<string>,
  highlightedFilterColumnIds: Set<string>,
) {
  if (highlightedGroupColumnIds.has(columnId)) return "#f2f0fe";
  if (highlightedSortColumnIds.has(columnId)) return "#fff2ea";
  if (highlightedFilterColumnIds.has(columnId)) return "#ebfbec";
  return undefined;
}

function groupRowCellBackground(
  columnId: string,
  highlightedSortColumnIds: Set<string>,
  highlightedGroupColumnIds: Set<string>,
  highlightedFilterColumnIds: Set<string>,
) {
  if (highlightedGroupColumnIds.has(columnId)) return "#f5f5fd";
  if (highlightedSortColumnIds.has(columnId)) return "#fff2ea";
  if (highlightedFilterColumnIds.has(columnId)) return "#ebfbec";
  return "#f6f8fc";
}

export function GridViewTableBody({
  rowH,
  rowNumberWidth,
  searchQuery,
  searchMatchedCellKeys,
  activeSearchCellKey,
  table,
  visCols,
  freezeCount,
  frozenOffsets,
  loadedCount,
  topPad,
  loadingGapHeight,
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
  highlightedFilterColumnIds,
  highlightedSortColumnIds,
  highlightedGroupColumnIds,
  groupLabelColumnId,
  columnNameById,
  collapsedGroupKeySet,
  onToggleGroupCollapsed,
}: GridViewTableBodyProps) {
  const hasLoadingGap = loadingGapHeight > 0;
  const colSpan = visCols.length + 1;
  const resolvedGroupLabelColumnId = groupLabelColumnId ?? visCols[0]?.id ?? null;
  const groupRowHeight = Math.max(rowH, 44);

  function openSummaryMenuForTarget(
    target: HTMLElement,
    colId: string,
    targetId: string,
  ) {
    const rect = target.getBoundingClientRect();
    const canOpenAbove = rect.top >= SUMMARY_MENU_HEIGHT + SUMMARY_MENU_GAP + 8;
    const canOpenBelow =
      window.innerHeight - rect.bottom >= SUMMARY_MENU_HEIGHT + SUMMARY_MENU_GAP + 8;
    const placement =
      !canOpenAbove && canOpenBelow ? "bottom" : "top";
    const left = Math.max(
      8,
      Math.min(window.innerWidth - SUMMARY_MENU_WIDTH - 8, rect.right - SUMMARY_MENU_WIDTH),
    );
    const top =
      placement === "top" ? rect.top - SUMMARY_MENU_GAP : rect.bottom + SUMMARY_MENU_GAP;

    setSummaryMenu((prev) =>
      prev?.targetId === targetId
        ? null
        : {
            colId,
            targetId,
            left,
            top,
            placement,
          },
    );
    setRowContextMenu(null);
  }

  return (
    <>
      <tbody>
        {loadedCount === 0 && !hasLoadingGap && !chunkLoading && (
          <tr>
            <td
              colSpan={colSpan}
              className="px-4 py-8 text-center text-[13px] text-[#9ca3af]"
            >
              No {pluralLabel(2)} match the current filters.
            </td>
          </tr>
        )}

        {renderSpacerRows(topPad, colSpan, "top-pad")}

        {visItems.map((item, vi) => {
          const absIdx = startIdx + vi;
          if (item.kind === "group") {
            const { node, totalRows: groupedRows, rows: groupRows } = item;
            const groupFieldName =
              columnNameById[node.columnId]?.toUpperCase() ?? "GROUP";
            const isCollapsed = collapsedGroupKeySet.has(node.key);
            const groupChevronOffsetPx =
              GROUP_GUTTER_BASE_PX + node.depth * GROUP_INDENT_PX;
            return (
              <tr
                key={node.key}
                className="bg-[#f6f8fc]"
              >
                <td
                  className="sticky left-0 z-[13] box-border border-r border-b border-[#dfe3e8] bg-[#f6f8fc] px-0 py-0"
                  style={{
                    width: rowNumberWidth,
                    minWidth: rowNumberWidth,
                    maxWidth: rowNumberWidth,
                    height: groupRowHeight,
                  }}
                >
                  <div
                    className="relative flex items-center"
                    style={{ height: groupRowHeight }}
                  >
                    <div
                      className="flex h-full items-center"
                      style={{ paddingLeft: groupChevronOffsetPx }}
                    >
                      {node.depth > 0 ? (
                        <span
                          aria-hidden="true"
                          className="mr-1 h-px w-[8px] flex-none bg-[#d9dde5]"
                        />
                      ) : null}
                      <button
                        type="button"
                        aria-label={
                          isCollapsed
                            ? `Expand group ${node.value}`
                            : `Collapse group ${node.value}`
                        }
                        aria-expanded={!isCollapsed}
                        disabled={!onToggleGroupCollapsed}
                        onClick={(event) => {
                          event.stopPropagation();
                          setHoveredSummaryCol(null);
                          setSummaryMenu(null);
                          setRowContextMenu(null);
                          onToggleGroupCollapsed?.(node.key);
                        }}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-[#2f343c] hover:bg-[#e8ecf4] disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          style={{
                            transform: isCollapsed
                              ? "rotate(-90deg)"
                              : undefined,
                          }}
                          aria-hidden="true"
                        >
                          <path
                            d="M2.75 4.25L6 7.5l3.25-3.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </td>

                {visCols.map((col, colIndex) => {
                  const isFrozen = colIndex < freezeCount;
                  const isLastFrozen = isFrozen && colIndex === freezeCount - 1;
                  const isLabelColumn = col.id === resolvedGroupLabelColumnId;
                  const cellBackground = groupRowCellBackground(
                    col.id,
                    highlightedSortColumnIds,
                    highlightedGroupColumnIds,
                    highlightedFilterColumnIds,
                  );
                  const summaryTargetId = `group:${node.key}:${col.id}`;
                  const result = summaryResult(
                    col.id,
                    summaryByCol,
                    groupRows,
                    getCellValue,
                  );
                  const mode = summaryByCol[col.id] ?? "None";
                  const shouldShowPrompt =
                    hoveredSummaryCol === summaryTargetId && mode === "None";
                  const isSummaryCellHoverOrOpen =
                    hoveredSummaryCol === summaryTargetId ||
                    summaryMenu?.targetId === summaryTargetId;
                  const buttonBackground =
                    isSummaryCellHoverOrOpen ? "#eeeff1" : cellBackground;
                  return (
                    <td
                      key={`${node.key}-${col.id}`}
                      data-columnid={col.id}
                      className={`box-border border-r border-b border-[#dfe3e8] px-0 py-0 ${isFrozen ? "sticky" : ""}`}
                      style={{
                        width: col.width,
                        minWidth: 60,
                        maxWidth: col.width,
                        height: groupRowHeight,
                        ...(isFrozen
                          ? {
                              left: frozenOffsets[colIndex] ?? rowNumberWidth,
                              zIndex: 11,
                            }
                          : {}),
                        ...(isLastFrozen ? { boxShadow: "1px 0 0 #afb5bf" } : {}),
                        backgroundColor: cellBackground,
                      }}
                    >
                      {isLabelColumn ? (
                        <div
                          className="flex h-full flex-col justify-center"
                          style={{
                            paddingLeft: `${12 + node.depth * GROUP_INDENT_PX}px`,
                            paddingRight: "16px",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] leading-[14px] tracking-[0.08em] text-[#6f7782] uppercase">
                                {groupFieldName}
                              </div>
                              <div className="truncate pt-[2px] text-[13px] leading-[18px] font-semibold text-[#1d1f25]">
                                {node.value}
                              </div>
                            </div>
                            <div className="pl-3 text-[13px] leading-none text-[#616670]">
                              {groupedRows.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex w-full items-center justify-end gap-1.5 px-3 text-[#6b7280]"
                          style={{
                            height: groupRowHeight,
                            backgroundColor: buttonBackground,
                          }}
                          onMouseEnter={() => setHoveredSummaryCol(summaryTargetId)}
                          onMouseLeave={() =>
                            setHoveredSummaryCol((prev) =>
                              prev === summaryTargetId ? null : prev,
                            )
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            openSummaryMenuForTarget(
                              e.currentTarget,
                              col.id,
                              summaryTargetId,
                            );
                          }}
                        >
                          {result ? (
                            <>
                              <span className="text-[11px] leading-none">
                                {result.label}
                              </span>
                              <span className="text-[13px] leading-none text-[#374151]">
                                {result.value}
                              </span>
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
                              <span className="text-[13px]">Summary</span>
                            </>
                          ) : null}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          }

          const { row } = item;
          const rowNum = rowNumbers[absIdx] ?? absIdx + 1;
          const rowSelected = selectedSet.has(row.id);
          const editingColumn =
            editing?.rowId === row.id
              ? visCols.find(
                  (candidateCol) => candidateCol.id === editing.columnId,
                )
              : null;
          const editingLongTextRow = editingColumn?.type === "LONG_TEXT";

          return (
            <tr
              key={row.id}
              className={`dataRow group relative transition-colors ${rowSelected ? "bg-[#dfe5ef]" : "hover:bg-[#f9fafb]"} ${dragOverRowId === row.id ? "ring-1 ring-[#1c76d2] ring-inset" : ""}`}
              style={{
                height: rowH,
                zIndex: editingLongTextRow ? 15 : undefined,
              }}
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
                className={`sticky left-0 z-[13] box-border border-b border-[#e2e5e9] px-0 py-0 transition-colors ${rowSelected ? "bg-[#dfe5ef]" : "bg-white group-hover:bg-[#f9fafb]"}`}
                style={{
                  width: rowNumberWidth,
                  minWidth: rowNumberWidth,
                  maxWidth: rowNumberWidth,
                }}
              >
                <div className="flex items-center" style={{ height: rowH }}>
                  <div className="flex h-full w-[20px] items-center justify-center">
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
                      className={`grid h-3 w-3 grid-cols-2 place-items-center gap-[2px] text-[#7c8494] ${
                        rowSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } ${
                        canReorderRows
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-not-allowed opacity-20"
                      }`}
                      title={
                        canReorderRows
                          ? "Drag to reorder row"
                          : "Disable sort/filter/group to reorder rows"
                      }
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className="h-[2px] w-[2px] rounded-full bg-current"
                        />
                      ))}
                    </button>
                  </div>
                  <div className="relative h-full w-[44px]">
                    <button
                      type="button"
                      role="checkbox"
                      aria-label={`Select row ${rowNum}`}
                      aria-checked={rowSelected}
                      onClick={() => toggleRowSelection(row.id)}
                      className={`absolute top-1/2 left-0 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-[6px] border transition-colors ${
                        rowSelected
                          ? "border-transparent bg-[#1c76d2] text-white opacity-100 shadow-[0_1px_2px_rgba(15,23,42,0.24)]"
                          : "border-[#d6d8dd] bg-white text-transparent opacity-0 shadow-[0_1px_2px_rgba(15,23,42,0.16)] group-hover:opacity-100"
                      }`}
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 8.2l2.7 2.8L12.5 4.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <span
                      className={`pointer-events-none absolute inset-y-0 left-0 flex w-4 items-center justify-center text-[13px] leading-none text-[#616670] select-none ${
                        rowSelected
                          ? "opacity-0"
                          : "opacity-100 group-hover:opacity-0"
                      }`}
                    >
                      {rowNum}
                    </span>
                  </div>
                </div>
              </td>

              {visCols.map((col, colIndex) => {
                const isEditing =
                  editing?.rowId === row.id && editing.columnId === col.id;
                const isLongTextEditing = isEditing && col.type === "LONG_TEXT";
                const value = getCellValue(row, col.id);
                const formattedValue = formatCellValue(value, col.type) || "";
                const isFrozen = colIndex < freezeCount;
                const isLastFrozen = isFrozen && colIndex === freezeCount - 1;
                const cellSearchKey = getGridSearchCellKey(row.id, col.id);
                const hasSearchMatch = searchMatchedCellKeys.has(cellSearchKey);
                const isActiveSearchMatch = activeSearchCellKey === cellSearchKey;
                const searchHighlightQuery = hasSearchMatch ? searchQuery : null;
                const accentColor = cellHighlightColor(
                  col.id,
                  highlightedSortColumnIds,
                  highlightedGroupColumnIds,
                  highlightedFilterColumnIds,
                );
                const highlightColor = isActiveSearchMatch
                  ? "#ffd66b"
                  : hasSearchMatch
                    ? "#fff3d3"
                    : accentColor;
                return (
                  <td
                    key={col.id}
                    data-columnid={col.id}
                    data-search-cell-key={cellSearchKey}
                    style={{
                      width: col.width,
                      minWidth: 60,
                      maxWidth: col.width,
                      height: rowH,
                      ...(isFrozen
                        ? {
                            left: frozenOffsets[colIndex] ?? rowNumberWidth,
                            zIndex: isLongTextEditing ? 30 : 11,
                          }
                        : {}),
                      ...(isLongTextEditing && !isFrozen ? { zIndex: 30 } : {}),
                      ...(isLastFrozen ? { boxShadow: "1px 0 0 #afb5bf" } : {}),
                      ...(highlightColor ? { backgroundColor: highlightColor } : {}),
                    }}
                    className={`cell relative box-border overflow-visible border-r border-b border-[#e2e5e9] px-2 py-0 ${isFrozen ? "sticky" : ""} ${rowSelected ? "bg-[#dfe5ef]" : "bg-white group-hover:bg-[#f9fafb]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(row, col);
                    }}
                    onContextMenu={(e) => openRowContextMenu(e, row.id)}
                  >
                    <div
                      className={`flex ${isTall || isLongTextEditing ? "items-start pt-1.5" : "items-center"} ${isLongTextEditing ? "relative z-[2]" : ""}`}
                      style={{ height: rowH }}
                    >
                      {col.type === "CHECKBOX" ? (
                        <input
                          type="checkbox"
                          readOnly
                          checked={value === "true"}
                          className="h-3.5 w-3.5 cursor-pointer rounded accent-[#166254]"
                        />
                      ) : isSelect(col.type) ? (
                        <SelectCell
                          cellId={`${row.id}-${col.id}`}
                          openSelectCell={openSelectCell}
                          setOpenSelectCell={setOpenSelectCell}
                          value={value}
                          options={col.selectOptions ?? []}
                          multi={col.type === "MULTI_SELECT"}
                          searchQuery={searchHighlightQuery}
                          onSelect={(v) =>
                            safeUpdateCell(row.id, col.id, v || null)
                          }
                        />
                      ) : col.type === "ATTACHMENT" ? (
                        <AttachmentCell
                          value={value}
                          searchQuery={searchHighlightQuery}
                          onUpload={(url) =>
                            safeUpdateCell(row.id, col.id, url)
                          }
                        />
                      ) : isEditing ? (
                        col.type === "LONG_TEXT" ? (
                          <textarea
                            autoFocus
                            rows={3}
                            className="relative z-[3] min-h-[56px] w-full resize-y rounded border-2 border-[#166254] bg-white px-2 py-1 text-[13px] text-[#1f2937] shadow-sm outline-none"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing({ ...editing, value: e.target.value })
                            }
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === "Enter")
                                commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          <input
                            autoFocus
                            className="w-full rounded border-2 border-[#166254] bg-white px-2 py-0.5 text-[13px] text-[#1f2937] shadow-sm outline-none"
                            value={editing.value}
                            type={inputTypeForField(col.type)}
                            onChange={(e) =>
                              setEditing({ ...editing, value: e.target.value })
                            }
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        )
                      ) : (
                        <span
                          className={`cursor-pointer text-[13px] transition-colors ${isTall ? "line-clamp-4 break-words whitespace-normal" : "block truncate"} ${value ? "text-[#1f2937] hover:text-[#166254]" : "text-[#d1d5db]"}`}
                        >
                          <SearchHighlightedText
                            text={formattedValue}
                            query={searchHighlightQuery}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}

        {hasLoadingGap && (
          <tr aria-live="polite">
            <td
              colSpan={colSpan}
              style={{ padding: 0, height: loadingGapHeight }}
            >
              <div className="relative h-full w-full bg-[#f3f4f6]">
                <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[11px] text-[#6b7280] shadow-sm backdrop-blur">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#f97316] border-t-transparent" />
                    Loading rows {loadedCount.toLocaleString()} /{" "}
                    {(table?.rowCount ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </td>
          </tr>
        )}

        {renderSpacerRows(bottomPad, colSpan, "bottom-pad")}

        <tr className="bg-white" style={{ height: rowH }}>
          <td
            colSpan={colSpan}
            className="border-t border-[#e2e5e9] px-0 py-0"
          >
            <button
              onClick={() => addRow.mutate({ tableId })}
              className="flex h-full w-full items-center gap-2 px-4 py-2 text-[13px] text-[#9ca3af] transition-colors hover:bg-[#f9fafb] hover:text-[#1f2937]"
              title={`Add ${labelLower}`}
            >
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center">
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="h-3 w-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#ccc]">
                {chunkLoading && (
                  <span className="flex items-center gap-1 text-[#f97316]">
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#f97316] border-t-transparent" />
                    Loading {loadedCount.toLocaleString()} /{" "}
                    {(table?.rowCount ?? 0).toLocaleString()}...
                  </span>
                )}
              </span>
            </button>
          </td>
        </tr>

        {summaryBottomOffsetPx > 0 && (
          <tr aria-hidden="true" className="bg-[#f6f8fc]">
            <td
              colSpan={colSpan}
              style={{
                padding: 0,
                border: "none",
                height: summaryBottomOffsetPx,
              }}
            />
          </tr>
        )}

        <tr aria-hidden="true" className="bg-[#f6f8fc]">
          <td colSpan={colSpan} style={{ padding: 0, height: "100%" }} />
        </tr>
      </tbody>

      <tfoot
        className="sticky z-[20] bg-white"
        style={{ bottom: summaryBottomOffsetPx }}
      >
        <tr className="bg-white" style={{ height: summaryRowHeightPx }}>
          <td
            className="sticky left-0 z-[13] box-border overflow-visible bg-white px-0 py-0"
            style={{
              width: rowNumberWidth,
              minWidth: rowNumberWidth,
              maxWidth: rowNumberWidth,
            }}
          >
            <div className="relative" style={{ height: summaryRowHeightPx }}>
              <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] whitespace-nowrap text-[#2f343c]">
                {(Number.isFinite(totalRows) ? totalRows : 0).toLocaleString()}{" "}
                {pluralLabel(Number.isFinite(totalRows) ? totalRows : 0)}
              </div>
            </div>
          </td>

          {visCols.map((col, colIndex) => {
            const result = summaryResult(
              col.id,
              summaryByCol,
              allRowsForSummary,
              getCellValue,
            );
            const mode = summaryByCol[col.id] ?? "None";
            const summaryTargetId = `footer:${col.id}`;
            const shouldShowPrompt =
              hoveredSummaryCol === summaryTargetId && mode === "None";
            const isSummaryCellHoverOrOpen =
              hoveredSummaryCol === summaryTargetId ||
              summaryMenu?.targetId === summaryTargetId;
            const isFrozen = colIndex < freezeCount;
            const isLastFrozen = isFrozen && colIndex === freezeCount - 1;
            const highlightColor = cellHighlightColor(
              col.id,
              highlightedSortColumnIds,
              highlightedGroupColumnIds,
              highlightedFilterColumnIds,
            );
            return (
              <td
                key={`summary-${col.id}`}
                className={`relative box-border px-0 py-0 ${isFrozen ? "sticky bg-white" : ""}`}
                style={{
                  width: col.width,
                  minWidth: col.width,
                  ...(isFrozen
                    ? {
                        left: frozenOffsets[colIndex] ?? rowNumberWidth,
                        zIndex: 11,
                      }
                    : {}),
                  ...(isLastFrozen ? { boxShadow: "1px 0 0 #afb5bf" } : {}),
                  ...(highlightColor ? { backgroundColor: highlightColor } : {}),
                }}
              >
                <button
                  className="flex w-full items-center justify-end gap-1.5 px-3 text-[#6b7280]"
                  onMouseEnter={() => setHoveredSummaryCol(summaryTargetId)}
                  onMouseLeave={() =>
                    setHoveredSummaryCol((prev) =>
                      prev === summaryTargetId ? null : prev,
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    openSummaryMenuForTarget(
                      e.currentTarget,
                      col.id,
                      summaryTargetId,
                    );
                  }}
                  style={{
                    height: summaryRowHeightPx,
                    backgroundColor: isSummaryCellHoverOrOpen
                      ? "#eeeff1"
                      : highlightColor ?? "#fff",
                  }}
                >
                  {result ? (
                    <>
                      <span className="text-[11px] leading-none">
                        {result.label}
                      </span>
                      <span className="text-[13px] leading-none text-[#374151]">
                        {result.value}
                      </span>
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
                      <span className="text-[13px]">Summary</span>
                    </>
                  ) : null}
                </button>
              </td>
            );
          })}
        </tr>
      </tfoot>
    </>
  );
}
