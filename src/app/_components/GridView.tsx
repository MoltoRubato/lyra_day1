"use client";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { ColumnType } from "@prisma/client";
import { api } from "~/trpc/react";
import {
  getCellValue, applyFilters, applySorts, applyGroups, flattenGroupTree,
  ROW_HEIGHT_PX,
  type RowWithCells, type FilterCondition, type SortRule,
  type GroupRule, type RowHeight,
} from "./tableUtils";
import { GridViewTable } from "./GridViewTable";
type EditingCell = { rowId: string; columnId: string; value: string };
const OVERSCAN = 15;
export default function GridView({
  tableId,
  hiddenFields = {},
  filters      = [],
  sorts        = [],
  groups       = [],
  rowHeight    = "short",
  recordLabel  = "Record",
  onSortsChange,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
}: {
  tableId:        string;
  hiddenFields?:  Record<string, boolean>;
  filters?:       FilterCondition[];
  sorts?:         SortRule[];
  groups?:        GroupRule[];
  rowHeight?:     RowHeight;
  recordLabel?:   string;
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
}) {
  const utils = api.useUtils();
  const { data: table, isLoading, error } = api.table.getById.useQuery({ id: tableId });
  const cancelCache   = useCallback(
    () => utils.table.getById.cancel({ id: tableId }),
    [utils, tableId],
  );
  const snapshotCache = useCallback(
    () => utils.table.getById.getData({ id: tableId }),
    [utils, tableId],
  );
  const patchCache = useCallback(
    (updater: Parameters<typeof utils.table.getById.setData>[1]) => {
      utils.table.getById.setData({ id: tableId }, updater);
    },
    [utils, tableId],
  );
  const restoreCache = useCallback(
    (snap: ReturnType<typeof snapshotCache>) => {
      utils.table.getById.setData({ id: tableId }, snap);
    },
    [utils, tableId],
  );
  const invalidate = useCallback(
    () => void utils.table.getById.invalidate({ id: tableId }),
    [utils, tableId],
  );
  const updateCell = api.table.updateCell.useMutation({
    onMutate: async ({ rowId, columnId, value }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => prev ? {
        ...prev,
        rows: prev.rows.map((r) => r.id !== rowId ? r : {
          ...r, cells: r.cells.map((c) => c.columnId !== columnId ? c : { ...c, value }),
        }),
      } : prev);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const addRow = api.table.addRow.useMutation({
  onMutate: async () => {
    await cancelCache();
    const snapshot = snapshotCache();
    const tempId = `temp-${Date.now()}`;
    patchCache((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: [...prev.rows, {
          id: tempId, tableId, order: prev.rows.length,
          createdAt: new Date(), updatedAt: new Date(),
          cells: prev.columns.map((c) => ({
            id: `tc-${c.id}-${tempId}`, rowId: tempId, columnId: c.id,
            value: null, createdAt: new Date(), updatedAt: new Date(),
          })),
        }],
        rowCount: prev.rowCount + 1,
      };
    });
    const firstEditable = visCols.find(
      (c) => c.type !== "CHECKBOX" && c.type !== "ATTACHMENT" && !isSelect(c.type)
    );
    if (firstEditable) {
      setEditing({ rowId: tempId, columnId: firstEditable.id, value: "" });
    }
    return { snapshot, tempId };
  },
  onSuccess: (realRow, _vars, ctx) => {
    if (!ctx?.tempId) return;
    const { tempId } = ctx;
    tempToRealId.current[tempId] = realRow.id;
    patchCache((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) =>
          r.id === tempId
            ? { ...realRow, cells: r.cells.map((c) => ({ ...c, rowId: realRow.id })) }
            : r
        ),
      };
    });
    setEditing((prev) =>
      prev?.rowId === tempId ? { ...prev, rowId: realRow.id } : prev
    );
    const queued = pendingEdits.current.filter((e) => e.tempRowId === tempId);
    pendingEdits.current = pendingEdits.current.filter((e) => e.tempRowId !== tempId);
    for (const edit of queued) {
      updateCell.mutate({ rowId: realRow.id, columnId: edit.columnId, value: edit.value });
    }
  },
  onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
  onSettled: invalidate,
});
  const deleteRow = api.table.deleteRow.useMutation({
    onMutate: async ({ rowId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) => p ? { ...p, rows: p.rows.filter((r) => r.id !== rowId), rowCount: Math.max(0, p.rowCount - 1) } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const addColumn = api.table.addColumn.useMutation({
    onMutate: async ({ name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const tempId = `temp-col-${Date.now()}`;
      patchCache((prev) => {
        if (!prev) return prev;
        const createdAt = new Date();
        return {
          ...prev,
          columns: [...prev.columns, {
            id: tempId, name, type: type ?? "TEXT",
            description: null,
            order: prev.columns.length, width: 180, tableId,
            createdAt, updatedAt: createdAt,
            selectOptions: [],
          }],
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [...r.cells, {
              id: `tc-${tempId}-${r.id}`, rowId: r.id, columnId: tempId,
              value: null, createdAt, updatedAt: createdAt,
            }],
          })),
        };
      });
      return { snapshot, tempId };
    },
    onSuccess: (realColumn, _vars, ctx) => {
      if (!ctx?.tempId) return;
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id !== ctx.tempId
              ? col
              : {
                ...col,
                id: realColumn.id,
                name: realColumn.name,
                type: realColumn.type,
                description: realColumn.description ?? null,
                order: realColumn.order,
                width: realColumn.width,
                tableId: realColumn.tableId,
                createdAt: realColumn.createdAt,
                updatedAt: realColumn.updatedAt,
                selectOptions: realColumn.selectOptions ?? [],
              }
          ),
          rows: prev.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) =>
              cell.columnId !== ctx.tempId
                ? cell
                : { ...cell, columnId: realColumn.id }
            ),
          })),
        };
      });
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const deleteColumn = api.table.deleteColumn.useMutation({
    onMutate: async ({ columnId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) => p ? {
        ...p,
        columns: p.columns.filter((c) => c.id !== columnId),
        rows: p.rows.map((r) => ({ ...r, cells: r.cells.filter((c) => c.columnId !== columnId) })),
      } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const renameColumn = api.table.renameColumn.useMutation({
    onMutate: async ({ columnId, name }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, name } : c) } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const changeType = api.table.changeColumnType.useMutation({
    onMutate: async ({ columnId, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, type } : c) } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const bulkDeleteRows = api.table.bulkDeleteRows.useMutation({
    onMutate: async ({ rowIds }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const doomed = new Set(rowIds);
      patchCache((p) => p ? {
        ...p,
        rows: p.rows.filter((r) => !doomed.has(r.id)),
        rowCount: Math.max(0, p.rowCount - doomed.size),
      } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const updateColumnDescription = api.table.updateColumnDescription.useMutation({
    onMutate: async ({ columnId, description }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((p) => p ? {
        ...p,
        columns: p.columns.map((c) => c.id === columnId ? { ...c, description } : c),
      } : p);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const duplicateColumn = api.table.duplicateColumn.useMutation({
    onMutate: async ({ columnId, duplicateCells }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const source = prev.columns.find((c) => c.id === columnId);
        if (!source) return prev;

        const copiedName = `${source.name} copy`;
        const used = new Set(prev.columns.map((c) => c.name.toLowerCase()));
        let finalName = copiedName;
        let suffix = 2;
        while (used.has(finalName.toLowerCase())) {
          finalName = `${copiedName} ${suffix}`;
          suffix += 1;
        }

        const tempId = `temp-col-copy-${Date.now()}`;
        const nextOrder = source.order + 1;
        const createdAt = new Date();
        const inserted = {
          id: tempId,
          name: finalName,
          description: source.description ?? null,
          type: source.type,
          order: nextOrder,
          width: source.width,
          tableId: source.tableId,
          createdAt,
          updatedAt: createdAt,
          selectOptions: (source.selectOptions ?? []).map((opt, idx) => ({
            ...opt,
            id: `temp-opt-copy-${Date.now()}-${idx}`,
            columnId: tempId,
          })),
        };

        return {
          ...prev,
          columns: [
            ...prev.columns
              .map((c) => (c.order > source.order ? { ...c, order: c.order + 1 } : c)),
            inserted,
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => {
            const sourceValue = r.cells.find((cell) => cell.columnId === source.id)?.value ?? null;
            return {
              ...r,
              cells: [
                ...r.cells,
                {
                  id: `tc-${tempId}-${r.id}`,
                  rowId: r.id,
                  columnId: tempId,
                  value: duplicateCells ? sourceValue : null,
                  createdAt,
                  updatedAt: createdAt,
                },
              ],
            };
          }),
        };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const insertColumnLeft = api.table.insertColumnLeft.useMutation({
    onMutate: async ({ anchorColumnId, name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const colName = name ?? "New field";
      const colType = type ?? "TEXT";
      patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.columns.find((c) => c.id === anchorColumnId);
        if (!anchor) return prev;

        const tempId = `temp-col-left-${Date.now()}`;
        const createdAt = new Date();
        return {
          ...prev,
          columns: [
            ...prev.columns
              .map((c) => (c.order >= anchor.order ? { ...c, order: c.order + 1 } : c)),
            {
              id: tempId,
              name: colName,
              description: null,
              type: colType,
              order: anchor.order,
              width: 180,
              tableId: anchor.tableId,
              createdAt,
              updatedAt: createdAt,
              selectOptions: [],
            },
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [
              ...r.cells,
              {
                id: `tc-${tempId}-${r.id}`,
                rowId: r.id,
                columnId: tempId,
                value: null,
                createdAt,
                updatedAt: createdAt,
              },
            ],
          })),
        };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const insertColumnRight = api.table.insertColumnRight.useMutation({
    onMutate: async ({ anchorColumnId, name, type }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const colName = name ?? "New field";
      const colType = type ?? "TEXT";
      patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.columns.find((c) => c.id === anchorColumnId);
        if (!anchor) return prev;

        const tempId = `temp-col-right-${Date.now()}`;
        const createdAt = new Date();
        const insertOrder = anchor.order + 1;
        return {
          ...prev,
          columns: [
            ...prev.columns
              .map((c) => (c.order > anchor.order ? { ...c, order: c.order + 1 } : c)),
            {
              id: tempId,
              name: colName,
              description: null,
              type: colType,
              order: insertOrder,
              width: 180,
              tableId: anchor.tableId,
              createdAt,
              updatedAt: createdAt,
              selectOptions: [],
            },
          ].sort((a, b) => a.order - b.order),
          rows: prev.rows.map((r) => ({
            ...r,
            cells: [
              ...r.cells,
              {
                id: `tc-${tempId}-${r.id}`,
                rowId: r.id,
                columnId: tempId,
                value: null,
                createdAt,
                updatedAt: createdAt,
              },
            ],
          })),
        };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const reorderColumns = api.table.reorderColumns.useMutation({
    onMutate: async ({ orderedIds }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const byId = Object.fromEntries(prev.columns.map((c) => [c.id, c]));
        return { ...prev, columns: orderedIds.map((id, i) => ({ ...byId[id]!, order: i })) };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const reorderRows = api.table.reorderRows.useMutation({
    onMutate: async ({ orderedIds }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows
            .map((r) => ({
              ...r,
              order: orderMap.has(r.id) ? (orderMap.get(r.id) ?? r.order) : r.order,
            }))
            .sort((a, b) => a.order - b.order),
        };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const resizeColumn = api.table.resizeColumn.useMutation({
    onMutate: ({ columnId, width }) =>
      patchCache((p) => p ? { ...p, columns: p.columns.map((c) => c.id === columnId ? { ...c, width } : c) } : p),
  });
  const addOption = api.table.addSelectOption.useMutation({
    onMutate: async ({ columnId, label, color }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => {
        if (!prev) return prev;
        const tempId = `temp-opt-${Date.now()}`;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id !== columnId ? col : {
              ...col,
              selectOptions: [
                ...(col.selectOptions ?? []),
                { id: tempId, label, color: color ?? "#166254", order: (col.selectOptions ?? []).length, columnId },
              ],
            }
          ),
        };
      });
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const deleteOption = api.table.deleteSelectOption.useMutation({
    onMutate: async ({ optionId }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => prev ? {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col, selectOptions: (col.selectOptions ?? []).filter((o) => o.id !== optionId),
        })),
      } : prev);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const updateOption = api.table.updateSelectOption.useMutation({
    onMutate: async ({ optionId, label, color }) => {
      await cancelCache();
      const snapshot = snapshotCache();
      patchCache((prev) => prev ? {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          selectOptions: (col.selectOptions ?? []).map((o) =>
            o.id !== optionId ? o : {
              ...o,
              ...(label !== undefined ? { label } : {}),
              ...(color !== undefined ? { color } : {}),
            }
          ),
        })),
      } : prev);
      return { snapshot };
    },
    onError:   (_e, _v, ctx) => restoreCache(ctx?.snapshot),
    onSettled: invalidate,
  });
  const safeUpdateCell = useCallback(
    (rowId: string, columnId: string, value: string | null) => {
      const realId = tempToRealId.current[rowId] ?? rowId;
      if (realId.startsWith("temp-")) {
        patchCache((prev) => prev ? {
          ...prev,
          rows: prev.rows.map((r) => r.id !== realId ? r : {
            ...r, cells: r.cells.map((c) => c.columnId !== columnId ? c : { ...c, value }),
          }),
        } : prev);
        pendingEdits.current.push({ tempRowId: rowId, columnId, value });
        return;
      }
      updateCell.mutate({ rowId: realId, columnId, value });
    },
    [updateCell, patchCache],
  );
  const [editing, setEditing]               = useState<EditingCell | null>(null);
  const [renamingCol, setRenamingCol]       = useState<{ id: string; value: string } | null>(null);
  const [openSelectCell, setOpenSelectCell] = useState<string | null>(null);
  const [headerPanel, setHeaderPanel]       = useState<{ colId: string; panel: "type" | "options" } | null>(null);
  const [addingCol, setAddingCol]           = useState(false);
  const [newColName, setNewColName]         = useState("");
  const [newColType, setNewColType]         = useState("TEXT");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dragColId, setDragColId]           = useState<string | null>(null);
  const [dragOverColId, setDragOverColId]   = useState<string | null>(null);
  const resizingRef   = useRef<{ colId: string; startX: number; startW: number } | null>(null);
  const tempToRealId  = useRef<Record<string, string>>({});
  const pendingEdits  = useRef<Array<{ tempRowId: string; columnId: string; value: string | null }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const rafPending   = useRef(false);
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
  const [chunkLoading, setChunkLoading] = useState(false);
  useEffect(() => {
    if (!table) return;
    const loaded = table.rows.length;
    const total  = table.rowCount;
    if (loaded >= total) return;
    if (chunkLoading) return;
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
  }, [table?.rows.length, table?.rowCount, chunkLoading]);
  const allCols = useMemo(
    () => [...(table?.columns ?? [])].sort((a, b) => a.order - b.order),
    [table?.columns],
  );
  const visCols = useMemo(
    () => allCols.filter((c) => !hiddenFields[c.id]),
    [allCols, hiddenFields],
  );
  const flatItems = useMemo(() => {
    if (!table) return [];
    const filtered = applyFilters(table.rows as RowWithCells[], filters);
    const sorted   = applySorts(filtered, sorts, table.columns);
    const grouped  = applyGroups(sorted, groups);
    return flattenGroupTree(grouped);
  }, [table, filters, sorts, groups]);
  const rowNumbers = useMemo(() => {
    let n = 0;
    return flatItems.map((item) => (item.kind === "row" ? ++n : null));
  }, [flatItems]);
  const allRowsForSummary = useMemo(
    () => flatItems.flatMap((item) => item.kind === "row" ? [item.row] : []),
    [flatItems],
  );
  const rowH     = ROW_HEIGHT_PX[rowHeight];
  const isTall   = rowHeight === "tall" || rowHeight === "extra-tall";
  const isSelect = (type: string) => type === "SINGLE_SELECT" || type === "MULTI_SELECT";
  const noTransform = filters.length === 0 && sorts.length === 0 && groups.length === 0;
  const rawRowCount = table?.rowCount;
  const totalRows = rawRowCount ?? (table?.rows.length ?? 0);
  const visibleTotal = noTransform ? totalRows : flatItems.length;
  const loadedCount = flatItems.length;
  const scrollTop = scrollTopRef.current;
  const startIdx  = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const endIdx    = Math.min(loadedCount, Math.ceil((scrollTop + viewportH) / rowH) + OVERSCAN);
  const topPad    = startIdx * rowH;
  const bottomPad = Math.max(0, (visibleTotal - endIdx) * rowH);
  const visItems  = flatItems.slice(startIdx, endIdx);
  if (isLoading) return <div className="p-8 text-[#9ca3af] text-sm animate-pulse">Loading...</div>;
  if (error)     return <div className="p-8 text-red-400 text-sm">Failed to load table. Please refresh.</div>;
  if (!table)    return <div className="p-8 text-[#9ca3af] text-sm">Table not found.</div>;
  function handleHeaderSortClick(colId: string) {
    if (!onSortsChange) return;
    const existing = sorts.find((s) => s.columnId === colId);
    if (!existing) {
      onSortsChange([{ id: `s-${colId}`, columnId: colId, dir: "asc" }]);
    } else if (existing.dir === "asc") {
      onSortsChange(sorts.map((s) => s.columnId === colId ? { ...s, dir: "desc" } : s));
    } else {
      onSortsChange(sorts.filter((s) => s.columnId !== colId));
    }
  }
  function handleCellClick(row: RowWithCells, col: { id: string; type: string }) {
    setHeaderPanel(null);
    setOpenSelectCell(null);
    if (editing?.rowId === row.id && editing.columnId === col.id) return;
    if (col.type === "CHECKBOX") {
      safeUpdateCell(
        row.id, col.id,
        getCellValue(row, col.id) === "true" ? "false" : "true",
      );
    } else if (isSelect(col.type) || col.type === "ATTACHMENT") {
    } else {
      setEditing({ rowId: row.id, columnId: col.id, value: getCellValue(row, col.id) });
    }
  }
  function commitEdit() {
    if (!editing) return;
    safeUpdateCell(editing.rowId, editing.columnId, editing.value || null);
    setEditing(null);
  }
  function handleAddColumn() {
    if (!newColName.trim()) return;
    addColumn.mutate({ tableId, name: newColName.trim(), type: newColType as ColumnType });
    setNewColName(""); setNewColType("TEXT"); setAddingCol(false); setShowTypePicker(false);
  }
  function onDragEnd() {
    if (dragColId && dragOverColId && dragColId !== dragOverColId) {
      const from      = allCols.findIndex((c) => c.id === dragColId);
      const to        = allCols.findIndex((c) => c.id === dragOverColId);
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
      const w = Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX);
      patchCache((p) => p ? {
        ...p, columns: p.columns.map((c) => c.id === resizingRef.current!.colId ? { ...c, width: w } : c),
      } : p);
    };
    const onUp = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.round(Math.max(80, resizingRef.current.startW + ev.clientX - resizingRef.current.startX));
      resizeColumn.mutate({ columnId: resizingRef.current.colId, width: w });
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  return (
    <GridViewTable containerRef={containerRef} handleScroll={handleScroll} rowH={rowH} table={table}
      sorts={sorts} visCols={visCols} dragOverColId={dragOverColId} setDragColId={setDragColId}
      setDragOverColId={setDragOverColId} onDragEnd={onDragEnd} headerPanel={headerPanel}
      setHeaderPanel={setHeaderPanel} renamingCol={renamingCol} setRenamingCol={setRenamingCol}
      handleHeaderSortClick={handleHeaderSortClick} deleteColumn={deleteColumn} renameColumn={renameColumn}
      changeType={changeType} updateColumnDescription={updateColumnDescription} duplicateColumn={duplicateColumn}
      insertColumnLeft={insertColumnLeft} insertColumnRight={insertColumnRight}
      filters={filters} groups={groups} onSortsChange={onSortsChange} onFiltersChange={onFiltersChange}
      onGroupsChange={onGroupsChange} onRequestOpenSortPanel={onRequestOpenSortPanel}
      onRequestOpenFilterPanel={onRequestOpenFilterPanel} onRequestOpenGroupPanel={onRequestOpenGroupPanel}
      addOption={addOption} deleteOption={deleteOption} updateOption={updateOption}
      startResize={startResize} addingCol={addingCol} setAddingCol={setAddingCol} showTypePicker={showTypePicker}
      setShowTypePicker={setShowTypePicker} newColType={newColType} setNewColType={setNewColType}
      newColName={newColName} setNewColName={setNewColName} handleAddColumn={handleAddColumn}
      loadedCount={loadedCount} topPad={topPad} bottomPad={bottomPad} visItems={visItems} startIdx={startIdx}
      rowNumbers={rowNumbers} isTall={isTall} editing={editing} setEditing={setEditing}
      openSelectCell={openSelectCell} setOpenSelectCell={setOpenSelectCell} handleCellClick={handleCellClick}
      getCellValue={getCellValue} isSelect={isSelect} safeUpdateCell={safeUpdateCell} commitEdit={commitEdit}
      deleteRow={deleteRow} addRow={addRow} tableId={tableId} chunkLoading={chunkLoading} trueTotal={visibleTotal} totalRows={totalRows}
      bulkDeleteRows={bulkDeleteRows} reorderRows={reorderRows} canReorderRows={noTransform}
      allRowsForSummary={allRowsForSummary}
      recordLabel={recordLabel} />
  );
}
