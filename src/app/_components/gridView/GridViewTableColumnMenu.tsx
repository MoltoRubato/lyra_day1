import type { ColumnType } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { uid } from "~/app/_components/gridView/tableShared";
import type {
  FieldEditorState,
  VisibleColumn,
} from "~/app/_components/gridView/tableTypes";
import {
  FILTER_OPS,
  createFilterCondition,
  normalizeFilterTree,
  operatorsForFieldType,
  type FilterTree,
  type GroupRule,
} from "~/app/_components/tableUtils";

type GridViewTableColumnMenuProps = {
  col: VisibleColumn;
  isPrimaryField: boolean;
  tableId: string;
  visible: boolean;
  filters: FilterTree;
  groups: GroupRule[];
  onFiltersChange?: (filters: FilterTree) => void;
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
  setEditingField: (v: FieldEditorState | null) => void;
  setFieldTypeListOpen: (v: boolean) => void;
  setDuplicatingField: (
    v: { colId: string; name: string; duplicateCells: boolean } | null,
  ) => void;
  onRequestChangePrimaryField: () => void;
};

export function GridViewTableColumnMenu({
  col,
  isPrimaryField,
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
  onRequestChangePrimaryField,
}: GridViewTableColumnMenuProps) {
  if (!visible) return null;

  function addFilterFor(colId: string) {
    const normalized = normalizeFilterTree(filters);
    const ops = operatorsForFieldType(col.type);
    const firstOp = ops[0] ?? "contains";
    const nextCondition = createFilterCondition({
      fieldId: colId,
      operator: firstOp,
      ...(FILTER_OPS[firstOp].needsValue ? { value: "" } : {}),
    });
    const next: FilterTree = {
      ...normalized,
      children: [...normalized.children, nextCondition],
    };
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

  const items: Array<
    | {
        label: string;
        icon: React.ReactNode;
        danger?: boolean;
        disabled?: boolean;
        onClick?: () => void;
      }
    | { divider: true }
  > = [
    {
      label: "Edit field",
      icon: <AirtableAssetIcon asset={141} alt="" size={16} />,
      onClick: () => {
        setEditingField({
          colId: col.id,
          name: col.name,
          type: col.type,
          description: col.description ?? "",
          showDescription: !!col.description,
          originalType: col.type,
          selectOptions: [...(col.selectOptions ?? [])].sort((a, b) => a.order - b.order),
          originalSelectOptions: [...(col.selectOptions ?? [])].sort(
            (a, b) => a.order - b.order,
          ),
          defaultSelectOptionLabel: "",
          colorCodeOptions: true,
        });
        setFieldTypeListOpen(false);
        closeColMenu();
      },
    },
    {
      label: "Duplicate field",
      icon: <AirtableAssetIcon asset={320} alt="" size={16} />,
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
      icon: <AirtableAssetIcon asset={437} alt="" size={16} />,
      disabled: isPrimaryField,
      onClick: isPrimaryField
        ? undefined
        : () => {
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
      icon: <AirtableAssetIcon asset={434} alt="" size={16} />,
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
    ...(isPrimaryField
      ? [
          {
            label: "Change primary field",
            icon: <AirtableAssetIcon asset={436} alt="" size={16} />,
            onClick: () => {
              onRequestChangePrimaryField();
              closeColMenu();
            },
          } as const,
        ]
      : []),
    { divider: true },
    {
      label: "Copy field URL",
      icon: <AirtableAssetIcon asset={190} alt="" size={16} />,
      onClick: () => {
        void navigator.clipboard?.writeText(`${window.location.href}#field-${col.id}`);
        closeColMenu();
      },
    },
    {
      label: "Edit field description",
      icon: <AirtableAssetIcon asset={210} alt="" size={16} />,
      onClick: () => {
        setEditingDescription({ colId: col.id, value: col.description ?? "" });
        closeColMenu();
      },
    },
    {
      label: "Edit field permissions",
      icon: <AirtableAssetIcon asset={181} alt="" size={16} />,
      onClick: () => closeColMenu(),
    },
    { divider: true },
    {
      label: "Sort  A -> Z",
      icon: <AirtableAssetIcon asset={79} alt="" size={16} />,
      onClick: () => {
        onRequestOpenSortPanel?.();
        closeColMenu();
      },
    },
    {
      label: "Sort  Z -> A",
      icon: <AirtableAssetIcon asset={78} alt="" size={16} />,
      onClick: () => {
        onRequestOpenSortPanel?.();
        closeColMenu();
      },
    },
    { divider: true },
    {
      label: "Filter by this field",
      icon: <AirtableAssetIcon asset={255} alt="" size={16} />,
      onClick: () => {
        addFilterFor(col.id);
        closeColMenu();
      },
    },
    {
      label: "Group by this field",
      icon: <AirtableAssetIcon asset={232} alt="" size={16} />,
      onClick: () => {
        addGroupFor(col.id);
        closeColMenu();
      },
    },
    { divider: true },
    {
      label: "Hide field",
      icon: <AirtableAssetIcon asset={283} alt="" size={16} />,
      disabled: isPrimaryField,
      onClick: isPrimaryField ? undefined : () => closeColMenu(),
    },
    {
      label: "Delete field",
      icon: <AirtableAssetIcon asset={32} alt="" size={16} />,
      danger: true,
      disabled: isPrimaryField,
      onClick: isPrimaryField
        ? undefined
        : () => {
            deleteColumn.mutate({ columnId: col.id });
            closeColMenu();
          },
    },
  ];

  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 w-[320px] max-h-[min(70vh,560px)] overflow-y-auto bg-white border border-[#d8d8d8] rounded-[8px] shadow-lg py-1.5 text-[13px] font-normal"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) =>
        "divider" in item ? (
          <div key={`dd-${idx}`} className="h-px bg-[#ececec] my-1 mx-3" />
        ) : (
          <button
            key={`${item.label}-${idx}`}
            onClick={() => item.onClick?.()}
            disabled={item.disabled}
            className={`w-full px-4 py-2 text-left inline-flex items-center gap-2 font-normal ${
              item.disabled
                ? "cursor-not-allowed text-[#a3aab6]"
                : item.danger
                  ? "text-[#d71a5f]"
                  : "text-[#1f2937] hover:bg-[#f5f7fa]"
            }`}
          >
            <span className="w-4 inline-flex justify-center font-normal">{item.icon}</span>
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
