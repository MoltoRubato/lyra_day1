import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnType } from "@prisma/client";
import { GridViewTableBody } from "~/app/_components/gridView/GridViewTableBody";
import { GridViewTableHeader } from "~/app/_components/gridView/GridViewTableHeader";
import { GridViewTableOverlays } from "~/app/_components/gridView/GridViewTableOverlays";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import type {
  CellRange,
  FieldEditorState,
  GridCellLocation,
  GridViewTableProps,
  SummaryOption,
  VisibleColumn,
} from "~/app/_components/gridView/tableTypes";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import { getActiveFilterFieldIds } from "~/app/_components/tableUtils";
import { isPrimaryFieldSupportedType } from "~/shared/primaryField";
import { useGridViewCacheHelpers } from "~/app/_components/gridView/useGridViewCacheHelpers";
import { api } from "~/trpc/react";

type ExpandedLongTextCell = GridCellLocation & {
  top: number;
  left: number;
  width: number;
  height: number;
};

const EXPANDED_LONG_TEXT_WIDTH = 480;
const EXPANDED_LONG_TEXT_HEIGHT = 482;
const DEFAULT_FILL_OPTION_COLOR = "#166254";
const SELECT_FIELD_TYPES = new Set<ColumnType>([
  "SINGLE_SELECT",
  "MULTI_SELECT",
]);
const TEXT_FILL_TYPES = new Set<ColumnType>([
  "TEXT",
  "LONG_TEXT",
]);

type FillSourceCell = {
  columnId: string;
  value: string | null;
  column: VisibleColumn | null;
};

type FillColumnUpdate = {
  columnId: string;
  type?: ColumnType;
  ensureOptions: Array<{ label: string; color: string }>;
};

function isSelectFieldType(type: ColumnType) {
  return SELECT_FIELD_TYPES.has(type);
}

function areFillTypesCompatible(sourceType: ColumnType, targetType: ColumnType) {
  if (sourceType === targetType) return true;

  const sourceIsSelect = isSelectFieldType(sourceType);
  const targetIsSelect = isSelectFieldType(targetType);
  const sourceIsText = TEXT_FILL_TYPES.has(sourceType);
  const targetIsText = TEXT_FILL_TYPES.has(targetType);

  if (sourceIsSelect && targetIsSelect) return true;
  if (sourceIsText && targetIsSelect) return true;
  if (sourceIsSelect && targetIsText) return true;

  return false;
}

function normalizeSelectLabels(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}

function computeFillTransfer(params: {
  sourceColumn: VisibleColumn;
  targetColumn: VisibleColumn;
  sourceValue: string | null;
}) {
  const { sourceColumn, targetColumn, sourceValue } = params;
  const sourceType = sourceColumn.type as ColumnType;
  const targetType = targetColumn.type as ColumnType;
  const trimmedValue = sourceValue?.trim() ?? "";

  if (!areFillTypesCompatible(sourceType, targetType)) {
    return {
      value: sourceValue,
      type: sourceType,
      ensureOptions: isSelectFieldType(sourceType)
        ? (sourceColumn.selectOptions ?? []).map((option) => ({
            label: option.label,
            color: option.color,
          }))
        : [],
    };
  }

  if (!isSelectFieldType(targetType)) {
    return {
      value: sourceValue,
      type: undefined,
      ensureOptions: [] as Array<{ label: string; color: string }>,
    };
  }

  if (trimmedValue.length === 0) {
    return {
      value: null,
      type: undefined,
      ensureOptions: [] as Array<{ label: string; color: string }>,
    };
  }

  const sourceLabels =
    targetType === "MULTI_SELECT" && isSelectFieldType(sourceType)
      ? normalizeSelectLabels(sourceValue)
      : [trimmedValue];

  return {
    value:
      targetType === "MULTI_SELECT"
        ? sourceLabels.join(", ")
        : trimmedValue,
    type: undefined,
    ensureOptions: sourceLabels.map((label) => ({
      label,
      color:
        sourceColumn.selectOptions?.find((option) => option.label === label)
          ?.color ?? DEFAULT_FILL_OPTION_COLOR,
    })),
  };
}

export function GridViewTable({
  containerRef,
  handleScroll,
  rowH,
  wrapHeaders,
  searchQuery,
  searchMatchedCellKeys,
  activeSearchCellKey,
  table,
  allCols,
  sorts,
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
  activateCell,
  focusCell,
  navigateAdjacentCell,
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
  visibleRowsInViewOrder,
  collapsedGroupKeys,
  onToggleGroupCollapsed,
  recordLabel = "record",
}: GridViewTableProps) {
  const [renderedRowHeaderWidth, setRenderedRowHeaderWidth] = useState<
    number | null
  >(null);
  const [renderedColumnWidths, setRenderedColumnWidths] = useState<number[]>(
    [],
  );
  const [renderedHeaderHeight, setRenderedHeaderHeight] = useState<
    number | null
  >(null);
  const [menuForCol, setMenuForCol] = useState<string | null>(null);
  const [hoveredInfoCol, setHoveredInfoCol] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<{
    colId: string;
    value: string;
  } | null>(null);
  const [fieldTypeListOpen, setFieldTypeListOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldEditorState | null>(
    null,
  );
  const [duplicatingField, setDuplicatingField] = useState<{
    colId: string;
    name: string;
    duplicateCells: boolean;
  } | null>(null);
  const [changingPrimaryField, setChangingPrimaryField] = useState(false);
  const [primaryFieldPickerOpen, setPrimaryFieldPickerOpen] = useState(false);
  const [primaryFieldSearch, setPrimaryFieldSearch] = useState("");
  const [selectedPrimaryFieldId, setSelectedPrimaryFieldId] = useState<
    string | null
  >(null);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [summaryByCol, setSummaryByCol] = useState<
    Record<string, SummaryOption>
  >({});
  const [summaryMenu, setSummaryMenu] = useState<{
    colId: string;
    targetId: string;
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);
  const [hoveredSummaryCol, setHoveredSummaryCol] = useState<string | null>(
    null,
  );
  const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] = useState(0);
  const [verticalScrollbarWidth, setVerticalScrollbarWidth] = useState(0);
  const [isFreezeDividerHover, setIsFreezeDividerHover] = useState(false);
  const [isFreezeDragging, setIsFreezeDragging] = useState(false);
  const [freezeTooltipTop, setFreezeTooltipTop] = useState(220);
  const [selectedCell, setSelectedCellState] = useState<GridCellLocation | null>(
    null,
  );
  const [cellContextMenu, setCellContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
  } | null>(null);
  const [cellRange, setCellRange] = useState<CellRange | null>(null);
  const isDraggingCellRange = useRef(false);
  const isDraggingFillHandle = useRef(false);
  const [fillTarget, setFillTarget] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [expandedLongTextCell, setExpandedLongTextCell] =
    useState<ExpandedLongTextCell | null>(null);
  const expandedLongTextTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const expandedLongTextContainerRef = useRef<HTMLDivElement | null>(null);
  const expandedLongTextDragCleanupRef = useRef<(() => void) | null>(null);
  const dividerBottomInset = Math.max(34, horizontalScrollbarHeight + 21.5);
  const primaryColumn = allCols[0] ?? null;
  const selectedPrimaryField = useMemo(
    () =>
      allCols.find((column) => column.id === selectedPrimaryFieldId) ?? null,
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
    n === 1
      ? labelLower
      : labelLower.endsWith("s")
        ? labelLower
        : `${labelLower}s`;

  const rowIdsInViewOrder = useMemo(
    () => visibleRowsInViewOrder.map((r) => r.id),
    [visibleRowsInViewOrder],
  );
  const columnsById = useMemo(
    () => new Map(allCols.map((column) => [column.id, column])),
    [allCols],
  );
  const visibleColumnsSignature = useMemo(
    () => visCols.map((col) => `${col.id}:${col.width}`).join("|"),
    [visCols],
  );
  const rowNumberWidth = renderedRowHeaderWidth ?? 80;
  const headerRowHeight = renderedHeaderHeight ?? rowH;
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
  const collapsedGroupKeySet = useMemo(
    () => new Set(collapsedGroupKeys),
    [collapsedGroupKeys],
  );
  const highlightedFilterColumnIds = useMemo(
    () => new Set(getActiveFilterFieldIds(filters)),
    [filters],
  );
  const highlightedSortColumnIds = useMemo(
    () => new Set(sorts.map((sort) => sort.columnId)),
    [sorts],
  );
  const highlightedGroupColumnIds = useMemo(
    () => new Set(groups.map((group) => group.columnId)),
    [groups],
  );
  const columnNameById = useMemo(
    () =>
      Object.fromEntries(
        allCols.map((column) => [column.id, column.name] as const),
      ),
    [allCols],
  );
  const groupLabelColumnId = useMemo(
    () =>
      visCols.find((column) => highlightedGroupColumnIds.has(column.id))?.id ??
      visCols[0]?.id ??
      null,
    [highlightedGroupColumnIds, visCols],
  );
  const rowById = useMemo(
    () => new Map(allRowsForSummary.map((row) => [row.id, row] as const)),
    [allRowsForSummary],
  );
  const columnById = useMemo(
    () => new Map(visCols.map((column) => [column.id, column] as const)),
    [visCols],
  );

  // Cell context menu row mutations (need access to selectGridCell)
  const cellMenuCacheHelpers = useGridViewCacheHelpers(tableId);

  const insertRowAbove = api.table.insertRowAbove.useMutation({
    onMutate: async ({ anchorRowId }) => {
      await cellMenuCacheHelpers.cancelCache();
      const snapshot = cellMenuCacheHelpers.snapshotCache();
      const tempId = `temp-${Date.now()}-above`;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.rows.find((r) => r.id === anchorRowId);
        if (!anchor) return prev;
        const insertOrder = anchor.order;
        const updatedRows = prev.rows.map((r) => ({
          ...r,
          order: r.order >= insertOrder ? r.order + 1 : r.order,
        }));
        const newRow = {
          id: tempId,
          tableId,
          order: insertOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          cells: prev.columns.map((c) => ({
            id: `tc-${c.id}-${tempId}`,
            rowId: tempId,
            columnId: c.id,
            value: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        };
        return {
          ...prev,
          rows: [...updatedRows, newRow].sort((a, b) => a.order - b.order),
          rowCount: prev.rowCount + 1,
        };
      });
      const firstEditable = visCols.find(
        (c) =>
          c.type !== "CHECKBOX" && c.type !== "ATTACHMENT" && !isSelect(c.type),
      );
      if (firstEditable) {
        setEditing({ rowId: tempId, columnId: firstEditable.id, value: "" });
      }
      return { snapshot, tempId };
    },
    onSuccess: (realRow, _vars, ctx) => {
      if (!ctx?.tempId) return;
      const { tempId } = ctx;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === tempId
              ? { ...realRow, cells: r.cells.map((c) => ({ ...c, rowId: realRow.id })) }
              : r,
          ),
        };
      });
      setEditing((prev) =>
        prev?.rowId === tempId ? { ...prev, rowId: realRow.id } : prev,
      );
    },
    onError: (_e, _v, ctx) => cellMenuCacheHelpers.restoreCache(ctx?.snapshot),
    onSettled: cellMenuCacheHelpers.invalidate,
  });

  const insertRowBelow = api.table.insertRowBelow.useMutation({
    onMutate: async ({ anchorRowId }) => {
      await cellMenuCacheHelpers.cancelCache();
      const snapshot = cellMenuCacheHelpers.snapshotCache();
      const tempId = `temp-${Date.now()}-below`;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        const anchor = prev.rows.find((r) => r.id === anchorRowId);
        if (!anchor) return prev;
        const insertOrder = anchor.order + 1;
        const updatedRows = prev.rows.map((r) => ({
          ...r,
          order: r.order > anchor.order ? r.order + 1 : r.order,
        }));
        const newRow = {
          id: tempId,
          tableId,
          order: insertOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          cells: prev.columns.map((c) => ({
            id: `tc-${c.id}-${tempId}`,
            rowId: tempId,
            columnId: c.id,
            value: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        };
        return {
          ...prev,
          rows: [...updatedRows, newRow].sort((a, b) => a.order - b.order),
          rowCount: prev.rowCount + 1,
        };
      });
      const firstEditable = visCols.find(
        (c) =>
          c.type !== "CHECKBOX" && c.type !== "ATTACHMENT" && !isSelect(c.type),
      );
      if (firstEditable) {
        setEditing({ rowId: tempId, columnId: firstEditable.id, value: "" });
      }
      return { snapshot, tempId };
    },
    onSuccess: (realRow, _vars, ctx) => {
      if (!ctx?.tempId) return;
      const { tempId } = ctx;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === tempId
              ? { ...realRow, cells: r.cells.map((c) => ({ ...c, rowId: realRow.id })) }
              : r,
          ),
        };
      });
      setEditing((prev) =>
        prev?.rowId === tempId ? { ...prev, rowId: realRow.id } : prev,
      );
    },
    onError: (_e, _v, ctx) => cellMenuCacheHelpers.restoreCache(ctx?.snapshot),
    onSettled: cellMenuCacheHelpers.invalidate,
  });

  const duplicateRow = api.table.duplicateRow.useMutation({
    onMutate: async ({ rowId }) => {
      await cellMenuCacheHelpers.cancelCache();
      const snapshot = cellMenuCacheHelpers.snapshotCache();
      const tempId = `temp-${Date.now()}-dup`;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        const sourceRow = prev.rows.find((r) => r.id === rowId);
        if (!sourceRow) return prev;
        const primaryColId = [...prev.columns].sort(
          (a, b) => a.order - b.order,
        )[0]?.id;
        const insertOrder = sourceRow.order + 1;
        const updatedRows = prev.rows.map((r) => ({
          ...r,
          order: r.order > sourceRow.order ? r.order + 1 : r.order,
        }));
        const newRow = {
          id: tempId,
          tableId,
          order: insertOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          cells: prev.columns.map((c) => {
            const sourceCell = sourceRow.cells.find(
              (sc) => sc.columnId === c.id,
            );
            return {
              id: `tc-${c.id}-${tempId}`,
              rowId: tempId,
              columnId: c.id,
              value:
                primaryColId &&
                c.id === primaryColId &&
                sourceCell?.value != null
                  ? `${sourceCell.value} copy`
                  : (sourceCell?.value ?? null),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        };
        return {
          ...prev,
          rows: [...updatedRows, newRow].sort((a, b) => a.order - b.order),
          rowCount: prev.rowCount + 1,
        };
      });
      const firstCol = visCols[0];
      if (firstCol) {
        selectGridCell({ rowId: tempId, columnId: firstCol.id });
      }
      return { snapshot, tempId };
    },
    onSuccess: (realRow, _vars, ctx) => {
      if (!ctx?.tempId) return;
      const { tempId } = ctx;
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === tempId
              ? { ...realRow, cells: r.cells.map((c) => ({ ...c, rowId: realRow.id })) }
              : r,
          ),
        };
      });
      setSelectedCellState((prev) =>
        prev?.rowId === tempId ? { ...prev, rowId: realRow.id } : prev,
      );
    },
    onError: (_e, _v, ctx) => cellMenuCacheHelpers.restoreCache(ctx?.snapshot),
    onSettled: cellMenuCacheHelpers.invalidate,
  });
  const expandedLongTextRow = expandedLongTextCell
    ? rowById.get(expandedLongTextCell.rowId) ?? null
    : null;
  const expandedLongTextColumn = expandedLongTextCell
    ? columnById.get(expandedLongTextCell.columnId) ?? null
    : null;
  const expandedLongTextValue =
    expandedLongTextCell && expandedLongTextRow
      ? editing?.rowId === expandedLongTextCell.rowId &&
        editing?.columnId === expandedLongTextCell.columnId
        ? editing.value
        : getCellValue(expandedLongTextRow, expandedLongTextCell.columnId)
      : "";

  const clampExpandedLongTextPosition = useCallback(
    (left: number, top: number, width: number, height: number) => {
      if (typeof window === "undefined") return { left, top };
      const horizontalMargin = 24;
      const verticalMargin = 24;
      const maxLeft = Math.max(
        horizontalMargin,
        window.innerWidth - width - horizontalMargin,
      );
      const maxTop = Math.max(
        verticalMargin,
        window.innerHeight - height - verticalMargin,
      );
      return {
        left: Math.max(horizontalMargin, Math.min(maxLeft, left)),
        top: Math.max(verticalMargin, Math.min(maxTop, top)),
      };
    },
    [],
  );

  const getExpandedLongTextDimensions = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        width: EXPANDED_LONG_TEXT_WIDTH,
        height: EXPANDED_LONG_TEXT_HEIGHT,
      };
    }
    return {
      width: Math.min(
        EXPANDED_LONG_TEXT_WIDTH,
        Math.max(320, window.innerWidth - 32),
      ),
      height: Math.min(
        EXPANDED_LONG_TEXT_HEIGHT,
        Math.max(240, window.innerHeight - 32),
      ),
    };
  }, []);

  const selectGridCell = useCallback(
    (nextCell: GridCellLocation | null) => {
      if (!nextCell) {
        setSelectedCellState(null);
        setOpenSelectCell(null);
        setExpandedLongTextCell(null);
        setCellRange(null);
        return;
      }
      if (!isDraggingCellRange.current && !isDraggingFillHandle.current) {
        setCellRange(null);
      }

      const nextCellId = `${nextCell.rowId}-${nextCell.columnId}`;
      const editingDifferentCell =
        editing &&
        (editing.rowId !== nextCell.rowId ||
          editing.columnId !== nextCell.columnId);
      const expandedDifferentCell =
        expandedLongTextCell &&
        (expandedLongTextCell.rowId !== nextCell.rowId ||
          expandedLongTextCell.columnId !== nextCell.columnId);

      if (editingDifferentCell) {
        commitEdit();
      }

      if (expandedDifferentCell) {
        setExpandedLongTextCell(null);
      }

      if (openSelectCell && openSelectCell !== nextCellId) {
        setOpenSelectCell(null);
      }

      setSelectedCellState(nextCell);
    },
    [commitEdit, editing, expandedLongTextCell, openSelectCell, setOpenSelectCell],
  );

  const closeExpandedLongTextEditor = useCallback(
    ({
      commit = true,
      restoreFocus = true,
    }: { commit?: boolean; restoreFocus?: boolean } = {}) => {
      if (!expandedLongTextCell) return;

      const { rowId, columnId } = expandedLongTextCell;
      const isEditingExpandedCell =
        editing?.rowId === rowId && editing?.columnId === columnId;

      if (isEditingExpandedCell) {
        if (commit) {
          commitEdit();
        } else {
          setEditing(null);
        }
      }

      setExpandedLongTextCell(null);
      setSelectedCellState({ rowId, columnId });
      if (restoreFocus) {
        requestAnimationFrame(() => {
          focusCell(rowId, columnId);
        });
      }
    },
    [commitEdit, editing, expandedLongTextCell, focusCell, setEditing],
  );

  const openExpandedLongTextEditor = useCallback(
    (rowId: string, columnId: string, anchorRect?: DOMRect) => {
      const row = rowById.get(rowId);
      const column = columnById.get(columnId);
      if (!row || column?.type !== "LONG_TEXT") return;

      const nextSelection = { rowId, columnId };
      const nextDimensions = getExpandedLongTextDimensions();
      const desiredLeft = anchorRect
        ? anchorRect.left - 8
        : Math.round((window.innerWidth - nextDimensions.width) / 2);
      const cellCenterY = anchorRect
        ? anchorRect.top + anchorRect.height / 2
        : window.innerHeight / 2;
      const desiredTop = Math.round(
        cellCenterY - nextDimensions.height / 2,
      );
      const centeredPosition = clampExpandedLongTextPosition(
        desiredLeft,
        desiredTop,
        nextDimensions.width,
        nextDimensions.height,
      );

      setHeaderPanel(null);
      setOpenSelectCell(null);
      setSelectedCellState(nextSelection);

      const isEditingTargetCell =
        editing?.rowId === rowId && editing?.columnId === columnId;

      if (editing && !isEditingTargetCell) {
        commitEdit();
      }

      if (!isEditingTargetCell) {
        setEditing({
          rowId,
          columnId,
          value: getCellValue(row, columnId),
        });
      }

      setExpandedLongTextCell((prev) =>
        prev && prev.rowId === rowId && prev.columnId === columnId
          ? prev
          : {
              ...nextSelection,
              ...centeredPosition,
              ...nextDimensions,
            },
      );

      requestAnimationFrame(() => {
        expandedLongTextTextareaRef.current?.focus({ preventScroll: true });
      });
    },
    [
      clampExpandedLongTextPosition,
      columnById,
      commitEdit,
      editing,
      getCellValue,
      getExpandedLongTextDimensions,
      rowById,
      setEditing,
      setHeaderPanel,
      setOpenSelectCell,
    ],
  );

  const beginExpandedLongTextDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!expandedLongTextCell) return;
      event.preventDefault();

      const { clientX: startX, clientY: startY } = event;
      const { left: originLeft, top: originTop, width, height } =
        expandedLongTextCell;
      let lastLeft = originLeft;
      let lastTop = originTop;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextPosition = clampExpandedLongTextPosition(
          originLeft + (moveEvent.clientX - startX),
          originTop + (moveEvent.clientY - startY),
          width,
          height,
        );
        lastLeft = nextPosition.left;
        lastTop = nextPosition.top;
        const el = expandedLongTextContainerRef.current;
        if (el) {
          el.style.left = `${nextPosition.left}px`;
          el.style.top = `${nextPosition.top}px`;
        }
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", cleanup);
        expandedLongTextDragCleanupRef.current = null;
        setExpandedLongTextCell((prev) =>
          prev ? { ...prev, left: lastLeft, top: lastTop } : prev,
        );
      };

      expandedLongTextDragCleanupRef.current?.();
      expandedLongTextDragCleanupRef.current = cleanup;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", cleanup);
    },
    [clampExpandedLongTextPosition, expandedLongTextCell],
  );

  useEffect(() => {
    if (!visibleRowsInViewOrder.length) {
      setSelectedRowIds([]);
      return;
    }
    const valid = new Set(visibleRowsInViewOrder.map((r) => r.id));
    setSelectedRowIds((prev) => prev.filter((id) => valid.has(id)));
  }, [visibleRowsInViewOrder]);

  useEffect(() => {
    if (!changingPrimaryField) return;
    if (!primaryColumn) {
      setChangingPrimaryField(false);
      return;
    }
    setSelectedPrimaryFieldId((prev) => prev ?? primaryColumn.id);
  }, [changingPrimaryField, primaryColumn]);

  useEffect(() => {
    if (!selectedCell) return;
    const hasSelectedRow = visibleRowsInViewOrder.some(
      (row) => row.id === selectedCell.rowId,
    );
    const hasSelectedColumn = visCols.some(
      (column) => column.id === selectedCell.columnId,
    );
    if (!hasSelectedRow || !hasSelectedColumn) {
      setSelectedCellState(null);
    }
  }, [selectedCell, visCols, visibleRowsInViewOrder]);

  useEffect(() => {
    if (!expandedLongTextCell) return;
    if (
      !expandedLongTextRow ||
      expandedLongTextColumn?.type !== "LONG_TEXT" ||
      editing?.rowId !== expandedLongTextCell.rowId ||
      editing?.columnId !== expandedLongTextCell.columnId
    ) {
      setExpandedLongTextCell(null);
    }
  }, [editing, expandedLongTextCell, expandedLongTextColumn, expandedLongTextRow]);

  useEffect(() => {
    if (!expandedLongTextCell) return;

    const handleResize = () => {
      setExpandedLongTextCell((prev) => {
        if (!prev) return prev;
        const nextDimensions = getExpandedLongTextDimensions();
        const nextPosition = clampExpandedLongTextPosition(
          prev.left,
          prev.top,
          nextDimensions.width,
          nextDimensions.height,
        );
        return {
          ...prev,
          ...nextPosition,
          ...nextDimensions,
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    clampExpandedLongTextPosition,
    expandedLongTextCell,
    getExpandedLongTextDimensions,
  ]);

  useEffect(
    () => () => {
      expandedLongTextDragCleanupRef.current?.();
    },
    [],
  );

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

      const headerRow = containerEl.querySelector("thead tr:first-child");
      if (headerRow instanceof HTMLElement) {
        const nextHeaderHeight = headerRow.offsetHeight;
        if (Number.isFinite(nextHeaderHeight) && nextHeaderHeight > 0) {
          setRenderedHeaderHeight((prev) =>
            prev !== null && Math.abs(prev - nextHeaderHeight) < 0.25
              ? prev
              : nextHeaderHeight,
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
          prev.every(
            (width, idx) => Math.abs(width - nextColWidths[idx]!) < 0.25,
          )
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
    const headerCells = containerEl.querySelectorAll(
      "thead tr:first-child > th",
    );
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
    const paneHeight = Math.max(
      80,
      el.clientHeight - headerRowHeight - dividerBottomInset,
    );
    const nextTop = Math.max(
      24,
      Math.min(paneHeight - 28, Math.round(paneHeight * 0.44)),
    );
    setFreezeTooltipTop(nextTop);
  }, [containerRef, dividerBottomInset, headerRowHeight]);

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
      const paneHeight = Math.max(
        80,
        el.clientHeight - headerRowHeight - dividerBottomInset,
      );
      const minTop = 24;
      const maxTop = Math.max(minTop, paneHeight - 28);
      const nextTop = Math.round(clientY - rect.top - headerRowHeight - 14);
      setFreezeTooltipTop(Math.max(minTop, Math.min(maxTop, nextTop)));
    },
    [containerRef, dividerBottomInset, headerRowHeight],
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

  // --- Multi-cell rectangle selection ---
  const normalizedCellRange = useMemo(() => {
    if (!cellRange) return null;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    const r1 = rowIds.indexOf(cellRange.anchorRowId);
    const r2 = rowIds.indexOf(cellRange.endRowId);
    const c1 = colIds.indexOf(cellRange.anchorColumnId);
    const c2 = colIds.indexOf(cellRange.endColumnId);
    if (r1 < 0 || r2 < 0 || c1 < 0 || c2 < 0) return null;
    return {
      minRowIdx: Math.min(r1, r2),
      maxRowIdx: Math.max(r1, r2),
      minColIdx: Math.min(c1, c2),
      maxColIdx: Math.max(c1, c2),
    };
  }, [cellRange, visibleRowsInViewOrder, visCols]);

  const cellRangeSet = useMemo(() => {
    if (!normalizedCellRange) return null;
    const set = new Set<string>();
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    for (
      let ri = normalizedCellRange.minRowIdx;
      ri <= normalizedCellRange.maxRowIdx;
      ri++
    ) {
      for (
        let ci = normalizedCellRange.minColIdx;
        ci <= normalizedCellRange.maxColIdx;
        ci++
      ) {
        const rId = rowIds[ri];
        const cId = colIds[ci];
        if (rId && cId) set.add(`${rId}-${cId}`);
      }
    }
    return set;
  }, [normalizedCellRange, visibleRowsInViewOrder, visCols]);
  const hasMultiCellRangeSelection = useMemo(
    () =>
      normalizedCellRange != null &&
      (normalizedCellRange.minRowIdx !== normalizedCellRange.maxRowIdx ||
        normalizedCellRange.minColIdx !== normalizedCellRange.maxColIdx),
    [normalizedCellRange],
  );

  const cellRangeRowIds = useMemo(() => {
    if (!normalizedCellRange) return null;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const ids: string[] = [];
    for (
      let ri = normalizedCellRange.minRowIdx;
      ri <= normalizedCellRange.maxRowIdx;
      ri++
    ) {
      const rId = rowIds[ri];
      if (rId) ids.push(rId);
    }
    return ids;
  }, [normalizedCellRange, visibleRowsInViewOrder]);

  const cellRangeRowSet = useMemo(
    () => (cellRangeRowIds ? new Set(cellRangeRowIds) : null),
    [cellRangeRowIds],
  );

  const cellRangeEndCell = useMemo(() => {
    if (!normalizedCellRange) return null;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    const rId = rowIds[normalizedCellRange.maxRowIdx];
    const cId = colIds[normalizedCellRange.maxColIdx];
    if (!rId || !cId) return null;
    return { rowId: rId, columnId: cId };
  }, [normalizedCellRange, visibleRowsInViewOrder, visCols]);

  // ── Fill handle state ──────────────────────────────────────────────
  // The "source" is the current selection: either a single selectedCell or the cellRange rectangle.
  // The fill target extends that source in one direction (horizontal or vertical).
  const fillSourceBounds = useMemo(() => {
    if (normalizedCellRange) return normalizedCellRange;
    if (!selectedCell) return null;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    const ri = rowIds.indexOf(selectedCell.rowId);
    const ci = colIds.indexOf(selectedCell.columnId);
    if (ri < 0 || ci < 0) return null;
    return { minRowIdx: ri, maxRowIdx: ri, minColIdx: ci, maxColIdx: ci };
  }, [normalizedCellRange, selectedCell, visibleRowsInViewOrder, visCols]);

  const fillRangeSet = useMemo(() => {
    if (!fillTarget || !fillSourceBounds) return null;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    const targetRowIdx = rowIds.indexOf(fillTarget.rowId);
    const targetColIdx = colIds.indexOf(fillTarget.columnId);
    if (targetRowIdx < 0 || targetColIdx < 0) return null;

    const { minRowIdx, maxRowIdx, minColIdx, maxColIdx } = fillSourceBounds;

    // Determine fill direction: vertical or horizontal
    // Vertical fill: target is above or below the source bounds
    // Horizontal fill: target is left or right of the source bounds
    const isBelow = targetRowIdx > maxRowIdx;
    const isAbove = targetRowIdx < minRowIdx;
    const isRight = targetColIdx > maxColIdx;
    const isLeft = targetColIdx < minColIdx;

    let fillMinRow = minRowIdx, fillMaxRow = maxRowIdx;
    let fillMinCol = minColIdx, fillMaxCol = maxColIdx;

    if (isBelow || isAbove) {
      // Vertical fill - keep same columns, extend rows
      if (isBelow) fillMaxRow = targetRowIdx;
      else fillMinRow = targetRowIdx;
    } else if (isRight || isLeft) {
      // Horizontal fill - keep same rows, extend columns
      if (isRight) fillMaxCol = targetColIdx;
      else fillMinCol = targetColIdx;
    } else {
      // Target is inside the source - no fill
      return null;
    }

    const set = new Set<string>();
    for (let ri = fillMinRow; ri <= fillMaxRow; ri++) {
      for (let ci = fillMinCol; ci <= fillMaxCol; ci++) {
        const rId = rowIds[ri];
        const cId = colIds[ci];
        if (rId && cId) {
          // Exclude cells that are in the source bounds
          if (ri >= minRowIdx && ri <= maxRowIdx && ci >= minColIdx && ci <= maxColIdx) continue;
          set.add(`${rId}-${cId}`);
        }
      }
    }
    return set.size > 0 ? set : null;
  }, [fillTarget, fillSourceBounds, visibleRowsInViewOrder, visCols]);

  function onCellMouseDown(
    e: React.MouseEvent,
    rowId: string,
    columnId: string,
  ) {
    if (e.button !== 0) return;
    isDraggingCellRange.current = true;
    setCellRange({
      anchorRowId: rowId,
      anchorColumnId: columnId,
      endRowId: rowId,
      endColumnId: columnId,
    });
    selectGridCell({ rowId, columnId });
  }

  function onCellMouseEnter(rowId: string, columnId: string) {
    if (isDraggingFillHandle.current) {
      setFillTarget({ rowId, columnId });
      return;
    }
    if (!isDraggingCellRange.current) return;
    setCellRange((prev) => {
      if (!prev) return prev;
      if (prev.endRowId === rowId && prev.endColumnId === columnId)
        return prev;
      return { ...prev, endRowId: rowId, endColumnId: columnId };
    });
  }

  function onFillHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingFillHandle.current = true;
    setFillTarget(null);
  }

  const bulkUpdateCells = api.table.bulkUpdateCells.useMutation({
    onMutate: async ({ updates, columnUpdates }) => {
      await cellMenuCacheHelpers.cancelCache();
      const snapshot = cellMenuCacheHelpers.snapshotCache();
      const tempSeed = Date.now();
      const normalizedColumnUpdates = columnUpdates ?? [];
      cellMenuCacheHelpers.patchCache((prev) => {
        if (!prev) return prev;
        const rowUpdatesById = new Map<string, typeof updates>();
        for (const update of updates) {
          const existing = rowUpdatesById.get(update.rowId);
          if (existing) existing.push(update);
          else rowUpdatesById.set(update.rowId, [update]);
        }

        const columnUpdatesById = new Map(
          normalizedColumnUpdates.map((update) => [update.columnId, update]),
        );

        return {
          ...prev,
          columns: prev.columns.map((column) => {
            const columnUpdate = columnUpdatesById.get(column.id);
            if (!columnUpdate) return column;

            const existingOptions = [...(column.selectOptions ?? [])];
            const existingLabels = new Set(
              existingOptions.map((option) => option.label),
            );
            let nextOrder = existingOptions.length;
            const ensureOptions = columnUpdate.ensureOptions ?? [];

            for (const option of ensureOptions) {
              if (existingLabels.has(option.label)) continue;
              existingLabels.add(option.label);
              existingOptions.push({
                id: `temp-fill-option-${tempSeed}-${column.id}-${nextOrder}`,
                label: option.label,
                color: option.color ?? DEFAULT_FILL_OPTION_COLOR,
                order: nextOrder,
                columnId: column.id,
              });
              nextOrder += 1;
            }

            return {
              ...column,
              type: columnUpdate.type ?? column.type,
              selectOptions: existingOptions,
            };
          }),
          rows: prev.rows.map((r) => {
            const rowUpdates = rowUpdatesById.get(r.id);
            if (!rowUpdates || rowUpdates.length === 0) return r;
            return {
              ...r,
              cells: r.cells.map((c) => {
                const upd = rowUpdates.find((u) => u.columnId === c.columnId);
                return upd ? { ...c, value: upd.value } : c;
              }),
            };
          }),
        };
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => cellMenuCacheHelpers.restoreCache(ctx?.snapshot),
    onSettled: cellMenuCacheHelpers.invalidate,
  });

  const commitFill = useCallback(() => {
    if (!fillRangeSet || !fillSourceBounds) return;
    const rowIds = visibleRowsInViewOrder.map((r) => r.id);
    const colIds = visCols.map((c) => c.id);
    const rowsById = new Map(visibleRowsInViewOrder.map((row) => [row.id, row]));
    const { minRowIdx, maxRowIdx, minColIdx, maxColIdx } = fillSourceBounds;

    // Collect source values organized by row/col offset
    const sourceRows: { rowId: string; cells: FillSourceCell[] }[] = [];
    for (let ri = minRowIdx; ri <= maxRowIdx; ri++) {
      const rId = rowIds[ri];
      if (!rId) continue;
      const row = rowsById.get(rId);
      if (!row) continue;
      const cells: FillSourceCell[] = [];
      for (let ci = minColIdx; ci <= maxColIdx; ci++) {
        const cId = colIds[ci];
        if (!cId) continue;
        const cell = row.cells.find((c) => c.columnId === cId);
        cells.push({
          columnId: cId,
          value: cell?.value ?? null,
          column: columnsById.get(cId) ?? null,
        });
      }
      sourceRows.push({ rowId: rId, cells });
    }

    if (sourceRows.length === 0) return;

    const updates: { rowId: string; columnId: string; value: string | null }[] =
      [];
    const columnUpdatesById = new Map<
      string,
      {
        columnId: string;
        type?: ColumnType;
        ensureOptions: Map<string, { label: string; color: string }>;
      }
    >();
    const sourceRowCount = maxRowIdx - minRowIdx + 1;
    const sourceColCount = maxColIdx - minColIdx + 1;

    function addColumnUpdate(
      columnId: string,
      type: ColumnType | undefined,
      ensureOptions: Array<{ label: string; color: string }>,
    ) {
      if (!type && ensureOptions.length === 0) return;
      const existing = columnUpdatesById.get(columnId) ?? {
        columnId,
        ensureOptions: new Map<string, { label: string; color: string }>(),
      };
      if (type) existing.type = type;
      for (const option of ensureOptions) {
        if (existing.ensureOptions.has(option.label)) continue;
        existing.ensureOptions.set(option.label, option);
      }
      columnUpdatesById.set(columnId, existing);
    }

    // Detect numeric sequences for smart fill
    function detectNumericSequence(values: (string | null)[]): { start: number; step: number } | null {
      if (values.length < 2) return null;
      const nums = values.map((v) => (v != null ? Number(v) : NaN));
      if (nums.some(isNaN)) return null;
      const step = (nums[1] ?? 0) - (nums[0] ?? 0);
      for (let i = 2; i < nums.length; i++) {
        if (Math.abs(((nums[i] ?? 0) - (nums[i - 1] ?? 0)) - step) > 1e-10) return null;
      }
      return { start: nums[nums.length - 1] ?? 0, step };
    }

    for (const cellKey of fillRangeSet) {
      const [rId, cId] = cellKey.split("-");
      if (!rId || !cId) continue;
      const targetRowIdx = rowIds.indexOf(rId);
      const targetColIdx = colIds.indexOf(cId);
      if (targetRowIdx < 0 || targetColIdx < 0) continue;
      const targetColumn = columnsById.get(cId);
      if (!targetColumn) continue;

      // Determine if vertical or horizontal fill
      const isVerticalFill = targetRowIdx < minRowIdx || targetRowIdx > maxRowIdx;
      let sourceCell: FillSourceCell | undefined;
      let nextValue: string | null = null;

      if (isVerticalFill) {
        const colOffset = targetColIdx - minColIdx;
        const sourceColValues = sourceRows.map((sr) => sr.cells[colOffset]?.value ?? null);
        const seq = detectNumericSequence(sourceColValues);

        if (seq && sourceRows.length >= 2) {
          // Continue numeric sequence
          const stepsFromEnd = targetRowIdx > maxRowIdx
            ? targetRowIdx - maxRowIdx
            : minRowIdx - targetRowIdx;
          sourceCell =
            sourceRows[targetRowIdx > maxRowIdx ? sourceRows.length - 1 : 0]?.cells[
              colOffset
            ];
          nextValue = String(seq.start + seq.step * stepsFromEnd);
        } else {
          // Repeat pattern cyclically
          const rowOffset = targetRowIdx > maxRowIdx
            ? (targetRowIdx - maxRowIdx - 1) % sourceRowCount
            : (sourceRowCount - 1) - ((minRowIdx - targetRowIdx - 1) % sourceRowCount);
          sourceCell = sourceRows[rowOffset]?.cells[colOffset];
          nextValue = sourceCell?.value ?? null;
        }
      } else {
        // Horizontal fill
        const rowOffset = targetRowIdx - minRowIdx;
        const sourceRowData = sourceRows[rowOffset];
        if (!sourceRowData) continue;
        const sourceColValues = sourceRowData.cells.map((c) => c.value);
        const seq = detectNumericSequence(sourceColValues);

        if (seq && sourceColValues.length >= 2) {
          const stepsFromEnd = targetColIdx > maxColIdx
            ? targetColIdx - maxColIdx
            : minColIdx - targetColIdx;
          sourceCell =
            sourceRowData.cells[
              targetColIdx > maxColIdx ? sourceColCount - 1 : 0
            ];
          nextValue = String(seq.start + seq.step * stepsFromEnd);
        } else {
          const colOffset = targetColIdx > maxColIdx
            ? (targetColIdx - maxColIdx - 1) % sourceColCount
            : (sourceColCount - 1) - ((minColIdx - targetColIdx - 1) % sourceColCount);
          sourceCell = sourceRowData.cells[colOffset];
          nextValue = sourceCell?.value ?? null;
        }
      }

      if (!sourceCell?.column) {
        updates.push({ rowId: rId, columnId: cId, value: nextValue });
        continue;
      }

      const transfer = computeFillTransfer({
        sourceColumn: sourceCell.column,
        targetColumn,
        sourceValue: nextValue,
      });

      addColumnUpdate(cId, transfer.type, transfer.ensureOptions);
      updates.push({ rowId: rId, columnId: cId, value: transfer.value });
    }

    const columnUpdates: FillColumnUpdate[] = Array.from(
      columnUpdatesById.values(),
      (update) => ({
        columnId: update.columnId,
        type: update.type,
        ensureOptions: Array.from(update.ensureOptions.values()),
      }),
    );

    if (updates.length > 0 || columnUpdates.length > 0) {
      bulkUpdateCells.mutate({ updates, columnUpdates });
    }
  }, [
    bulkUpdateCells,
    columnsById,
    fillRangeSet,
    fillSourceBounds,
    visibleRowsInViewOrder,
    visCols,
  ]);

  useEffect(() => {
    function handleMouseUp() {
      if (isDraggingFillHandle.current) {
        isDraggingFillHandle.current = false;
        commitFill();
        setFillTarget(null);
        return;
      }
      if (!isDraggingCellRange.current) return;
      isDraggingCellRange.current = false;
      setCellRange((prev) => {
        if (!prev) return null;
        if (
          prev.anchorRowId === prev.endRowId &&
          prev.anchorColumnId === prev.endColumnId
        ) {
          return null;
        }
        return prev;
      });
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [commitFill]);

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
    if (!primaryColumn || !selectedPrimaryField || !canApplyPrimaryFieldChange)
      return;
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
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId],
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

  function openCellContextMenu(
    e: React.MouseEvent,
    rowId: string,
    columnId?: string,
  ) {
    e.preventDefault();
    e.stopPropagation();
    setHeaderPanel(null);
    setOpenSelectCell(null);
    closeColMenu();
    setSummaryMenu(null);

    const cellKey = columnId ? `${rowId}-${columnId}` : null;
    const isInRange = cellKey ? cellRangeSet?.has(cellKey) : false;

    if (cellRange && isInRange && cellRangeRowIds) {
      setCellContextMenu(null);
      setRowContextMenu({ x: e.clientX, y: e.clientY });
    } else if (selectedRowIds.length > 1 && selectedSet.has(rowId)) {
      setCellContextMenu(null);
      setRowContextMenu({ x: e.clientX, y: e.clientY });
    } else {
      setCellRange(null);
      setRowContextMenu(null);
      setCellContextMenu({ x: e.clientX, y: e.clientY, rowId });
    }
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

  const selectedInViewCount = rowIdsInViewOrder.filter((id) =>
    selectedSet.has(id),
  ).length;
  const allInViewSelected =
    rowIdsInViewOrder.length > 0 &&
    selectedInViewCount === rowIdsInViewOrder.length;
  const someInViewSelected = selectedInViewCount > 0 && !allInViewSelected;

  const summaryRowHeightPx = 21.5;
  const summaryBarHeightPx = 34;
  const summaryScrollbarLanePx = summaryBarHeightPx - summaryRowHeightPx;
  const summaryBottomOffsetPx = Math.max(
    0,
    summaryScrollbarLanePx - horizontalScrollbarHeight,
  );
  const summarySolidFillHeightPx = summaryBottomOffsetPx + summaryRowHeightPx;
  const summaryTopBorderBottomPx =
    summaryBottomOffsetPx + summaryRowHeightPx + horizontalScrollbarHeight;

  return (
    <div className="relative h-full w-full bg-[#f6f8fc]">
      <div
        ref={containerRef}
        data-testid="grid-scroll-container"
        className={`h-full w-full bg-[#f6f8fc] select-none ${scrollLocked ? "overflow-hidden" : "overflow-auto"}`}
        style={{ overflowAnchor: "none" }}
        onScroll={scrollLocked ? undefined : handleScroll}
        onClick={() => {
          setHeaderPanel(null);
          setOpenSelectCell(null);
          closeColMenu();
          setAddingCol(false);
          setSummaryMenu(null);
          setRowContextMenu(null);
          setCellContextMenu(null);
        }}
      >
        <table
          id="table"
          className="min-h-full border-collapse bg-[#f6f8fc] text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <GridViewTableHeader
            rowH={rowH}
            wrapHeaders={wrapHeaders}
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
            highlightedSortColumnIds={highlightedSortColumnIds}
            highlightedGroupColumnIds={highlightedGroupColumnIds}
          />

          <GridViewTableBody
            rowH={rowH}
            rowNumberWidth={rowNumberWidth}
            searchQuery={searchQuery}
            searchMatchedCellKeys={searchMatchedCellKeys}
            activeSearchCellKey={activeSearchCellKey}
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
            activateCell={activateCell}
            focusCell={focusCell}
            navigateAdjacentCell={navigateAdjacentCell}
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
            openCellContextMenu={openCellContextMenu}
        cellRangeSet={cellRangeSet}
        hasMultiCellRangeSelection={hasMultiCellRangeSelection}
        cellRangeRowSet={cellRangeRowSet}
            cellRangeEndCell={cellRangeEndCell}
            onCellMouseDown={onCellMouseDown}
            onCellMouseEnter={onCellMouseEnter}
            onFillHandleMouseDown={onFillHandleMouseDown}
            fillRangeSet={fillRangeSet}
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
            highlightedSortColumnIds={highlightedSortColumnIds}
            highlightedGroupColumnIds={highlightedGroupColumnIds}
            groupLabelColumnId={groupLabelColumnId}
            columnNameById={columnNameById}
            collapsedGroupKeySet={collapsedGroupKeySet}
            onToggleGroupCollapsed={onToggleGroupCollapsed}
            selectedCell={selectedCell}
            setSelectedCell={selectGridCell}
            visibleRowsInViewOrder={visibleRowsInViewOrder}
            expandedLongTextCell={
              expandedLongTextCell
                ? {
                    rowId: expandedLongTextCell.rowId,
                    columnId: expandedLongTextCell.columnId,
                  }
                : null
            }
            openExpandedLongTextCell={openExpandedLongTextEditor}
          />
        </table>
      </div>

      {expandedLongTextCell && expandedLongTextColumn && expandedLongTextRow && (
        <div
          ref={expandedLongTextContainerRef}
          className="fixed z-[120] overflow-visible rounded-[14px] border border-[#d8dce4] bg-[#f2f4f8] shadow-[0_1px_3px_rgba(15,23,42,0.16),0_18px_40px_rgba(15,23,42,0.18)]"
          style={{
            left: expandedLongTextCell.left,
            top: expandedLongTextCell.top,
            width: expandedLongTextCell.width,
            height: expandedLongTextCell.height,
            padding: 24,
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close expanded cell"
            className="absolute z-[2] flex h-6 w-6 items-center justify-center rounded-full bg-[#616670] text-white shadow-[0_1px_3px_rgba(15,23,42,0.32)] transition-colors hover:bg-[#4f5560]"
            style={{ top: -12, right: -12 }}
            onClick={() => closeExpandedLongTextEditor()}
          >
            <AirtableAssetIcon
              asset={5}
              alt=""
              tintColor="#ffffff"
              style={{ width: 10, height: 10 }}
            />
          </button>

          <div
            className="expandedCellDragHandle dragHandle flex cursor-move items-center gap-1 text-[#979aa0]"
            style={{ marginBottom: 4 }}
            onMouseDown={beginExpandedLongTextDrag}
          >
            <FieldTypeIcon
              type={expandedLongTextColumn.type}
              tintColor="#979aa0"
            />
            <span className="truncate text-[13px] font-normal text-[#979aa0]">
              {expandedLongTextColumn.name}
            </span>
          </div>

          <div
            className="relative"
            style={{ width: "100%", height: "calc(100% - 24px)" }}
          >
            <textarea
              ref={expandedLongTextTextareaRef}
              autoFocus
              value={expandedLongTextValue}
              className="contentEditableTextbox ignore-baymax-defaults light-scrollbar h-full w-full resize-none overflow-y-auto rounded-lg bg-white text-[13px] leading-[20px] text-[#1d1f25] outline-none"
              style={{ padding: "12px 24px 12px 12px" }}
              onChange={(event) =>
                setEditing((prev) =>
                  prev?.rowId === expandedLongTextCell.rowId &&
                  prev?.columnId === expandedLongTextCell.columnId
                    ? { ...prev, value: event.target.value }
                    : prev,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeExpandedLongTextEditor({ commit: false });
                  return;
                }

                if (event.key === "Tab") {
                  event.preventDefault();
                  closeExpandedLongTextEditor({ restoreFocus: false });
                  navigateAdjacentCell(
                    expandedLongTextCell.rowId,
                    expandedLongTextCell.columnId,
                    event.shiftKey ? -1 : 1,
                  );
                }
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 right-0 p-2 text-[13px] font-semibold text-[#979aa0]"
              style={{ marginRight: 4 }}
            >
              @
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute z-[60] overflow-visible"
        style={{
          top: 0,
          bottom: dividerBottomInset,
          left: dividerLeft,
          width: 0,
          userSelect: "none",
        }}
      >
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l border-[#afb5bf]"
          style={{ left: 0, opacity: 1 }}
        />
      </div>

      <div
        className="pointer-events-none absolute z-[26] overflow-visible"
        style={{
          top: headerRowHeight,
          bottom: dividerBottomInset,
          left: dividerLeft,
          width: 0,
          userSelect: "none",
        }}
      >
        <div
          className="pointer-events-auto absolute top-0 bottom-0 cursor-col-resize"
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
          className="pointer-events-none absolute h-7 border border-[#d6dae1] bg-[#f7f8fa] px-3 text-[13px] leading-7 text-[#8a8f99] select-none"
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
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-[18] bg-white"
        style={{
          bottom: horizontalScrollbarHeight,
          right: verticalScrollbarWidth,
          height: summarySolidFillHeightPx,
        }}
      />
      <div
        className="pointer-events-none absolute right-0 left-0 z-[25] h-px bg-[#e2e5e9]"
        style={{
          bottom: summaryTopBorderBottomPx,
          right: verticalScrollbarWidth,
        }}
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
        cellContextMenu={cellContextMenu}
        setCellContextMenu={setCellContextMenu}
        labelLower={labelLower}
        insertRowAbove={insertRowAbove}
        insertRowBelow={insertRowBelow}
        duplicateRow={duplicateRow}
        deleteRow={_deleteRow}
        contextRowIds={cellRangeRowIds}
        setCellRange={setCellRange}
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
            className="fixed top-1/2 left-1/2 z-[80] w-[min(525px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-[10px] border border-[#d6d8dc] bg-white px-6 pt-6 pb-5 shadow-[0px_0px_1px_rgba(0,0,0,0.24),0px_0px_2px_rgba(0,0,0,0.16),0px_3px_4px_rgba(0,0,0,0.06),0px_6px_8px_rgba(0,0,0,0.06),0px_12px_16px_rgba(0,0,0,0.08),0px_18px_32px_rgba(0,0,0,0.06)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-6 text-[20px] leading-[1.05] font-semibold text-[#2a2d34]">
              Change the primary field
            </h3>

            <div className="mb-6">
              <div className="mb-2 text-[13px] leading-[18px] text-[#616670]">
                Primary field
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-[6px] border border-[#d8dbe1] bg-white px-3 text-left text-[13px] text-[#1d1f25]"
                  onClick={() => setPrimaryFieldPickerOpen((open) => !open)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    {selectedPrimaryField && (
                      <FieldTypeIcon type={selectedPrimaryField.type} />
                    )}
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
                    <path
                      d="M4.5 6.5L8 10l3.5-3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {primaryFieldPickerOpen && (
                  <div className="absolute top-full left-0 z-[90] mt-1 w-full overflow-hidden rounded-[6px] border border-[#d8dbe1] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.16)]">
                    <div className="border-b border-[#e5e8ed] px-3 py-2">
                      <input
                        autoFocus
                        value={primaryFieldSearch}
                        onChange={(event) =>
                          setPrimaryFieldSearch(event.target.value)
                        }
                        placeholder="Find a field"
                        className="h-8 w-full border-none bg-transparent px-0 text-[13px] text-[#1d1f25] outline-none placeholder:text-[#9ca3af]"
                      />
                    </div>
                    <div className="max-h-[260px] overflow-y-auto py-1">
                      {filteredPrimaryFieldOptions.map((column) => {
                        const supported = isPrimaryFieldSupportedType(
                          column.type,
                        );
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
                            <FieldTypeIcon
                              type={column.type}
                              className={
                                supported ? "text-[#1d1f25]" : "text-[#9ca3af]"
                              }
                            />
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
              className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-[#7f8794] hover:bg-[#f5f7fa]"
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
                <path
                  d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
                  strokeLinecap="round"
                />
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
