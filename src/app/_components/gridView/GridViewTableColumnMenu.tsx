import type { ColumnType } from "@prisma/client";
import type {
  FilterCondition,
  GroupRule,
} from "~/app/_components/tableUtils";
import { uid } from "~/app/_components/gridView/tableShared";
import type { VisibleColumn } from "~/app/_components/gridView/tableTypes";

type GridViewTableColumnMenuProps = {
  col: VisibleColumn;
  tableId: string;
  visible: boolean;
  filters: FilterCondition[];
  groups: GroupRule[];
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  closeColMenu: () => void;
  deleteColumn: { mutate: (v: { columnId: string }) => void };
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
  setEditingDescription: (v: { colId: string; value: string } | null) => void;
  setEditingField: (
    v:
      | {
          colId: string;
          name: string;
          type: string;
          description: string;
          showDescription: boolean;
        }
      | null,
  ) => void;
  setFieldTypeListOpen: (v: boolean) => void;
  setDuplicatingField: (
    v: { colId: string; name: string; duplicateCells: boolean } | null,
  ) => void;
};

export function GridViewTableColumnMenu({
  col,
  tableId,
  visible,
  filters,
  groups,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
  closeColMenu,
  deleteColumn,
  insertColumnLeft,
  insertColumnRight,
  setEditingDescription,
  setEditingField,
  setFieldTypeListOpen,
  setDuplicatingField,
}: GridViewTableColumnMenuProps) {
  if (!visible) return null;

  function addFilterFor(colId: string) {
    const next: FilterCondition[] = [
      ...filters,
      { id: uid("f"), columnId: colId, op: "contains", value: "" },
    ];
    onFiltersChange?.(next);
    onRequestOpenFilterPanel?.();
  }

  function addGroupFor(colId: string) {
    if (groups.some((g) => g.columnId === colId)) {
      onRequestOpenGroupPanel?.();
      return;
    }
    const next: GroupRule[] = [...groups, { id: uid("g"), columnId: colId, dir: "asc" }];
    onGroupsChange?.(next);
    onRequestOpenGroupPanel?.();
  }

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 w-[320px] max-h-[168px] overflow-y-auto bg-white border border-[#d8d8d8] rounded-[8px] shadow-lg py-1.5 text-[13px] font-normal"
      onClick={(e) => e.stopPropagation()}
    >
      {[
        {
          label: "Edit field",
          icon: "✎",
          onClick: () => {
            setEditingField({
              colId: col.id,
              name: col.name,
              type: col.type,
              description: col.description ?? "",
              showDescription: !!col.description,
            });
            setFieldTypeListOpen(false);
            closeColMenu();
          },
        },
        {
          label: "Duplicate field",
          icon: "⧉",
          onClick: () => {
            setDuplicatingField({
              colId: col.id,
              name: col.name,
              duplicateCells: true,
            });
            closeColMenu();
          },
        },
        { divider: true },
        {
          label: "Insert left",
          icon: "←",
          onClick: () => {
            insertColumnLeft.mutate({
              tableId,
              anchorColumnId: col.id,
              name: "New field",
              type: "TEXT",
            });
            closeColMenu();
          },
        },
        {
          label: "Insert right",
          icon: "→",
          onClick: () => {
            insertColumnRight.mutate({
              tableId,
              anchorColumnId: col.id,
              name: "New field",
              type: "TEXT",
            });
            closeColMenu();
          },
        },
        { divider: true },
        {
          label: "Copy field URL",
          icon: "⟲",
          onClick: () => {
            void navigator.clipboard?.writeText(`${window.location.href}#field-${col.id}`);
            closeColMenu();
          },
        },
        {
          label: "Edit field description",
          icon: "ⓘ",
          onClick: () => {
            setEditingDescription({ colId: col.id, value: col.description ?? "" });
            closeColMenu();
          },
        },
        {
          label: "Edit field permissions",
          icon: "⌂",
          onClick: () => closeColMenu(),
        },
        { divider: true },
        {
          label: "Sort  A -> Z",
          icon: "↕",
          onClick: () => {
            onRequestOpenSortPanel?.();
            closeColMenu();
          },
        },
        {
          label: "Sort  Z -> A",
          icon: "↕",
          onClick: () => {
            onRequestOpenSortPanel?.();
            closeColMenu();
          },
        },
        { divider: true },
        {
          label: "Filter by this field",
          icon: "≡",
          onClick: () => {
            addFilterFor(col.id);
            closeColMenu();
          },
        },
        {
          label: "Group by this field",
          icon: "▦",
          onClick: () => {
            addGroupFor(col.id);
            closeColMenu();
          },
        },
        { divider: true },
        {
          label: "Hide field",
          icon: "⊘",
          onClick: () => closeColMenu(),
        },
        {
          label: "Delete field",
          icon: "⌫",
          danger: true,
          onClick: () => {
            deleteColumn.mutate({ columnId: col.id });
            closeColMenu();
          },
        },
      ].map((item, idx) =>
        item.divider ? (
          <div key={`dd-${idx}`} className="h-px bg-[#ececec] my-1 mx-3" />
        ) : (
          <button
            key={`${item.label}-${idx}`}
            onClick={item.onClick}
            className={`w-full px-4 py-2 text-left inline-flex items-center gap-2 font-normal ${item.danger ? "text-[#d71a5f]" : "text-[#1f2937]"} hover:bg-[#f5f7fa]`}
          >
            <span className="w-4 inline-flex justify-center font-normal">{item.icon}</span>
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
