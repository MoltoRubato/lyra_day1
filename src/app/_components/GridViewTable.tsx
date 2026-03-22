import { useCallback, useEffect, useMemo, useState } from "react";
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
import type {
  FieldEditorState,
  GridViewTableProps,
  SummaryOption,
} from "~/app/_components/gridView/tableTypes";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import { getActiveFilterFieldIds } from "~/app/_components/tableUtils";
import { isPrimaryFieldSupportedType } from "~/shared/primaryField";

export function GridViewTable({
  containerRef,
  handleScroll,
  rowH,
  table,
  allCols,
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
  freezeCount,
  onFreezeCountChange,
  dragOverColId,
  setDragColId,
  setDragOverColId,
  onDragEnd,
  headerPanel,
  setHeaderPanel,
  renamingCol,
  setRenamingCol,
  deleteColumn,
  renameColumn,
  changeType,
  updateColumnDescription,
  duplicateColumn,
  insertColumnLeft,
  insertColumnRight,
  changePrimaryField,
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
  const [renderedRowHeaderWidth, setRenderedRowHeaderWidth] = useState<number | null>(null);
  const [renderedColumnWidths, setRenderedColumnWidths] = useState<number[]>([]);
  const [menuForCol, setMenuForCol] = useState<string | null>(null);
  const [hoveredInfoCol, setHoveredInfoCol] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<{
    colId: string;
    value: string;
  } | null>(null);
  const [fieldTypeListOpen, setFieldTypeListOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldEditorState | null>(null);
  const [duplicatingField, setDuplicatingField] = useState<{
    colId: string;
    name: string;
    duplicateCells: boolean;
  } | null>(null);
  const [changingPrimaryField, setChangingPrimaryField] = useState(false);
  const [primaryFieldPickerOpen, setPrimaryFieldPickerOpen] = useState(false);
  const [primaryFieldSearch, setPrimaryFieldSearch] = useState("");
  const [selectedPrimaryFieldId, setSelectedPrimaryFieldId] = useState<string | null>(null);

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
  const [isFreezeDividerHover, setIsFreezeDividerHover] = useState(false);
  const [isFreezeDragging, setIsFreezeDragging] = useState(false);
  const [freezeTooltipTop, setFreezeTooltipTop] = useState(220);
  const dividerBottomInset = Math.max(34, horizontalScrollbarHeight + 21.5);
  const primaryColumn = allCols[0] ?? null;
  const selectedPrimaryField = useMemo(
    () => allCols.find((column) => column.id === selectedPrimaryFieldId) ?? null,
    [allCols, selectedPrimaryFieldId],
  );
  const filteredPrimaryFieldOptions = useMemo(() => {
    const query = primaryFieldSearch.trim().toLowerCase();
    return allCols.filter((column) =>
      query.length === 0 ? true : column.name.toLowerCase().includes(query),
    );
  }, [allCols, primaryFieldSearch]);
  const canApplyPrimaryFieldChange = Boolean(
    primaryColumn &&
      selectedPrimaryField &&
      selectedPrimaryField.id !== primaryColumn.id &&
      isPrimaryFieldSupportedType(selectedPrimaryField.type) &&
      !changePrimaryField.isPending,
  );

  const label = (recordLabel || "record").trim() || "record";
  const labelLower = label.toLowerCase();
  const pluralLabel = (n: number) =>
    n === 1 ? labelLower : labelLower.endsWith("s") ? labelLower : `${labelLower}s`;

  const rowIdsInViewOrder = useMemo(
    () => allRowsForSummary.map((r) => r.id),
    [allRowsForSummary],
  );
  const visibleColumnsSignature = useMemo(
    () => visCols.map((col) => `${col.id}:${col.width}`).join("|"),
    [visCols],
  );
  const rowNumberWidth = renderedRowHeaderWidth ?? 80;
  const effectiveColumnWidths = useMemo(
    () => visCols.map((col, idx) => renderedColumnWidths[idx] ?? col.width),
    [renderedColumnWidths, visCols],
  );
  const clampedFreezeCount = Math.max(0, Math.min(freezeCount, visCols.length));
  const frozenOffsets = useMemo(() => {
    const offsets: number[] = [];
    let nextLeft = rowNumberWidth;
    for (const width of effectiveColumnWidths) {
      offsets.push(nextLeft);
      nextLeft += width;
    }
    return offsets;
  }, [effectiveColumnWidths, rowNumberWidth]);
  const freezeBoundaries = useMemo(() => {
    const boundaries: number[] = [rowNumberWidth];
    let nextBoundary = rowNumberWidth;
    for (const width of effectiveColumnWidths) {
      nextBoundary += width;
      boundaries.push(nextBoundary);
    }
    return boundaries;
  }, [effectiveColumnWidths, rowNumberWidth]);
  const dividerLeft = freezeBoundaries[clampedFreezeCount] ?? rowNumberWidth;
  const freezeTooltipLabel = isFreezeDragging
    ? clampedFreezeCount === 1
      ? "Freeze 1 column"
      : `Freeze ${clampedFreezeCount} columns`
    : "Drag to adjust the number of frozen columns";
  const hasSelectedRows = selectedRowIds.length > 0;
  const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const highlightedFilterColumnIds = useMemo(
    () => new Set(getActiveFilterFieldIds(filters)),
    [filters],
  );

  useEffect(() => {
    if (!allRowsForSummary.length) {
      setSelectedRowIds([]);
      return;
    }
    const valid = new Set(allRowsForSummary.map((r) => r.id));
    setSelectedRowIds((prev) => prev.filter((id) => valid.has(id)));
  }, [allRowsForSummary]);

  useEffect(() => {
    if (!changingPrimaryField) return;
    if (!primaryColumn) {
      setChangingPrimaryField(false);
      return;
    }
    setSelectedPrimaryFieldId((prev) => prev ?? primaryColumn.id);
  }, [changingPrimaryField, primaryColumn]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const measureHeaderWidths = () => {
      const headerCells = Array.from(
        containerEl.querySelectorAll("thead tr:first-child > th"),
      );
      if (!headerCells.length) return;

      const rowHeaderCell = headerCells[0];
      if (rowHeaderCell instanceof HTMLElement) {
        const nextRowHeaderWidth = rowHeaderCell.offsetWidth;
        if (Number.isFinite(nextRowHeaderWidth) && nextRowHeaderWidth > 0) {
          setRenderedRowHeaderWidth((prev) =>
            prev !== null && Math.abs(prev - nextRowHeaderWidth) < 0.25
              ? prev
              : nextRowHeaderWidth,
          );
        }
      }

      const nextColWidths = visCols.map((col, idx) => {
        const headerCell = headerCells[idx + 1];
        if (headerCell instanceof HTMLElement) {
          const width = headerCell.offsetWidth;
          if (Number.isFinite(width) && width > 0) return width;
        }
        return col.width;
      });

      setRenderedColumnWidths((prev) => {
        if (
          prev.length === nextColWidths.length &&
          prev.every((width, idx) => Math.abs(width - nextColWidths[idx]!) < 0.25)
        ) {
          return prev;
        }
        return nextColWidths;
      });
    };

    measureHeaderWidths();

    const ro = new ResizeObserver(() => measureHeaderWidths());
    ro.observe(containerEl);
    const tableEl = containerEl.querySelector("table");
    if (tableEl instanceof HTMLElement) {
      ro.observe(tableEl);
    }
    const headerRow = containerEl.querySelector("thead tr:first-child");
    if (headerRow instanceof HTMLElement) {
      ro.observe(headerRow);
    }
    const headerCells = containerEl.querySelectorAll("thead tr:first-child > th");
    headerCells.forEach((cell) => {
      if (cell instanceof HTMLElement) ro.observe(cell);
    });

    if (visCols.length === 0) {
      setRenderedColumnWidths((prev) => (prev.length ? [] : prev));
    }

    window.addEventListener("resize", measureHeaderWidths);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureHeaderWidths);
    };
  }, [containerRef, visCols, visibleColumnsSignature]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const paneHeight = Math.max(80, el.clientHeight - rowH - dividerBottomInset);
    const nextTop = Math.max(24, Math.min(paneHeight - 28, Math.round(paneHeight * 0.44)));
    setFreezeTooltipTop(nextTop);
  }, [containerRef, dividerBottomInset, rowH]);

  const nearestFreezeCountForClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return clampedFreezeCount;
      const tableEl = el.querySelector("table");
      if (!(tableEl instanceof HTMLElement)) return clampedFreezeCount;
      const tableRect = tableEl.getBoundingClientRect();
      const contentX = clientX - tableRect.left + el.scrollLeft;
      let nearestCount = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      freezeBoundaries.forEach((boundary, idx) => {
        const distance = Math.abs(boundary - contentX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestCount = idx;
        }
      });
      return nearestCount;
    },
    [clampedFreezeCount, containerRef, freezeBoundaries],
  );

  const updateFreezeTooltipTop = useCallback(
    (clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const paneHeight = Math.max(80, el.clientHeight - rowH - dividerBottomInset);
      const minTop = 24;
      const maxTop = Math.max(minTop, paneHeight - 28);
      const nextTop = Math.round(clientY - rect.top - rowH - 14);
      setFreezeTooltipTop(Math.max(minTop, Math.min(maxTop, nextTop)));
    },
    [containerRef, dividerBottomInset, rowH],
  );

  const beginFreezeDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFreezeDragging(true);
      setIsFreezeDividerHover(true);
      updateFreezeTooltipTop(e.clientY);
      onFreezeCountChange(nearestFreezeCountForClientX(e.clientX));

      const onMove = (ev: MouseEvent) => {
        updateFreezeTooltipTop(ev.clientY);
        onFreezeCountChange(nearestFreezeCountForClientX(ev.clientX));
      };
      const onUp = () => {
        setIsFreezeDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [nearestFreezeCountForClientX, onFreezeCountChange, updateFreezeTooltipTop],
  );

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
    setMenuForCol((prev) => (prev === colId ? null : colId));
  }

  function closeColMenu() {
    setMenuForCol(null);
  }

  function openChangePrimaryFieldDialog() {
    if (!primaryColumn) return;
    setSelectedPrimaryFieldId(primaryColumn.id);
    setPrimaryFieldSearch("");
    setPrimaryFieldPickerOpen(false);
    setChangingPrimaryField(true);
    closeColMenu();
  }

  function closeChangePrimaryFieldDialog() {
    setChangingPrimaryField(false);
    setPrimaryFieldPickerOpen(false);
    setPrimaryFieldSearch("");
    setSelectedPrimaryFieldId(primaryColumn?.id ?? null);
  }

  function applyPrimaryFieldChange() {
    if (!primaryColumn || !selectedPrimaryField || !canApplyPrimaryFieldChange) return;
    changePrimaryField.mutate({
      tableId,
      columnId: selectedPrimaryField.id,
    });
    closeChangePrimaryFieldDialog();
  }

  function applyFieldEdit() {
    if (!editingField) return;
    const selectFieldTypes = new Set(["SINGLE_SELECT", "MULTI_SELECT"]);
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

    if (selectFieldTypes.has(editingField.type)) {
      const originalById = new Map(
        editingField.originalSelectOptions.map((opt) => [opt.id, opt]),
      );
      const normalizedOptions = editingField.selectOptions
        .map((opt, index) => ({
          ...opt,
          order: index,
          label: opt.label.trim(),
        }))
        .filter((opt) => opt.label.length > 0);
      const nextPersistedIds = new Set(
        normalizedOptions
          .map((opt) => opt.id)
          .filter((id) => !id.startsWith("new-")),
      );

      editingField.originalSelectOptions.forEach((opt) => {
        if (!nextPersistedIds.has(opt.id)) {
          deleteOption.mutate({ optionId: opt.id });
        }
      });

      normalizedOptions.forEach((opt) => {
        if (opt.id.startsWith("new-")) {
          addOption.mutate({
            columnId: editingField.colId,
            label: opt.label,
            color: opt.color,
          });
          return;
        }
        const original = originalById.get(opt.id);
        if (!original) return;
        if (original.label !== opt.label || original.color !== opt.color) {
          updateOption.mutate({
            optionId: opt.id,
            label: opt.label,
            color: opt.color,
          });
        }
      });
    }

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
        <table
          id="table"
          className="min-h-full border-collapse bg-white text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <GridViewTableHeader
            rowH={rowH}
            rowNumberWidth={rowNumberWidth}
            visCols={visCols}
            freezeCount={clampedFreezeCount}
            frozenOffsets={frozenOffsets}
            dragOverColId={dragOverColId}
            setDragColId={setDragColId}
            setDragOverColId={setDragOverColId}
            onDragEnd={onDragEnd}
            headerPanel={headerPanel}
            setHeaderPanel={setHeaderPanel}
            renamingCol={renamingCol}
            setRenamingCol={setRenamingCol}
            deleteColumn={deleteColumn}
            renameColumn={renameColumn}
            changeType={changeType}
            insertColumnLeft={insertColumnLeft}
            insertColumnRight={insertColumnRight}
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
            onRequestChangePrimaryField={openChangePrimaryFieldDialog}
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
            highlightedFilterColumnIds={highlightedFilterColumnIds}
          />

          <GridViewTableBody
            rowH={rowH}
            rowNumberWidth={rowNumberWidth}
            table={table}
            visCols={visCols}
            freezeCount={clampedFreezeCount}
            frozenOffsets={frozenOffsets}
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
            highlightedFilterColumnIds={highlightedFilterColumnIds}
          />
        </table>
      </div>

      <div
        className="pointer-events-none absolute z-[26] overflow-visible"
        style={{
          top: rowH,
          bottom: dividerBottomInset,
          left: dividerLeft,
          width: 0,
          userSelect: "none",
        }}
      >
        <div
          className="pointer-events-auto absolute bottom-0 top-0 cursor-col-resize"
          style={{ left: -4, width: 8 }}
          onMouseEnter={() => setIsFreezeDividerHover(true)}
          onMouseLeave={() => {
            if (!isFreezeDragging) setIsFreezeDividerHover(false);
          }}
          onMouseMove={(e) => {
            if (!isFreezeDragging) updateFreezeTooltipTop(e.clientY);
          }}
          onMouseDown={beginFreezeDrag}
        />
        <div
          className="pointer-events-none absolute bottom-0 top-0 border-l border-[#afb5bf]"
          style={{ left: 0, opacity: 1 }}
        />
        <div
          className="pointer-events-none absolute w-[6px] rounded-full bg-[#1c76d2]"
          style={{
            left: -3,
            top: freezeTooltipTop - 2,
            height: 26,
            opacity: isFreezeDragging || isFreezeDividerHover ? 1 : 0,
            transition: isFreezeDragging ? "none" : "opacity 120ms ease",
          }}
        />
        <div
          className="pointer-events-none absolute h-7 select-none border border-[#d6dae1] bg-[#f7f8fa] px-3 text-[13px] leading-7 text-[#8a8f99]"
          style={{
            top: Math.max(8, freezeTooltipTop - 2),
            left: 10,
            clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
            whiteSpace: "nowrap",
            fontFamily:
              '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
            opacity: isFreezeDragging || isFreezeDividerHover ? 1 : 0,
            transition: isFreezeDragging ? "none" : "opacity 120ms ease",
          }}
        >
          {isFreezeDragging ? (
            <>
              <span>Freeze </span>
              <span className="text-[#10b981]">{clampedFreezeCount}</span>
              <span>{clampedFreezeCount === 1 ? " column" : " columns"}</span>
            </>
          ) : (
            <span>{freezeTooltipLabel}</span>
          )}
        </div>
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
        tableId={tableId}
        allRowsSelected={allInViewSelected}
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

      {changingPrimaryField && primaryColumn && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/25"
            onClick={closeChangePrimaryFieldDialog}
          />
          <div
            aria-label="Change primary field"
            role="dialog"
            className="fixed left-1/2 top-1/2 z-[80] w-[min(525px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-[10px] border border-[#d6d8dc] bg-white px-6 pb-5 pt-6 shadow-[0px_0px_1px_rgba(0,0,0,0.24),0px_0px_2px_rgba(0,0,0,0.16),0px_3px_4px_rgba(0,0,0,0.06),0px_6px_8px_rgba(0,0,0,0.06),0px_12px_16px_rgba(0,0,0,0.08),0px_18px_32px_rgba(0,0,0,0.06)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-6 text-[35px] font-semibold leading-[1.05] text-[#2a2d34]">
              Change the primary field
            </h3>

            <div className="mb-6">
              <div className="mb-2 text-[13px] leading-[18px] text-[#616670]">Primary field</div>
              <div className="relative">
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-[6px] border border-[#d8dbe1] bg-white px-3 text-left text-[13px] text-[#1d1f25]"
                  onClick={() => setPrimaryFieldPickerOpen((open) => !open)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    {selectedPrimaryField && <FieldTypeIcon type={selectedPrimaryField.type} />}
                    <span className="truncate text-[13px] leading-[18px]">
                      {selectedPrimaryField?.name ?? primaryColumn.name}
                    </span>
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className="text-[#616670]"
                    aria-hidden="true"
                  >
                    <path d="M4.5 6.5L8 10l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {primaryFieldPickerOpen && (
                  <div className="absolute left-0 top-full z-[90] mt-1 w-full overflow-hidden rounded-[6px] border border-[#d8dbe1] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.16)]">
                    <div className="border-b border-[#e5e8ed] px-3 py-2">
                      <input
                        autoFocus
                        value={primaryFieldSearch}
                        onChange={(event) => setPrimaryFieldSearch(event.target.value)}
                        placeholder="Find a field"
                        className="h-8 w-full border-none bg-transparent px-0 text-[13px] text-[#1d1f25] outline-none placeholder:text-[#9ca3af]"
                      />
                    </div>
                    <div className="max-h-[260px] overflow-y-auto py-1">
                      {filteredPrimaryFieldOptions.map((column) => {
                        const supported = isPrimaryFieldSupportedType(column.type);
                        const selected = selectedPrimaryFieldId === column.id;
                        return (
                          <button
                            key={column.id}
                            type="button"
                            disabled={!supported}
                            className={`flex h-10 w-full items-center gap-2 px-3 text-left text-[13px] leading-[18px] ${
                              selected ? "bg-[#ececec]" : "bg-white"
                            } ${
                              supported
                                ? "text-[#1d1f25] hover:bg-[#f5f7fa]"
                                : "cursor-not-allowed text-[#9ca3af]"
                            }`}
                            onClick={() => {
                              if (!supported) return;
                              setSelectedPrimaryFieldId(column.id);
                              setPrimaryFieldPickerOpen(false);
                              setPrimaryFieldSearch("");
                            }}
                          >
                            <FieldTypeIcon type={column.type} className={supported ? "text-[#1d1f25]" : "text-[#9ca3af]"} />
                            <span className="truncate">{column.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4 text-[13px] leading-[18px] text-[#41454d]">
              &quot;{primaryColumn.name}&quot; is currently the primary field.
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                className="h-9 rounded-[6px] px-3 text-[13px] text-[#31353e] hover:bg-[#f5f7fa]"
                onClick={closeChangePrimaryFieldDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canApplyPrimaryFieldChange}
                className={`h-9 rounded-[6px] px-4 text-[13px] font-semibold text-white ${
                  canApplyPrimaryFieldChange
                    ? "bg-[#166ee1] shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-[#0d52ac]"
                    : "cursor-not-allowed bg-[#a0c5f7]"
                }`}
                onClick={applyPrimaryFieldChange}
              >
                Change primary field
              </button>
            </div>

            <button
              type="button"
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[#7f8794] hover:bg-[#f5f7fa]"
              onClick={closeChangePrimaryFieldDialog}
              aria-label="Close dialog"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </>
      )}

      {scrollLocked && (
        <div
          data-testid="grid-loading-overlay"
          className="absolute inset-0 z-[40] flex items-center justify-center bg-white/70 px-4 backdrop-blur-[1px]"
        >
          <div className="w-full max-w-xs rounded-xl border border-[#d1d5db] bg-white px-5 py-5 text-center shadow-lg">
            {loadAllError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {loadAllError}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-[13px] text-[#4b5563]">
                <span
                  data-testid="grid-loading-spinner"
                  className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent"
                />
                {loadAllPhase === "finalizing"
                  ? "Finalizing rows..."
                  : "Loading rows..."}
              </div>
            )}
            {loadAllError && (
              <button
                onClick={onRetryLoadAll}
                className="mt-3 rounded-md border border-[#d1d5db] px-3 py-1.5 text-[13px] font-medium text-[#111827] hover:bg-[#f9fafb]"
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

