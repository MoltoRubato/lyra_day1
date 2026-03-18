import type { ColumnType } from "@prisma/client";
import { FieldTypePicker, OptionsPanel } from "~/app/_components/gridViewCells";
import { GridViewTableColumnMenu } from "~/app/_components/gridView/GridViewTableColumnMenu";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import type { HeaderPanel, VisibleColumn } from "~/app/_components/gridView/tableTypes";
import type {
  FilterCondition,
  GroupRule,
} from "~/app/_components/tableUtils";
import { FIELD_TYPES } from "~/app/_components/tableUtils";

type GridViewTableHeaderProps = {
  rowH: number;
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
  menuForCol: string | null;
  openColMenu: (colId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  closeColMenu: () => void;
  hoveredInfoCol: string | null;
  setHoveredInfoCol: (id: string | null | ((prev: string | null) => string | null)) => void;
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
  tableId: string;
  filters: FilterCondition[];
  groups: GroupRule[];
  onFiltersChange?: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  hasSelectedRows: boolean;
  allInViewSelected: boolean;
  someInViewSelected: boolean;
  toggleAllRowsInView: (checked: boolean) => void;
};

export function GridViewTableHeader({
  rowH,
  visCols,
  dragOverColId,
  setDragColId,
  setDragOverColId,
  onDragEnd,
  headerPanel,
  setHeaderPanel,
  renamingCol,
  setRenamingCol,
  handleHeaderSortClick,
  deleteColumn,
  renameColumn,
  changeType,
  insertColumnLeft,
  insertColumnRight,
  addOption,
  deleteOption,
  updateOption,
  startResize,
  addingCol,
  setAddingCol,
  showTypePicker,
  setShowTypePicker,
  newColType,
  setNewColType,
  newColName,
  setNewColName,
  handleAddColumn,
  menuForCol,
  openColMenu,
  closeColMenu,
  hoveredInfoCol,
  setHoveredInfoCol,
  setEditingDescription,
  setEditingField,
  setFieldTypeListOpen,
  setDuplicatingField,
  tableId,
  filters,
  groups,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
  hasSelectedRows,
  allInViewSelected,
  someInViewSelected,
  toggleAllRowsInView,
}: GridViewTableHeaderProps) {
  return (
    <thead className="sticky top-0 z-20">
      <tr className="border-b border-[#e2e5e9] bg-[#f9fafb]">
        <th className="w-[88px] px-3 py-0 text-left bg-[#f9fafb] z-10 border-r border-[#e2e5e9]">
          <div className="flex items-center" style={{ height: rowH }}>
            <input
              type="checkbox"
              checked={allInViewSelected}
              ref={(el) => {
                if (!el) return;
                el.indeterminate = someInViewSelected;
              }}
              onChange={(e) => toggleAllRowsInView(e.currentTarget.checked)}
              className={`w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#1c76d2] cursor-pointer transition-opacity ${hasSelectedRows ? "opacity-100" : "opacity-0 hover:opacity-100"}`}
            />
          </div>
        </th>

        {visCols.map((col) => {
          const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
          const isCurrentPanel = headerPanel?.colId === col.id;

          return (
            <th
              key={col.id}
              style={{ width: col.width, minWidth: col.width }}
              className={`relative px-0 py-0 text-left group/col border-r border-[#e2e5e9] bg-[#f9fafb] ${dragOverColId === col.id ? "bg-[#e8f5f1]" : ""}`}
              draggable
              onDragStart={() => setDragColId(col.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColId(col.id);
              }}
              onDragEnd={onDragEnd}
            >
              <div className="flex items-center px-2 gap-1.5" style={{ height: rowH }}>
                <span className="text-[#111827] text-[16px] leading-none flex-shrink-0" title={ft.label}>
                  <FieldTypeIcon type={col.type} />
                </span>

                {(col.type === "SINGLE_SELECT" || col.type === "MULTI_SELECT") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeaderPanel(
                        isCurrentPanel && headerPanel?.panel === "options"
                          ? null
                          : { colId: col.id, panel: "options" },
                      );
                    }}
                    className="text-[#9ca3af] hover:text-[#166254] text-[11px] transition-colors flex-shrink-0"
                    title="Manage options"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    >
                      <path d="M1 2.5h10M2.5 6h7M4 9.5h4" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {renamingCol?.id === col.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border-b-2 border-[#166254] px-1 text-xs outline-none flex-1 min-w-0 text-[#1f2937]"
                    value={renamingCol.value}
                    onChange={(e) => setRenamingCol({ ...renamingCol, value: e.target.value })}
                    onBlur={() => {
                      renameColumn.mutate({
                        columnId: col.id,
                        name: renamingCol.value.trim() || col.name,
                      });
                      setRenamingCol(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameColumn.mutate({
                          columnId: col.id,
                          name: renamingCol.value.trim() || col.name,
                        });
                        setRenamingCol(null);
                      }
                      if (e.key === "Escape") setRenamingCol(null);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => handleHeaderSortClick(col.id)}
                    onDoubleClick={() => setRenamingCol({ id: col.id, value: col.name })}
                    className="flex-1 min-w-0 text-left text-[13px] font-medium text-[#111827] hover:text-[#1f2937] truncate"
                    title="Click to sort, double-click to rename"
                  >
                    {col.name}
                  </button>
                )}

                {!!col.description && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDescription({ colId: col.id, value: col.description ?? "" });
                      }}
                      onMouseEnter={() => setHoveredInfoCol(col.id)}
                      onMouseLeave={() =>
                        setHoveredInfoCol((prev) => (prev === col.id ? null : prev))
                      }
                      className="text-[#9ca3af] hover:text-[#6b7280]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      >
                        <circle cx="7" cy="7" r="5.5" />
                        <path d="M7 6v3M7 4.2h.01" strokeLinecap="round" />
                      </svg>
                    </button>
                    {hoveredInfoCol === col.id && (
                      <div className="absolute top-full right-0 mt-1 bg-[#2f3542] text-white text-[13px] px-2 py-1 rounded-[4px] whitespace-nowrap z-50">
                        {col.description}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openColMenu(col.id, e);
                  }}
                  className="opacity-0 group-hover/col:opacity-100 text-[#9ca3af] hover:text-[#6b7280] text-xs flex-shrink-0 transition-all p-0.5 rounded hover:bg-[#eef0f3]"
                  title="Field actions"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M2.5 4.5L6 8l3.5-3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {isCurrentPanel && headerPanel?.panel === "type" && (
                <FieldTypePicker
                  current={col.type}
                  onSelect={(t) => {
                    changeType.mutate({ columnId: col.id, type: t as ColumnType });
                    setHeaderPanel(null);
                  }}
                />
              )}
              {isCurrentPanel && headerPanel?.panel === "options" && (
                <OptionsPanel
                  columnId={col.id}
                  options={col.selectOptions ?? []}
                  onAdd={(label, color) => addOption.mutate({ columnId: col.id, label, color })}
                  onDelete={(id) => deleteOption.mutate({ optionId: id })}
                  onUpdate={(id, label, color) =>
                    updateOption.mutate({ optionId: id, label, color })
                  }
                />
              )}

              <GridViewTableColumnMenu
                col={col}
                tableId={tableId}
                visible={menuForCol === col.id}
                filters={filters}
                groups={groups}
                onFiltersChange={onFiltersChange}
                onGroupsChange={onGroupsChange}
                onRequestOpenSortPanel={onRequestOpenSortPanel}
                onRequestOpenFilterPanel={onRequestOpenFilterPanel}
                onRequestOpenGroupPanel={onRequestOpenGroupPanel}
                closeColMenu={closeColMenu}
                deleteColumn={deleteColumn}
                insertColumnLeft={insertColumnLeft}
                insertColumnRight={insertColumnRight}
                setEditingDescription={setEditingDescription}
                setEditingField={setEditingField}
                setFieldTypeListOpen={setFieldTypeListOpen}
                setDuplicatingField={setDuplicatingField}
              />

              <div
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#166254]/40 transition-colors z-10"
                onMouseDown={(e) => startResize(e, col.id, col.width)}
              />
            </th>
          );
        })}

        <th className="px-2 py-0 text-left w-24 bg-[#f9fafb]">
          {addingCol ? (
            <div className="flex items-center gap-1" style={{ height: rowH, minWidth: 240 }}>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTypePicker((p) => !p);
                  }}
                  className="text-xs px-1.5 py-1 rounded border border-[#e2e5e9] bg-white hover:bg-[#f5f6f8] text-[#4b5563] transition-colors"
                >
                  <FieldTypeIcon type={newColType} />
                </button>
                {showTypePicker && (
                  <FieldTypePicker
                    current={newColType}
                    onSelect={(t) => {
                      setNewColType(t);
                      setShowTypePicker(false);
                    }}
                  />
                )}
              </div>
              <input
                autoFocus
                className="border border-[#166254] rounded-lg px-2 py-1 text-xs outline-none flex-1 bg-white text-[#1f2937] placeholder-[#9ca3af]"
                placeholder="Name..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") {
                    setAddingCol(false);
                    setShowTypePicker(false);
                  }
                }}
              />
              <button
                onClick={handleAddColumn}
                className="px-2 py-1 bg-[#166254] text-white rounded-lg text-xs hover:bg-[#124f43] transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingCol(false);
                  setShowTypePicker(false);
                }}
                className="text-[#9ca3af] text-xs hover:text-[#6b7280] transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#1f2937] hover:bg-[#f0f1f3] transition-colors w-full text-xs"
              style={{ height: rowH }}
              title="Add field"
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                className="w-3 h-3 ml-2"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 2v8M2 6h8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </th>
      </tr>
    </thead>
  );
}
