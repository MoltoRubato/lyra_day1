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
const MAX_FULL_LOAD_ROWS = 300_000;
const TARGET_CELLS_PER_PRELOAD_BATCH = 50_000;
const MIN_PRELOAD_BATCH_ROWS = 500;
const MAX_PRELOAD_BATCH_ROWS = 10_000;
const MAX_PRELOAD_STEPS = 2_000;
const MAX_BATCH_FETCH_RETRIES = 4;
const RETRY_BACKOFF_MS = 400;
const MAX_EMPTY_BATCH_RETRIES = 90;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const { data: table, isLoading, error } = api.table.getById.useQuery(
    { id: tableId },
    {
      // Preserve the fully loaded cache when switching tabs/tables and back.
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      gcTime: 30 * 60 * 1000,
    },
  );
  const loadRowsAfterOrder = api.table.loadRowsAfterOrder.useMutation();

  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol] = useState<{ id: string; value: string } | null>(null);
  const [openSelectCell, setOpenSelectCell] = useState<string | null>(null);
  const [headerPanel, setHeaderPanel] = useState<{ colId: string; panel: "type" | "options" } | null>(
    null,
  );
  const [addingCol, setAddingCol] = useState(false);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const rafPending = useRef(false);
  const preloadCycle = useRef(0);

  const [, forceRender] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const [loadAllLoading, setLoadAllLoading] = useState(false);
  const [loadAllPhase, setLoadAllPhase] = useState<"fetching" | "finalizing">("fetching");
  const [loadAllError, setLoadAllError] = useState<string | null>(null);
  const [preloadProgressRows, setPreloadProgressRows] = useState<number | null>(null);
  const [loadAllRetryTick, setLoadAllRetryTick] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    const ro = new ResizeObserver(([e]) => setViewportH(e!.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop;
    const max = Math.max(0, e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
    scrollTopRef.current = Math.max(0, Math.min(next, max));
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
  const viewportStart = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const viewportEnd = Math.min(
    visibleTotal,
    Math.ceil((scrollTop + viewportH) / rowH) + OVERSCAN,
  );
  const sliceStart = Math.min(viewportStart, loadedCount);
  const sliceEnd = Math.min(viewportEnd, loadedCount);
  const topPad = viewportStart * rowH;
  const loadingGapRows =
    noTransform && totalRows > loadedCount
      ? Math.max(0, viewportEnd - Math.max(sliceEnd, viewportStart))
      : 0;
  const loadingGapHeight = loadingGapRows * rowH;
  const bottomPad = Math.max(0, (visibleTotal - viewportEnd) * rowH);
  const visItems = flatItems.slice(sliceStart, sliceEnd);

  const tableLoadedRows = table?.rows.length ?? 0;
  const rawLoadedRows = Math.max(tableLoadedRows, preloadProgressRows ?? 0);
  const allRowsReady = tableLoadedRows >= totalRows;
  const scrollLocked = !allRowsReady;
  const effectiveLoadingGapHeight = allRowsReady ? loadingGapHeight : 0;

  useEffect(() => {
    preloadCycle.current += 1;
    setLoadAllLoading(false);
    setLoadAllPhase("fetching");
    setLoadAllError(null);
    setPreloadProgressRows(null);
    scrollTopRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    forceRender((n) => n + 1);
  }, [tableId]);

  useEffect(() => {
    if (!table) return;

    const total = table.rowCount;
    const loaded = table.rows.length;
    if (loaded >= total) {
      setLoadAllLoading(false);
      setLoadAllPhase("fetching");
      setLoadAllError(null);
      setPreloadProgressRows(null);
      return;
    }

    if (total > MAX_FULL_LOAD_ROWS) {
      setLoadAllLoading(false);
      setLoadAllPhase("fetching");
      setLoadAllError(
        `Too many rows to load at once (${total.toLocaleString()}). Reduce row count or raise MAX_FULL_LOAD_ROWS.`,
      );
      setPreloadProgressRows(loaded);
      return;
    }

    const columnCount = Math.max(1, table.columns.length);
    const batchSize = Math.max(
      MIN_PRELOAD_BATCH_ROWS,
      Math.min(
        MAX_PRELOAD_BATCH_ROWS,
        Math.floor(TARGET_CELLS_PER_PRELOAD_BATCH / columnCount),
      ),
    );

    const cycleId = ++preloadCycle.current;
    setLoadAllLoading(true);
    setLoadAllPhase("fetching");
    setLoadAllError(null);
    setPreloadProgressRows(loaded);

    void (async () => {
      const seenIds = new Set(table.rows.map((row) => row.id));
      let lastOrder = table.rows.length > 0 ? table.rows[table.rows.length - 1]!.order : -1;
      const newRows: typeof table.rows = [];
      let steps = 0;
      let emptyBatchRetries = 0;

      while (seenIds.size < total) {
        steps += 1;
        if (steps > MAX_PRELOAD_STEPS) {
          throw new Error("Stopped preload to avoid an infinite fetch loop.");
        }
        const remaining = total - seenIds.size;
        let rows: typeof table.rows = [];
        let requestTake = Math.min(batchSize, remaining);
        let lastBatchError: unknown = null;

        for (let attempt = 0; attempt <= MAX_BATCH_FETCH_RETRIES; attempt += 1) {
          try {
            rows = await loadRowsAfterOrder.mutateAsync({
              tableId,
              afterOrder: lastOrder,
              take: requestTake,
            });
            lastBatchError = null;
            break;
          } catch (err) {
            lastBatchError = err;
            if (attempt >= MAX_BATCH_FETCH_RETRIES) break;
            requestTake = Math.max(
              MIN_PRELOAD_BATCH_ROWS,
              Math.floor(requestTake / 2),
            );
            await sleep(RETRY_BACKOFF_MS * (attempt + 1));
          }
        }

        if (lastBatchError) {
          if (lastBatchError instanceof Error) {
            throw lastBatchError;
          }
          if (typeof lastBatchError === "string") {
            throw new Error(lastBatchError);
          }
          throw new Error("Batch preload failed with an unknown error.");
        }

        if (preloadCycle.current !== cycleId) return;
        if (rows.length === 0) {
          emptyBatchRetries += 1;
          if (emptyBatchRetries > MAX_EMPTY_BATCH_RETRIES) {
            throw new Error("No additional rows were returned before preload completed.");
          }
          await sleep(Math.min(2_000, RETRY_BACKOFF_MS * emptyBatchRetries));
          continue;
        }
        emptyBatchRetries = 0;

        lastOrder = rows[rows.length - 1]!.order;
        for (const row of rows) {
          if (seenIds.has(row.id)) continue;
          seenIds.add(row.id);
          newRows.push(row);
        }
        setPreloadProgressRows(seenIds.size);
      }

      if (preloadCycle.current !== cycleId) return;
      setLoadAllPhase("finalizing");

      patchCache((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.rows.map((row) => row.id));
        const fresh = newRows.filter((row) => !existingIds.has(row.id));
        const merged = [...prev.rows, ...fresh];
        return {
          ...prev,
          rows: merged,
          rowCount: Math.max(prev.rowCount, total, merged.length),
        };
      });
      setPreloadProgressRows(null);
    })()
      .catch((err: unknown) => {
        if (preloadCycle.current !== cycleId) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to preload all rows. Please retry.";
        setLoadAllError(message);
      })
      .finally(() => {
        if (preloadCycle.current !== cycleId) return;
        setLoadAllLoading(false);
        setLoadAllPhase("fetching");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    table?.rowCount,
    table?.rows.length,
    table?.columns.length,
    tableId,
    loadAllRetryTick,
    loadRowsAfterOrder.mutateAsync,
  ]);

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

  function handleAddColumnWithType(type: string, suggestedName?: string) {
    const trimmedName = suggestedName?.trim();
    const nextName = trimmedName && trimmedName.length > 0 ? trimmedName : "New field";
    addColumn.mutate({ tableId, name: nextName, type: type as ColumnType });
    setAddingCol(false);
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
      handleAddColumn={handleAddColumnWithType}
      loadedCount={loadedCount}
      topPad={topPad}
      loadingGapHeight={effectiveLoadingGapHeight}
      bottomPad={bottomPad}
      visItems={visItems}
      startIdx={sliceStart}
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
      chunkLoading={loadAllLoading}
      loadAllPhase={loadAllPhase}
      scrollLocked={scrollLocked}
      rawLoadedRows={rawLoadedRows}
      loadAllError={loadAllError}
      onRetryLoadAll={() => setLoadAllRetryTick((n) => n + 1)}
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
