import { useEffect, useMemo, useState } from "react";
import type { ColumnType } from "@prisma/client";
import {
  GridViewTableBody,
} from "~/app/_components/gridView/GridViewTableBody";
import {
  GridViewTableHeader,
} from "~/app/_components/gridView/GridViewTableHeader";
import {
  GridViewTableOverlays,
} from "~/app/_components/gridView/GridViewTableOverlays";
import type { GridViewTableProps, SummaryOption } from "~/app/_components/gridView/tableTypes";

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
  handleAddColumn,
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
  deleteRow: _deleteRow,
  addRow,
  tableId,
  chunkLoading,
  loadAllPhase,
  scrollLocked,
  rawLoadedRows,
  loadAllError,
  onRetryLoadAll,
  trueTotal: _trueTotal,
  totalRows,
  bulkDeleteRows,
  reorderRows,
  canReorderRows,
  allRowsForSummary,
  recordLabel = "record",
}: GridViewTableProps) {
  const [menuForCol, setMenuForCol] = useState<string | null>(null);
  const [hoveredInfoCol, setHoveredInfoCol] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<{
    colId: string;
    value: string;
  } | null>(null);
  const [fieldTypeListOpen, setFieldTypeListOpen] = useState(false);
  const [editingField, setEditingField] = useState<{
    colId: string;
    name: string;
    type: string;
    description: string;
    showDescription: boolean;
  } | null>(null);
  const [duplicatingField, setDuplicatingField] = useState<{
    colId: string;
    name: string;
    duplicateCells: boolean;
  } | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [summaryByCol, setSummaryByCol] = useState<Record<string, SummaryOption>>({});
  const [summaryMenu, setSummaryMenu] = useState<{ colId: string; left: number; top: number } | null>(
    null,
  );
  const [hoveredSummaryCol, setHoveredSummaryCol] = useState<string | null>(null);
  const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] = useState(0);
  const [verticalScrollbarWidth, setVerticalScrollbarWidth] = useState(0);

  const label = (recordLabel || "record").trim() || "record";
  const labelLower = label.toLowerCase();
  const pluralLabel = (n: number) =>
    n === 1 ? labelLower : labelLower.endsWith("s") ? labelLower : `${labelLower}s`;

  const rowIdsInViewOrder = useMemo(
    () => allRowsForSummary.map((r) => r.id),
    [allRowsForSummary],
  );
  const hasSelectedRows = selectedRowIds.length > 0;
  const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  useEffect(() => {
    if (!allRowsForSummary.length) {
      setSelectedRowIds([]);
      return;
    }
    const valid = new Set(allRowsForSummary.map((r) => r.id));
    setSelectedRowIds((prev) => prev.filter((id) => valid.has(id)));
  }, [allRowsForSummary]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScrollbarHeight = () => {
      const nextHorizontal = Math.max(0, el.offsetHeight - el.clientHeight);
      const nextVertical = Math.max(0, el.offsetWidth - el.clientWidth);
      setHorizontalScrollbarHeight((prev) =>
        Math.abs(prev - nextHorizontal) < 0.5 ? prev : nextHorizontal,
      );
      setVerticalScrollbarWidth((prev) =>
        Math.abs(prev - nextVertical) < 0.5 ? prev : nextVertical,
      );
    };

    updateScrollbarHeight();
    const ro = new ResizeObserver(updateScrollbarHeight);
    ro.observe(el);

    const tableEl = el.firstElementChild;
    if (tableEl instanceof Element) ro.observe(tableEl);
    window.addEventListener("resize", updateScrollbarHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScrollbarHeight);
    };
  }, [containerRef]);

  function openColMenu(colId: string, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuForCol(colId);
  }

  function closeColMenu() {
    setMenuForCol(null);
  }

  function applyFieldEdit() {
    if (!editingField) return;
    renameColumn.mutate({
      columnId: editingField.colId,
      name: editingField.name.trim() || "Field",
    });
    changeType.mutate({
      columnId: editingField.colId,
      type: editingField.type as ColumnType,
    });
    updateColumnDescription.mutate({
      columnId: editingField.colId,
      description: editingField.showDescription
        ? editingField.description.trim() || null
        : null,
    });
    setEditingField(null);
  }

  function toggleRowSelection(rowId: string) {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
    );
  }

  function toggleAllRowsInView(checked: boolean) {
    if (checked) {
      setSelectedRowIds(rowIdsInViewOrder);
      return;
    }
    setSelectedRowIds([]);
  }

  function openRowContextMenu(e: React.MouseEvent, rowId: string) {
    e.preventDefault();
    e.stopPropagation();
    setHeaderPanel(null);
    setOpenSelectCell(null);
    closeColMenu();
    setSummaryMenu(null);
    setSelectedRowIds((prev) => (prev.includes(rowId) ? prev : [rowId]));
    setRowContextMenu({ x: e.clientX, y: e.clientY });
  }

  function handleRowDrop(targetRowId: string) {
    if (!canReorderRows || !dragRowId || dragRowId === targetRowId) return;
    const orderedIds = [...rowIdsInViewOrder];
    const fromIdx = orderedIds.indexOf(dragRowId);
    const toIdx = orderedIds.indexOf(targetRowId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = orderedIds.splice(fromIdx, 1);
    if (!moved) return;
    orderedIds.splice(toIdx, 0, moved);
    reorderRows.mutate({ tableId, orderedIds });
  }

  const selectedInViewCount = rowIdsInViewOrder.filter((id) => selectedSet.has(id)).length;
  const allInViewSelected =
    rowIdsInViewOrder.length > 0 && selectedInViewCount === rowIdsInViewOrder.length;
  const someInViewSelected = selectedInViewCount > 0 && !allInViewSelected;

  const summaryRowHeightPx = 21.5;
  const summaryBarHeightPx = 34;
  const summaryScrollbarLanePx = summaryBarHeightPx - summaryRowHeightPx;
  const summaryBottomOffsetPx = Math.max(0, summaryScrollbarLanePx - horizontalScrollbarHeight);
  const summarySolidFillHeightPx = summaryBottomOffsetPx + summaryRowHeightPx;
  const summaryTopBorderBottomPx =
    summaryBottomOffsetPx + summaryRowHeightPx + horizontalScrollbarHeight;
  const progressTotal = Math.max(1, totalRows);
  const progressLoaded = Math.min(progressTotal, Math.max(0, rawLoadedRows));
  const progressPercent = Math.min(
    100,
    Math.round((progressLoaded / progressTotal) * 100),
  );

  return (
    <div className="relative h-full w-full bg-[#f6f8fc]">
      <div
        ref={containerRef}
        data-testid="grid-scroll-container"
        className={`h-full w-full select-none bg-[#f6f8fc] ${scrollLocked ? "overflow-hidden" : "overflow-auto"}`}
        style={{ overflowAnchor: "none" }}
        onScroll={scrollLocked ? undefined : handleScroll}
        onClick={() => {
          setHeaderPanel(null);
          setOpenSelectCell(null);
          closeColMenu();
          setAddingCol(false);
          setSummaryMenu(null);
          setRowContextMenu(null);
        }}
      >
        <table className="min-h-full border-collapse bg-white text-sm" style={{ tableLayout: "fixed" }}>
          <GridViewTableHeader
            rowH={rowH}
            visCols={visCols}
            dragOverColId={dragOverColId}
            setDragColId={setDragColId}
            setDragOverColId={setDragOverColId}
            onDragEnd={onDragEnd}
            headerPanel={headerPanel}
            setHeaderPanel={setHeaderPanel}
            renamingCol={renamingCol}
            setRenamingCol={setRenamingCol}
            handleHeaderSortClick={handleHeaderSortClick}
            deleteColumn={deleteColumn}
            renameColumn={renameColumn}
            changeType={changeType}
            insertColumnLeft={insertColumnLeft}
            insertColumnRight={insertColumnRight}
            addOption={addOption}
            deleteOption={deleteOption}
            updateOption={updateOption}
            startResize={startResize}
            addingCol={addingCol}
            setAddingCol={setAddingCol}
            handleAddColumn={handleAddColumn}
            menuForCol={menuForCol}
            openColMenu={openColMenu}
            closeColMenu={closeColMenu}
            hoveredInfoCol={hoveredInfoCol}
            setHoveredInfoCol={setHoveredInfoCol}
            setEditingDescription={setEditingDescription}
            setEditingField={setEditingField}
            setFieldTypeListOpen={setFieldTypeListOpen}
            setDuplicatingField={setDuplicatingField}
            tableId={tableId}
            filters={filters}
            groups={groups}
            onFiltersChange={onFiltersChange}
            onGroupsChange={onGroupsChange}
            onRequestOpenSortPanel={onRequestOpenSortPanel}
            onRequestOpenFilterPanel={onRequestOpenFilterPanel}
            onRequestOpenGroupPanel={onRequestOpenGroupPanel}
            hasSelectedRows={hasSelectedRows}
            allInViewSelected={allInViewSelected}
            someInViewSelected={someInViewSelected}
            toggleAllRowsInView={toggleAllRowsInView}
          />

          <GridViewTableBody
            rowH={rowH}
            table={table}
            visCols={visCols}
            loadedCount={loadedCount}
            topPad={topPad}
            loadingGapHeight={loadingGapHeight}
            bottomPad={bottomPad}
            visItems={visItems}
            startIdx={startIdx}
            rowNumbers={rowNumbers}
            isTall={isTall}
            editing={editing}
            setEditing={setEditing}
            openSelectCell={openSelectCell}
            setOpenSelectCell={setOpenSelectCell}
            handleCellClick={handleCellClick}
            getCellValue={getCellValue}
            isSelect={isSelect}
            safeUpdateCell={safeUpdateCell}
            commitEdit={commitEdit}
            addRow={addRow}
            tableId={tableId}
            chunkLoading={chunkLoading}
            allRowsForSummary={allRowsForSummary}
            labelLower={labelLower}
            pluralLabel={pluralLabel}
            selectedSet={selectedSet}
            dragRowId={dragRowId}
            setDragRowId={setDragRowId}
            dragOverRowId={dragOverRowId}
            setDragOverRowId={setDragOverRowId}
            canReorderRows={canReorderRows}
            handleRowDrop={handleRowDrop}
            toggleRowSelection={toggleRowSelection}
            openRowContextMenu={openRowContextMenu}
            summaryByCol={summaryByCol}
            hoveredSummaryCol={hoveredSummaryCol}
            setHoveredSummaryCol={setHoveredSummaryCol}
            summaryMenu={summaryMenu}
            setSummaryMenu={setSummaryMenu}
            setRowContextMenu={setRowContextMenu}
            totalRows={totalRows}
            summaryRowHeightPx={summaryRowHeightPx}
            summaryBottomOffsetPx={summaryBottomOffsetPx}
          />
        </table>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[18] bg-white"
        style={{
          bottom: horizontalScrollbarHeight,
          right: verticalScrollbarWidth,
          height: summarySolidFillHeightPx,
        }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 z-[25] h-px bg-[#e2e5e9]"
        style={{ bottom: summaryTopBorderBottomPx, right: verticalScrollbarWidth }}
      />

      <GridViewTableOverlays
        summaryMenu={summaryMenu}
        setSummaryMenu={setSummaryMenu}
        summaryByCol={summaryByCol}
        setSummaryByCol={setSummaryByCol}
        rowContextMenu={rowContextMenu}
        hasSelectedRows={hasSelectedRows}
        selectedRowIds={selectedRowIds}
        pluralLabel={pluralLabel}
        bulkDeleteRows={bulkDeleteRows}
        setSelectedRowIds={setSelectedRowIds}
        setRowContextMenu={setRowContextMenu}
        editingField={editingField}
        setEditingField={setEditingField}
        fieldTypeListOpen={fieldTypeListOpen}
        setFieldTypeListOpen={setFieldTypeListOpen}
        applyFieldEdit={applyFieldEdit}
        duplicatingField={duplicatingField}
        setDuplicatingField={setDuplicatingField}
        duplicateColumn={duplicateColumn}
        editingDescription={editingDescription}
        setEditingDescription={setEditingDescription}
        updateColumnDescription={updateColumnDescription}
      />

      {scrollLocked && (
        <div
          data-testid="grid-loading-overlay"
          className="absolute inset-0 z-[40] flex items-center justify-center bg-white/70 px-4 backdrop-blur-[1px]"
        >
          <div className="w-full max-w-md rounded-xl border border-[#d1d5db] bg-white px-5 py-4 shadow-lg">
            <div className="text-sm font-semibold text-[#1f2937]">Loading all rows</div>
            <div className="mt-2 text-xs text-[#4b5563]">
              {progressLoaded.toLocaleString()} / {progressTotal.toLocaleString()} rows ready.
              Scrolling is disabled until this completes.
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
              <div
                data-testid="grid-loading-progress-bar"
                className="h-full rounded-full bg-[#2563eb] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div data-testid="grid-loading-progress-text" className="mt-1 text-[11px] text-[#6b7280]">
              {progressPercent}% complete
            </div>
            {loadAllError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {loadAllError}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-[#6b7280]">
                <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#f97316] border-t-transparent" />
                {loadAllPhase === "finalizing"
                  ? "Finalizing rows and unlocking scroll..."
                  : "Fetching rows..."}
              </div>
            )}
            {loadAllError && (
              <button
                onClick={onRetryLoadAll}
                className="mt-3 rounded-md border border-[#d1d5db] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#f9fafb]"
              >
                Retry Full Load
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
