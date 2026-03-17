"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnType } from "@prisma/client";
import { GridViewTable } from "~/app/_components/GridViewTable";
import {
  ROW_HEIGHT_PX,
  applyFilters,
  applyGroups,
  applySorts,
  flattenGroupTree,
  getCellValue,
  type FilterCondition,
  type GroupRule,
  type RowHeight,
  type RowWithCells,
  type SortRule,
} from "~/app/_components/tableUtils";
import { useGridViewCacheHelpers } from "~/app/_components/gridView/useGridViewCacheHelpers";
import { useGridViewColumnMutations } from "~/app/_components/gridView/useGridViewColumnMutations";
import { useGridViewRowMutations } from "~/app/_components/gridView/useGridViewRowMutations";
import { api } from "~/trpc/react";

type EditingCell = { rowId: string; columnId: string; value: string };

const OVERSCAN = 15;

export default function GridView({
  tableId,
  hiddenFields = {},
  filters = [],
  sorts = [],
  groups = [],
  rowHeight = "short",
  recordLabel = "Record",
  onSortsChange,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
}: {
  tableId: string;
  hiddenFields?: Record<string, boolean>;
  filters?: FilterCondition[];
  sorts?: SortRule[];
  groups?: GroupRule[];
  rowHeight?: RowHeight;
  recordLabel?: string;
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
}) {
  const utils = api.useUtils();
  const { data: table, isLoading, error } = api.table.getById.useQuery({ id: tableId });

  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [openSelectCell, setOpenSelectCell] = useState<string | null>(null);
  const [headerPanel, setHeaderPanel] = useState<{ colId: string; panel: "type" | "options" } | null>(
    null,
  );
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("TEXT");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const rafPending = useRef(false);

  const [, forceRender] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    const ro = new ResizeObserver(([e]) => setViewportH(e!.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTopRef.current = e.currentTarget.scrollTop;
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      forceRender((n) => n + 1);
    });
  }, []);

  const allCols = useMemo(
    () => [...(table?.columns ?? [])].sort((a, b) => a.order - b.order),
    [table?.columns],
  );
  const visCols = useMemo(
    () => allCols.filter((c) => !hiddenFields[c.id]),
    [allCols, hiddenFields],
  );

  const isSelect = useCallback(
    (type: string) => type === "SINGLE_SELECT" || type === "MULTI_SELECT",
    [],
  );

  const cacheHelpers = useGridViewCacheHelpers(tableId);
  const { patchCache } = cacheHelpers;
  const { addRow, deleteRow, bulkDeleteRows, reorderRows, safeUpdateCell } =
    useGridViewRowMutations({
      tableId,
      visCols,
      isSelect,
      setEditing,
      ...cacheHelpers,
    });
  const {
    addColumn,
    deleteColumn,
    renameColumn,
    changeType,
    updateColumnDescription,
    duplicateColumn,
    insertColumnLeft,
    insertColumnRight,
    reorderColumns,
    resizeColumn,
    addOption,
    deleteOption,
    updateOption,
  } = useGridViewColumnMutations({ tableId, ...cacheHelpers });

  const [chunkLoading, setChunkLoading] = useState(false);
  useEffect(() => {
    if (!table) return;
    const loaded = table.rows.length;
    const total = table.rowCount;
    if (loaded >= total || chunkLoading) return;

    setChunkLoading(true);
    void utils.table.getRows
      .fetch({ tableId, skip: loaded, take: 5000 })
      .then((newRows) => {
        patchCache((prev) => {
          if (!prev) return prev;
          const existingIds = new Set(prev.rows.map((r) => r.id));
          const fresh = newRows.filter((r) => !existingIds.has(r.id));
          if (fresh.length === 0) return prev;
          return {
            ...prev,
            rows: [...prev.rows, ...fresh],
            rowCount: prev.rowCount,
          };
        });
      })
      .finally(() => setChunkLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.rows.length, table?.rowCount, chunkLoading, tableId]);

  const flatItems = useMemo(() => {
    if (!table) return [];
    const filtered = applyFilters(table.rows as RowWithCells[], filters);
    const sorted = applySorts(filtered, sorts, table.columns);
    const grouped = applyGroups(sorted, groups);
    return flattenGroupTree(grouped);
  }, [table, filters, sorts, groups]);

  const rowNumbers = useMemo(() => {
    let n = 0;
    return flatItems.map((item) => (item.kind === "row" ? ++n : null));
  }, [flatItems]);

  const allRowsForSummary = useMemo(
    () => flatItems.flatMap((item) => (item.kind === "row" ? [item.row] : [])),
    [flatItems],
  );

  const resolvedRowHeight: RowHeight =
    rowHeight in ROW_HEIGHT_PX ? rowHeight : "short";
  const rowH = ROW_HEIGHT_PX[resolvedRowHeight];
  const isTall = resolvedRowHeight === "tall" || resolvedRowHeight === "extra-tall";

  const noTransform = filters.length === 0 && sorts.length === 0 && groups.length === 0;
  const rawRowCount = table?.rowCount;
  const totalRows = rawRowCount ?? (table?.rows.length ?? 0);
  const visibleTotal = noTransform ? totalRows : flatItems.length;
  const loadedCount = flatItems.length;

  const scrollTop = scrollTopRef.current;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const endIdx = Math.min(loadedCount, Math.ceil((scrollTop + viewportH) / rowH) + OVERSCAN);
  const topPad = startIdx * rowH;
  const bottomPad = Math.max(0, (visibleTotal - endIdx) * rowH);
  const visItems = flatItems.slice(startIdx, endIdx);

  if (isLoading) {
    return <div className="p-8 text-[#9ca3af] text-sm animate-pulse">Loading...</div>;
  }
  if (error) {
    return <div className="p-8 text-red-400 text-sm">Failed to load table. Please refresh.</div>;
  }
  if (!table) {
    return <div className="p-8 text-[#9ca3af] text-sm">Table not found.</div>;
  }

  function handleHeaderSortClick(colId: string) {
    if (!onSortsChange) return;
    const existing = sorts.find((s) => s.columnId === colId);
    if (!existing) {
      onSortsChange([{ id: `s-${colId}`, columnId: colId, dir: "asc" }]);
    } else if (existing.dir === "asc") {
      onSortsChange(sorts.map((s) => (s.columnId === colId ? { ...s, dir: "desc" } : s)));
    } else {
      onSortsChange(sorts.filter((s) => s.columnId !== colId));
    }
  }

  function handleCellClick(row: RowWithCells, col: { id: string; type: string }) {
    setHeaderPanel(null);
    setOpenSelectCell(null);
    if (editing?.rowId === row.id && editing.columnId === col.id) return;

    if (col.type === "CHECKBOX") {
      safeUpdateCell(row.id, col.id, getCellValue(row, col.id) === "true" ? "false" : "true");
      return;
    }

    if (isSelect(col.type) || col.type === "ATTACHMENT") {
      return;
    }

    setEditing({ rowId: row.id, columnId: col.id, value: getCellValue(row, col.id) });
  }

  function commitEdit() {
    if (!editing) return;
    safeUpdateCell(editing.rowId, editing.columnId, editing.value || null);
    setEditing(null);
  }

  function handleAddColumn() {
    if (!newColName.trim()) return;
    addColumn.mutate({ tableId, name: newColName.trim(), type: newColType as ColumnType });
    setNewColName("");
    setNewColType("TEXT");
    setAddingCol(false);
    setShowTypePicker(false);
  }

  function onDragEnd() {
    if (dragColId && dragOverColId && dragColId !== dragOverColId) {
      const from = allCols.findIndex((c) => c.id === dragColId);
      const to = allCols.findIndex((c) => c.id === dragOverColId);
      const reordered = [...allCols];
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
      const w = Math.max(
        80,
        resizingRef.current.startW + ev.clientX - resizingRef.current.startX,
      );
      patchCache((p) =>
        p
          ? {
              ...p,
              columns: p.columns.map((c) =>
                c.id === resizingRef.current!.colId ? { ...c, width: w } : c,
              ),
            }
          : p,
      );
    };

    const onUp = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.round(
        Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX),
      );
      resizeColumn.mutate({ columnId: resizingRef.current.colId, width: w });
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <GridViewTable
      containerRef={containerRef}
      handleScroll={handleScroll}
      rowH={rowH}
      table={table}
      sorts={sorts}
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
      updateColumnDescription={updateColumnDescription}
      duplicateColumn={duplicateColumn}
      insertColumnLeft={insertColumnLeft}
      insertColumnRight={insertColumnRight}
      filters={filters}
      groups={groups}
      onSortsChange={onSortsChange}
      onFiltersChange={onFiltersChange}
      onGroupsChange={onGroupsChange}
      onRequestOpenSortPanel={onRequestOpenSortPanel}
      onRequestOpenFilterPanel={onRequestOpenFilterPanel}
      onRequestOpenGroupPanel={onRequestOpenGroupPanel}
      addOption={addOption}
      deleteOption={deleteOption}
      updateOption={updateOption}
      startResize={startResize}
      addingCol={addingCol}
      setAddingCol={setAddingCol}
      showTypePicker={showTypePicker}
      setShowTypePicker={setShowTypePicker}
      newColType={newColType}
      setNewColType={setNewColType}
      newColName={newColName}
      setNewColName={setNewColName}
      handleAddColumn={handleAddColumn}
      loadedCount={loadedCount}
      topPad={topPad}
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
      deleteRow={deleteRow}
      addRow={addRow}
      tableId={tableId}
      chunkLoading={chunkLoading}
      trueTotal={visibleTotal}
      totalRows={totalRows}
      bulkDeleteRows={bulkDeleteRows}
      reorderRows={reorderRows}
      canReorderRows={noTransform}
      allRowsForSummary={allRowsForSummary}
      recordLabel={recordLabel}
    />
  );
}
