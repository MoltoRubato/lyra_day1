import type { ColumnType } from "@prisma/client";
import type {
  FilterTree,
  GroupRule,
  RowWithCells,
  SortRule,
} from "~/app/_components/tableUtils";
import type { SelectOption } from "~/app/_components/gridViewCells";

export type EditingCell = { rowId: string; columnId: string; value: string };

export type HeaderPanel = { colId: string; panel: "type" | "options" } | null;

export type FieldEditorState = {
  colId: string;
  name: string;
  type: string;
  description: string;
  showDescription: boolean;
  originalType: string;
  selectOptions: SelectOption[];
  originalSelectOptions: SelectOption[];
  defaultSelectOptionLabel: string;
  colorCodeOptions: boolean;
};

export type SummaryOption =
  | "None"
  | "Empty"
  | "Filled"
  | "Unique"
  | "Percent Empty"
  | "Percent Filled"
  | "Percent Unique";

export type VisibleColumn = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  width: number;
  selectOptions?: SelectOption[];
};

export type VisibleItem =
  | {
      kind: "group";
      node: { key: string; depth: number; value: string; columnId: string };
      totalRows: number;
      rows: RowWithCells[];
    }
  | { kind: "row"; row: RowWithCells };

export type BulkDeleteRowsPayload =
  | { rowIds: string[] }
  | { tableId: string; deleteAll: true };

export type GridCellLocation = {
  rowId: string;
  columnId: string;
};

export type CellRange = {
  anchorRowId: string;
  anchorColumnId: string;
  endRowId: string;
  endColumnId: string;
};

export type GridViewTableProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  rowH: number;
  wrapHeaders: boolean;
  searchQuery: string;
  searchMatchedCellKeys: Set<string>;
  activeSearchCellKey: string | null;
  table: { rowCount: number } | null | undefined;
  allCols: VisibleColumn[];
  sorts: SortRule[];
  filters: FilterTree;
  groups: GroupRule[];
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterTree) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  visCols: VisibleColumn[];
  freezeCount: number;
  onFreezeCountChange: (count: number) => void;
  dragOverColId: string | null;
  setDragColId: (id: string | null) => void;
  setDragOverColId: (id: string | null) => void;
  onDragEnd: () => void;
  headerPanel: HeaderPanel;
  setHeaderPanel: (v: HeaderPanel) => void;
  renamingCol: { id: string; value: string } | null;
  setRenamingCol: (v: { id: string; value: string } | null) => void;
  deleteColumn: { mutate: (v: { columnId: string }) => void };
  renameColumn: { mutate: (v: { columnId: string; name: string }) => void };
  changeType: { mutate: (v: { columnId: string; type: ColumnType }) => void };
  updateColumnDescription: {
    mutate: (v: { columnId: string; description: string | null }) => void;
  };
  duplicateColumn: {
    mutate: (v: { columnId: string; duplicateCells: boolean }) => void;
  };
  insertColumnLeft: {
    mutate: (v: {
      tableId: string;
      anchorColumnId: string;
      name: string;
      type: ColumnType;
    }) => void;
  };
  insertColumnRight: {
    mutate: (v: {
      tableId: string;
      anchorColumnId: string;
      name: string;
      type: ColumnType;
    }) => void;
  };
  changePrimaryField: {
    mutate: (v: { tableId: string; columnId: string }) => void;
    isPending?: boolean;
  };
  addOption: {
    mutate: (v: { columnId: string; label: string; color: string }) => void;
  };
  deleteOption: { mutate: (v: { optionId: string }) => void };
  updateOption: {
    mutate: (v: { optionId: string; label: string; color: string }) => void;
  };
  startResize: (e: React.MouseEvent, colId: string, startW: number) => void;
  addingCol: boolean;
  setAddingCol: (v: boolean) => void;
  handleAddColumn: (type: string, suggestedName?: string) => void;
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
  activateCell: (
    row: RowWithCells,
    col: { id: string; type: string },
  ) => void;
  focusCell: (rowId: string, columnId: string) => void;
  navigateAdjacentCell: (
    rowId: string,
    columnId: string,
    direction: 1 | -1,
  ) => void;
  getCellValue: (row: RowWithCells, columnId: string) => string;
  isSelect: (type: string) => boolean;
  safeUpdateCell: (
    rowId: string,
    columnId: string,
    value: string | null,
  ) => void;
  commitEdit: () => void;
  deleteRow: { mutate: (v: { rowId: string }) => void };
  addRow: { mutate: (v: { tableId: string }) => void };
  tableId: string;
  chunkLoading: boolean;
  loadAllPhase: "fetching" | "finalizing";
  scrollLocked: boolean;
  loadAllError: string | null;
  onRetryLoadAll: () => void;
  trueTotal: number;
  totalRows: number;
  showTrailingAddRow: boolean;
  bulkDeleteRows: {
    mutate: (v: BulkDeleteRowsPayload) => void;
  };
  reorderRows: {
    mutate: (v: { tableId: string; orderedIds: string[] }) => void;
  };
  canReorderRows: boolean;
  allRowsForSummary: RowWithCells[];
  visibleRowsInViewOrder: RowWithCells[];
  collapsedGroupKeys: string[];
  onToggleGroupCollapsed?: (groupKey: string) => void;
  recordLabel?: string;
};
