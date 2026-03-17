import type { ColumnType } from "@prisma/client";
import type {
  FilterCondition,
  GroupRule,
  RowWithCells,
  SortRule,
} from "~/app/_components/tableUtils";
import type { SelectOption } from "~/app/_components/gridViewCells";

export type EditingCell = { rowId: string; columnId: string; value: string };

export type HeaderPanel = { colId: string; panel: "type" | "options" } | null;

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
      node: { key: string; depth: number; value: string };
      totalRows: number;
    }
  | { kind: "row"; row: RowWithCells };

export type GridViewTableProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  rowH: number;
  table: { rowCount: number } | null | undefined;
  sorts: SortRule[];
  filters: FilterCondition[];
  groups: GroupRule[];
  onSortsChange?: (sorts: SortRule[]) => void;
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  visCols: VisibleColumn[];
  dragOverColId: string | null;
  setDragColId: (id: string | null) => void;
  setDragOverColId: (id: string | null) => void;
  onDragEnd: () => void;
  headerPanel: HeaderPanel;
  setHeaderPanel: (v: HeaderPanel) => void;
  renamingCol: { id: string; value: string } | null;
  setRenamingCol: (v: { id: string; value: string } | null) => void;
  handleHeaderSortClick: (colId: string) => void;
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
  addOption: { mutate: (v: { columnId: string; label: string; color: string }) => void };
  deleteOption: { mutate: (v: { optionId: string }) => void };
  updateOption: {
    mutate: (v: { optionId: string; label: string; color: string }) => void;
  };
  startResize: (e: React.MouseEvent, colId: string, startW: number) => void;
  addingCol: boolean;
  setAddingCol: (v: boolean) => void;
  showTypePicker: boolean;
  setShowTypePicker: (v: boolean | ((p: boolean) => boolean)) => void;
  newColType: string;
  setNewColType: (v: string) => void;
  newColName: string;
  setNewColName: (v: string) => void;
  handleAddColumn: () => void;
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
  deleteRow: { mutate: (v: { rowId: string }) => void };
  addRow: { mutate: (v: { tableId: string }) => void };
  tableId: string;
  chunkLoading: boolean;
  trueTotal: number;
  totalRows: number;
  bulkDeleteRows: { mutate: (v: { rowIds: string[] }) => void };
  reorderRows: { mutate: (v: { tableId: string; orderedIds: string[] }) => void };
  canReorderRows: boolean;
  allRowsForSummary: RowWithCells[];
  recordLabel?: string;
};
