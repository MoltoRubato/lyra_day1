"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnType } from "@prisma/client";
import { GridViewTable } from "~/app/_components/GridViewTable";
import {
  ROW_HEIGHT_PX,
  applyFilters,
  applyGroups,
  applySorts,
  createFilterTree,
  flattenGroupTree,
  hasActiveFilters,
  normalizeFilterTree,
  type FilterTree,
  type GroupRule,
  type RowHeight,
  type RowWithCells,
  type SortRule,
} from "~/app/_components/tableUtils";
import type { BulkDeleteRowsPayload } from "~/app/_components/gridView/tableTypes";
import { useGridViewCacheHelpers } from "~/app/_components/gridView/useGridViewCacheHelpers";
import { useGridViewColumnMutations } from "~/app/_components/gridView/useGridViewColumnMutations";
import { useGridViewRowMutations } from "~/app/_components/gridView/useGridViewRowMutations";
import { api } from "~/trpc/react";

type EditingCell = { rowId: string; columnId: string; value: string };
type PreloadRow = {
  id: string;
  order: number;
  tableId: string;
  cells: Array<{ columnId: string; value: string | null }>;
};

const OVERSCAN = 15;
const MAX_FULL_LOAD_ROWS = 300_000;
const MIN_PRELOAD_BATCH_ROWS = 2_000;
const MAX_PRELOAD_BATCH_ROWS = 25_000;
const MAX_PRELOAD_STEPS = 2_000;
const MAX_BATCH_FETCH_RETRIES = 4;
const RETRY_BACKOFF_MS = 400;
const MAX_EMPTY_BATCH_RETRIES = 90;
const BULK_GENERATED_ROW_ID_RE = /^r[a-z0-9]{6}[0-9a-f]+$/i;
const FALLBACK_STATUS_LABELS = [
  "Todo",
  "In progress",
  "Done",
];
const FALLBACK_TASK_TITLES = [
  "Plan onboarding refresh",
  "Review launch checklist",
  "Draft customer briefing",
  "Audit integration flow",
  "Coordinate sprint goals",
  "Finalize design polish",
];
const FALLBACK_PEOPLE = [
  "Harvey Graham",
  "Ed Wisoky",
  "Jasmine Quitzon",
  "Ari Singh",
  "Mina Park",
  "Lucas Chen",
];
const FALLBACK_COMPANIES = [
  "Northwind Labs",
  "Summit Systems",
  "Pioneer Works",
  "Lumen Partners",
  "Atlas Dynamics",
  "Acorn Studio",
];
const FALLBACK_NOTES = [
  "pace jovially iterate croon yet",
  "brace bowler around absolve",
  "cheerfully citizen concerning overview",
  "ack ah yowza apropos",
  "peony considering once",
  "boo notwithstanding bah valiantly",
];
const FALLBACK_EMAIL_DOMAINS = [
  "example.com",
  "northwind.dev",
  "summit.ai",
  "acorn.io",
];
const FALLBACK_HOSTS = [
  "workspace.example.com",
  "portal.northwind.dev",
  "status.summit.ai",
  "app.acorn.io",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function pickValue(values: readonly string[], hash: number) {
  return values[hash % values.length]!;
}

function makeFallbackCellValue(params: {
  columnType: string;
  columnName: string;
  rowOrder: number;
  columnId: string;
  selectOptionLabels: string[];
}) {
  const { columnType, columnName, rowOrder, columnId, selectOptionLabels } = params;
  const primaryHash = stableHash(`${rowOrder}:${columnId}:primary`);
  const secondaryHash = stableHash(`${rowOrder}:${columnId}:secondary`);
  const lowerName = columnName.toLowerCase();

  switch (columnType) {
    case "CHECKBOX":
      return primaryHash % 2 === 0 ? "true" : "false";
    case "NUMBER":
      return String(10 + (primaryHash % 5000));
    case "CURRENCY":
      return ((500 + (primaryHash % 125000)) / 100).toFixed(2);
    case "PERCENT":
      return String(primaryHash % 100);
    case "RATING":
      return String(1 + (primaryHash % 5));
    case "DATE": {
      const date = new Date(Date.UTC(2026, 0, 1) + (primaryHash % 365) * 86_400_000);
      return date.toISOString().slice(0, 10);
    }
    case "EMAIL": {
      const person = pickValue(FALLBACK_PEOPLE, primaryHash)
        .toLowerCase()
        .replaceAll(" ", ".");
      return `${person}${secondaryHash % 100}@${pickValue(FALLBACK_EMAIL_DOMAINS, secondaryHash)}`;
    }
    case "URL":
      return `https://${pickValue(FALLBACK_HOSTS, primaryHash)}/item-${(secondaryHash % 9000) + 1000}`;
    case "PHONE":
      return `+1 ${200 + (primaryHash % 700)}-${String(100 + (secondaryHash % 900)).padStart(3, "0")}-${String(1000 + (primaryHash % 9000)).padStart(4, "0")}`;
    case "DURATION":
      return `${15 * (1 + (primaryHash % 24))}m`;
    case "USER":
      return pickValue(FALLBACK_PEOPLE, primaryHash);
    case "ATTACHMENT":
      return `https://files.example.com/${pickValue(FALLBACK_COMPANIES, primaryHash).toLowerCase().replaceAll(" ", "-")}/brief-${(secondaryHash % 500) + 1}.pdf`;
    case "SINGLE_SELECT":
      if (selectOptionLabels.length > 0) return pickValue(selectOptionLabels, primaryHash);
      return pickValue(FALLBACK_STATUS_LABELS, primaryHash);
    case "MULTI_SELECT":
      if (selectOptionLabels.length >= 2) {
        return `${pickValue(selectOptionLabels, primaryHash)},${pickValue(selectOptionLabels, secondaryHash)}`;
      }
      if (selectOptionLabels.length === 1) return selectOptionLabels[0]!;
      return `${pickValue(FALLBACK_STATUS_LABELS, primaryHash)},${pickValue(FALLBACK_STATUS_LABELS, secondaryHash)}`;
    case "LONG_TEXT":
      if (lowerName.includes("summary")) {
        return `${pickValue(FALLBACK_NOTES, primaryHash)} ${pickValue(FALLBACK_NOTES, secondaryHash)}`;
      }
      return pickValue(FALLBACK_NOTES, primaryHash);
    default:
      if (lowerName.includes("name")) return pickValue(FALLBACK_TASK_TITLES, primaryHash);
      if (lowerName.includes("assignee") || lowerName.includes("owner")) {
        return pickValue(FALLBACK_PEOPLE, primaryHash);
      }
      if (lowerName.includes("company") || lowerName.includes("account")) {
        return pickValue(FALLBACK_COMPANIES, primaryHash);
      }
      return pickValue(FALLBACK_NOTES, primaryHash);
  }
}

function isBulkGeneratedRowId(rowId: string) {
  return BULK_GENERATED_ROW_ID_RE.test(rowId);
}

export default function GridView({
  tableId,
  hiddenFields = {},
  filters = createFilterTree(),
  sorts = [],
  groups = [],
  rowHeight = "short",
  frozenColumnCount = 0,
  recordLabel = "Record",
  onSortsChange,
  onFiltersChange,
  onGroupsChange,
  onFrozenColumnCountChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
}: {
  tableId: string;
  hiddenFields?: Record<string, boolean>;
  filters?: FilterTree;
  sorts?: SortRule[];
  groups?: GroupRule[];
  rowHeight?: RowHeight;
  frozenColumnCount?: number;
  recordLabel?: string;
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterTree) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onFrozenColumnCountChange?: (count: number) => void;
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
  const [freezeCount, setFreezeCount] = useState(frozenColumnCount);

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
  const [preloadedRows, setPreloadedRows] = useState<PreloadRow[] | null>(null);
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
    () => allCols.filter((column, index) => index === 0 || !hiddenFields[column.id]),
    [allCols, hiddenFields],
  );

  useEffect(() => {
    setFreezeCount((prev) => Math.max(0, Math.min(prev, visCols.length)));
  }, [visCols.length]);

  useEffect(() => {
    const nextFrozenColumnCount = Math.max(0, frozenColumnCount);
    setFreezeCount((prev) => (prev === nextFrozenColumnCount ? prev : nextFrozenColumnCount));
  }, [frozenColumnCount]);

  const handleFreezeCountChange = useCallback(
    (nextCount: number) => {
      setFreezeCount(nextCount);
      onFrozenColumnCountChange?.(nextCount);
    },
    [onFrozenColumnCountChange],
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
  const safeUpdateCellWithPreloaded = useCallback(
    (rowId: string, columnId: string, value: string | null) => {
      setPreloadedRows((prev) => {
        if (!prev?.length) return prev;
        let touched = false;
        const next = prev.map((row) => {
          if (row.id !== rowId) return row;
          touched = true;
          const existing = row.cells.find((cell) => cell.columnId === columnId);
          if (existing) {
            return {
              ...row,
              cells: row.cells.map((cell) =>
                cell.columnId === columnId ? { ...cell, value } : cell,
              ),
            };
          }
          return {
            ...row,
            cells: [...row.cells, { columnId, value }],
          };
        });
        return touched ? next : prev;
      });
      safeUpdateCell(rowId, columnId, value);
    },
    [safeUpdateCell],
  );
  const deleteRowWithPreloaded = useMemo(
    () => ({
      mutate: (value: { rowId: string }) => {
        setPreloadedRows((prev) =>
          prev?.length ? prev.filter((row) => row.id !== value.rowId) : prev,
        );
        deleteRow.mutate(value);
      },
    }),
    [deleteRow],
  );
  const bulkDeleteRowsWithPreloaded = useMemo(
    () => ({
      mutate: (value: BulkDeleteRowsPayload) => {
        setPreloadedRows((prev) => {
          if (!prev?.length) return prev;
          if (!("rowIds" in value)) return null;
          const doomed = new Set(value.rowIds);
          if (doomed.size === 0) return prev;
          return prev.filter((row) => !doomed.has(row.id));
        });
        bulkDeleteRows.mutate(value);
      },
    }),
    [bulkDeleteRows],
  );
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
    changePrimaryField,
    resizeColumn,
    addOption,
    deleteOption,
    updateOption,
  } = useGridViewColumnMutations({ tableId, ...cacheHelpers });

  const baseRows = useMemo(
    () => ((table?.rows as RowWithCells[] | undefined) ?? []),
    [table?.rows],
  );
  const columnById = useMemo(
    () => new Map(allCols.map((column) => [column.id, column])),
    [allCols],
  );
  const normalizedFilters = useMemo(() => normalizeFilterTree(filters), [filters]);
  const combinedRows = useMemo(
    () =>
      preloadedRows
        ? [...baseRows, ...(preloadedRows as unknown as RowWithCells[])]
        : baseRows,
    [baseRows, preloadedRows],
  );
  const getGridCellValue = useCallback(
    (row: RowWithCells, columnId: string) => {
      const existingCell = row.cells.find((cell) => cell.columnId === columnId);
      if (existingCell) return existingCell.value ?? "";

      const column = columnById.get(columnId);
      if (!column || !isBulkGeneratedRowId(row.id)) return "";

      return makeFallbackCellValue({
        columnType: column.type,
        columnName: column.name,
        rowOrder: row.order,
        columnId,
        selectOptionLabels: column.selectOptions?.map((option) => option.label) ?? [],
      });
    },
    [columnById],
  );

  const noTransform = !hasActiveFilters(normalizedFilters) && sorts.length === 0 && groups.length === 0;
  const rowsForTransforms = useMemo(() => {
    if (noTransform) return combinedRows;
    return combinedRows.map((row) => ({
      ...row,
      cells: allCols.map((column) => ({
        id: `pv:${row.id}:${column.id}`,
        rowId: row.id,
        columnId: column.id,
        value: getGridCellValue(row, column.id) || null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })),
    }));
  }, [noTransform, combinedRows, allCols, getGridCellValue]);

  const flatItems = useMemo(() => {
    if (!table) return [];
    if (noTransform) {
      return combinedRows.map((row) => ({ kind: "row" as const, row }));
    }
    const filtered = applyFilters(rowsForTransforms, normalizedFilters);
    const sorted = applySorts(filtered, sorts, table.columns);
    const grouped = applyGroups(sorted, groups);
    return flattenGroupTree(grouped);
  }, [table, noTransform, combinedRows, rowsForTransforms, normalizedFilters, sorts, groups]);

  const rowNumbers = useMemo(() => {
    let n = 0;
    return flatItems.map((item) => (item.kind === "row" ? ++n : null));
  }, [flatItems]);

  const allRowsForSummary = useMemo(() => {
    if (!table) return [];
    if (noTransform) return combinedRows;
    return flatItems.flatMap((item) => (item.kind === "row" ? [item.row] : []));
  }, [table, noTransform, combinedRows, flatItems]);

  const resolvedRowHeight: RowHeight =
    rowHeight in ROW_HEIGHT_PX ? rowHeight : "short";
  const rowH = ROW_HEIGHT_PX[resolvedRowHeight];
  const isTall = resolvedRowHeight === "tall" || resolvedRowHeight === "extra-tall";

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

  const tableLoadedRows = combinedRows.length;
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
    setPreloadedRows(null);
    scrollTopRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    forceRender((n) => n + 1);
    setFreezeCount(0);
  }, [tableId]);

  useEffect(() => {
    if (!table) return;

    const total = table.rowCount;
    const loaded = (table.rows.length ?? 0) + (preloadedRows?.length ?? 0);
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

    const batchSize = MAX_PRELOAD_BATCH_ROWS;

    const cycleId = ++preloadCycle.current;
    setLoadAllLoading(true);
    setLoadAllPhase("fetching");
    setLoadAllError(null);
    setPreloadProgressRows(loaded);

    void (async () => {
      const existingRows = [
        ...(table.rows as unknown as PreloadRow[]),
        ...(preloadedRows ?? []),
      ];
      const seenIds = new Set(existingRows.map((row) => row.id));
      let lastOrder = existingRows.length > 0 ? existingRows[existingRows.length - 1]!.order : -1;
      const newRows: PreloadRow[] = [];
      let steps = 0;
      let emptyBatchRetries = 0;

      while (seenIds.size < total) {
        steps += 1;
        if (steps > MAX_PRELOAD_STEPS) {
          throw new Error("Stopped preload to avoid an infinite fetch loop.");
        }
        const remaining = total - seenIds.size;
        let rows: PreloadRow[] = [];
        let requestTake = Math.min(batchSize, remaining);
        let lastBatchError: unknown = null;

        for (let attempt = 0; attempt <= MAX_BATCH_FETCH_RETRIES; attempt += 1) {
          try {
            const batch = await loadRowsAfterOrder.mutateAsync({
              tableId,
              afterOrder: lastOrder,
              take: requestTake,
            });
            rows = batch.rows.map((row) => ({
              id: row.id,
              order: row.order,
              tableId,
              cells:
                batch.columnId.length > 0
                  ? [{ columnId: batch.columnId, value: row.value }]
                  : [],
            }));
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
      setPreloadedRows((prev) => (prev ? [...prev, ...newRows] : newRows));
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
    preloadedRows?.length,
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

  function handleCellClick(row: RowWithCells, col: { id: string; type: string }) {
    setHeaderPanel(null);
    if (editing?.rowId === row.id && editing.columnId === col.id) return;

    if (col.type === "CHECKBOX") {
      setOpenSelectCell(null);
      safeUpdateCellWithPreloaded(
        row.id,
        col.id,
        getGridCellValue(row, col.id) === "true" ? "false" : "true",
      );
      return;
    }

    if (isSelect(col.type)) {
      const cellId = `${row.id}-${col.id}`;
      setEditing(null);
      setOpenSelectCell((prev) => (prev === cellId ? null : cellId));
      return;
    }

    setOpenSelectCell(null);

    if (col.type === "ATTACHMENT") {
      return;
    }

    setEditing({ rowId: row.id, columnId: col.id, value: getGridCellValue(row, col.id) });
  }

  function commitEdit() {
    if (!editing) return;
    safeUpdateCellWithPreloaded(editing.rowId, editing.columnId, editing.value || null);
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
      const primaryColumn = allCols[0];
      const movableColumns = allCols.slice(1);
      const from = movableColumns.findIndex((column) => column.id === dragColId);
      const to = movableColumns.findIndex((column) => column.id === dragOverColId);
      if (primaryColumn && from >= 0 && to >= 0) {
        const reordered = [...movableColumns];
        const moved = reordered.splice(from, 1)[0];
        if (moved) {
          reordered.splice(to, 0, moved);
          reorderColumns.mutate({
            tableId,
            orderedIds: [primaryColumn.id, ...reordered.map((column) => column.id)],
          });
        }
      }
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
      allCols={allCols}
      sorts={sorts}
      visCols={visCols}
      freezeCount={freezeCount}
      onFreezeCountChange={handleFreezeCountChange}
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
      updateColumnDescription={updateColumnDescription}
      duplicateColumn={duplicateColumn}
      insertColumnLeft={insertColumnLeft}
      insertColumnRight={insertColumnRight}
      changePrimaryField={changePrimaryField}
      filters={normalizedFilters}
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
      getCellValue={getGridCellValue}
      isSelect={isSelect}
      safeUpdateCell={safeUpdateCellWithPreloaded}
      commitEdit={commitEdit}
      deleteRow={deleteRowWithPreloaded}
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
      bulkDeleteRows={bulkDeleteRowsWithPreloaded}
      reorderRows={reorderRows}
      canReorderRows={noTransform}
      allRowsForSummary={allRowsForSummary}
      recordLabel={recordLabel}
    />
  );
}
