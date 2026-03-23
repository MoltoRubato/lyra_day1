import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FIELD_TYPES } from "~/app/_components/tableUtils";
import {
  FieldTypeIcon,
  SUMMARY_OPTIONS,
} from "~/app/_components/gridView/tableShared";
import type {
  BulkDeleteRowsPayload,
  FieldEditorState,
  SummaryOption,
} from "~/app/_components/gridView/tableTypes";

const SELECT_OPTION_COLORS = [
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#2dd4bf",
  "#fb923c",
];

const isSelectFieldType = (type: string) =>
  type === "SINGLE_SELECT" || type === "MULTI_SELECT";

type GridViewTableOverlaysProps = {
  summaryMenu:
    | {
        colId: string;
        targetId: string;
        left: number;
        top: number;
        placement: "top" | "bottom";
      }
    | null;
  setSummaryMenu: (
    v:
      | {
          colId: string;
          targetId: string;
          left: number;
          top: number;
          placement: "top" | "bottom";
        }
      | null,
  ) => void;
  summaryByCol: Record<string, SummaryOption>;
  setSummaryByCol: (
    v: Record<string, SummaryOption> | ((prev: Record<string, SummaryOption>) => Record<string, SummaryOption>),
  ) => void;
  rowContextMenu: { x: number; y: number } | null;
  hasSelectedRows: boolean;
  selectedRowIds: string[];
  tableId: string;
  allRowsSelected: boolean;
  pluralLabel: (n: number) => string;
  bulkDeleteRows: {
    mutate: (v: BulkDeleteRowsPayload) => void;
  };
  setSelectedRowIds: (v: string[] | ((prev: string[]) => string[])) => void;
  setRowContextMenu: (v: { x: number; y: number } | null) => void;
  editingField: FieldEditorState | null;
  setEditingField: (v: FieldEditorState | null) => void;
  fieldTypeListOpen: boolean;
  setFieldTypeListOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  applyFieldEdit: () => void;
  duplicatingField: { colId: string; name: string; duplicateCells: boolean } | null;
  setDuplicatingField: (v: { colId: string; name: string; duplicateCells: boolean } | null) => void;
  duplicateColumn: { mutate: (v: { columnId: string; duplicateCells: boolean }) => void };
  editingDescription: { colId: string; value: string } | null;
  setEditingDescription: (v: { colId: string; value: string } | null) => void;
  updateColumnDescription: {
    mutate: (v: { columnId: string; description: string | null }) => void;
  };
};

export function GridViewTableOverlays({
  summaryMenu,
  setSummaryMenu,
  summaryByCol,
  setSummaryByCol,
  rowContextMenu,
  hasSelectedRows,
  selectedRowIds,
  tableId,
  allRowsSelected,
  pluralLabel,
  bulkDeleteRows,
  setSelectedRowIds,
  setRowContextMenu,
  editingField,
  setEditingField,
  fieldTypeListOpen,
  setFieldTypeListOpen,
  applyFieldEdit,
  duplicatingField,
  setDuplicatingField,
  duplicateColumn,
  editingDescription,
  setEditingDescription,
  updateColumnDescription,
}: GridViewTableOverlaysProps) {
  return (
    <>
      {summaryMenu && (
        <div
          className="fixed z-[90] w-[140px] overflow-hidden rounded-[4px] bg-[#31353e] shadow-xl"
          style={{
            left: summaryMenu.left,
            top: summaryMenu.top,
            transform:
              summaryMenu.placement === "top" ? "translateY(-100%)" : "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {SUMMARY_OPTIONS.map((opt) => {
            const mode = summaryByCol[summaryMenu.colId] ?? "None";
            return (
              <button
                key={`${summaryMenu.colId}-${opt}`}
                className={`w-full h-[34px] px-3 text-left text-[13px] text-white hover:bg-[#434955] ${opt === mode ? "bg-[#434955]" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSummaryByCol((prev) => ({ ...prev, [summaryMenu.colId]: opt }));
                  setSummaryMenu(null);
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {rowContextMenu && hasSelectedRows && (
        <div
          className="fixed z-[70] w-[360px] rounded-[12px] border border-[#d9dce2] bg-white shadow-xl px-0 py-3"
          style={{ left: rowContextMenu.x, top: rowContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="mx-5 h-[48px] w-[calc(100%-40px)] rounded-[8px] text-left px-4 text-[13px] text-[#2d3138] hover:bg-[#f4f5f7]">
            Ask Omni about {selectedRowIds.length} {pluralLabel(selectedRowIds.length)}
          </button>
          <div className="mx-5 my-2 h-px bg-[#eceff3]" />
          <button className="mx-5 h-[48px] w-[calc(100%-40px)] rounded-[8px] text-left px-4 text-[13px] text-[#2d3138] hover:bg-[#f4f5f7] inline-flex items-center gap-3">
            <AirtableAssetIcon asset={289} size={18} />
            <span>Send all selected records</span>
          </button>
          <div className="mx-5 my-2 h-px bg-[#eceff3]" />
          <button
            className="mx-5 h-[48px] w-[calc(100%-40px)] rounded-[8px] text-left px-4 text-[13px] text-[#c91f4a] hover:bg-[#fff1f5] inline-flex items-center gap-3"
            onClick={() => {
              if (allRowsSelected) {
                bulkDeleteRows.mutate({ tableId, deleteAll: true });
              } else {
                const ids = [...selectedRowIds];
                if (ids.length === 0) return;
                bulkDeleteRows.mutate({ rowIds: ids });
              }
              setSelectedRowIds([]);
              setRowContextMenu(null);
            }}
          >
            <AirtableAssetIcon asset={32} size={18} />
            <span>Delete all selected records</span>
          </button>
        </div>
      )}

      {editingField && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-50"
            onClick={() => {
              setEditingField(null);
              setFieldTypeListOpen(false);
            }}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[400px] bg-white border border-[#ddd] rounded-[8px] p-5">
            <div className="space-y-3">
              <input
                value={editingField.name}
                onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                className="w-full border border-[#d8d8d8] rounded-[10px] h-10 px-3 text-[14px] text-[#1f2937]"
              />
              <div className="relative">
                <button
                  onClick={() => setFieldTypeListOpen((p) => !p)}
                  className="w-full h-10 border border-[#d8d8d8] rounded-[10px] px-3 text-left text-[14px] text-[#1f2937] flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    <FieldTypeIcon type={editingField.type} />
                    {" "}
                    {FIELD_TYPES[editingField.type]?.label ?? "Single line text"}
                  </span>
                  <span className="text-[#888]">v</span>
                </button>
                {fieldTypeListOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-full bg-white border border-[#d8d8d8] rounded-[8px] p-2">
                    <input
                      placeholder="Find a field type"
                      className="w-full h-9 border border-[#d8d8d8] rounded-[8px] px-3 text-[13px] mb-2 outline-none"
                    />
                    <div className="h-[168px] overflow-y-auto text-[13px]">
                      {Object.entries(FIELD_TYPES).map(([typeKey, meta]) => (
                        <button
                          key={typeKey}
                          onClick={() => {
                            const switchingToSelect = isSelectFieldType(typeKey);
                            const existingOptions = editingField.selectOptions;
                            setEditingField({
                              ...editingField,
                              type: typeKey,
                              selectOptions:
                                switchingToSelect && existingOptions.length === 0
                                  ? [
                                      {
                                        id: `new-${Date.now()}-todo`,
                                        label: "Todo",
                                        color: SELECT_OPTION_COLORS[0]!,
                                        order: 0,
                                        columnId: editingField.colId,
                                      },
                                      {
                                        id: `new-${Date.now()}-progress`,
                                        label: "In progress",
                                        color: SELECT_OPTION_COLORS[1]!,
                                        order: 1,
                                        columnId: editingField.colId,
                                      },
                                      {
                                        id: `new-${Date.now()}-done`,
                                        label: "Done",
                                        color: SELECT_OPTION_COLORS[2]!,
                                        order: 2,
                                        columnId: editingField.colId,
                                      },
                                    ]
                                  : existingOptions,
                            });
                            setFieldTypeListOpen(false);
                          }}
                          className={`w-full h-9 px-2 rounded-[6px] text-left flex items-center gap-2 ${editingField.type === typeKey ? "bg-[#eef3ff]" : "hover:bg-[#f7f7f7]"}`}
                        >
                          <FieldTypeIcon type={typeKey} />
                          <span>{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[13px] text-[#666]">
                {editingField.type === "SINGLE_SELECT"
                  ? "Select one predefined option from a list, or prefill each new cell with a default option."
                  : editingField.type === "MULTI_SELECT"
                    ? "Select one or more predefined options from a list."
                    : "Enter text."}
              </p>

              {isSelectFieldType(editingField.type) && (
                <div className="space-y-3 border-t border-[#eceff3] pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold text-[#2f343c]">Options</h4>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[13px] text-[#3b414c] hover:bg-[#f4f6f9]"
                      onClick={() =>
                        setEditingField({
                          ...editingField,
                          selectOptions: [...editingField.selectOptions].sort((a, b) =>
                            a.label.localeCompare(b.label),
                          ),
                        })
                      }
                    >
                      <span>↕</span>
                      <span>Alphabetize</span>
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 text-[13px] text-[#2f343c]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#1d6feb]"
                      checked={editingField.colorCodeOptions}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          colorCodeOptions: e.target.checked,
                        })
                      }
                    />
                    <span>Color-code options</span>
                  </label>

                  <div className="space-y-1">
                    {editingField.selectOptions.map((option, idx) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <span className="w-4 text-center text-[13px] text-[#c1c7d0]">⋮⋮</span>
                        <button
                          type="button"
                          className="h-5 w-5 rounded-full border border-[#d3d8df]"
                          style={{ backgroundColor: option.color }}
                          onClick={() => {
                            const paletteIndex = SELECT_OPTION_COLORS.indexOf(option.color);
                            const nextColor =
                              SELECT_OPTION_COLORS[
                                (paletteIndex + 1 + SELECT_OPTION_COLORS.length) %
                                  SELECT_OPTION_COLORS.length
                              ] ?? SELECT_OPTION_COLORS[0]!;
                            const nextOptions = [...editingField.selectOptions];
                            nextOptions[idx] = { ...option, color: nextColor };
                            setEditingField({ ...editingField, selectOptions: nextOptions });
                          }}
                          title="Change option color"
                        />
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => {
                            const nextOptions = [...editingField.selectOptions];
                            nextOptions[idx] = { ...option, label: e.target.value };
                            setEditingField({ ...editingField, selectOptions: nextOptions });
                          }}
                          className="h-8 flex-1 rounded-[8px] border border-[#d8dce3] px-2 text-[13px] text-[#1f2937]"
                        />
                        <button
                          type="button"
                          className="h-6 w-6 rounded-[6px] text-[16px] text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                          onClick={() =>
                            setEditingField({
                              ...editingField,
                              selectOptions: editingField.selectOptions.filter(
                                (_, optionIndex) => optionIndex !== idx,
                              ),
                            })
                          }
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-[8px] px-1 py-1 text-[14px] text-[#596273] hover:bg-[#f5f7fa]"
                    onClick={() =>
                      setEditingField({
                        ...editingField,
                        selectOptions: [
                          ...editingField.selectOptions,
                          {
                            id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            label: "New option",
                            color:
                              SELECT_OPTION_COLORS[
                                editingField.selectOptions.length %
                                  SELECT_OPTION_COLORS.length
                              ] ?? SELECT_OPTION_COLORS[0]!,
                            order: editingField.selectOptions.length,
                            columnId: editingField.colId,
                          },
                        ],
                      })
                    }
                  >
                    <span className="text-[18px] leading-none">＋</span>
                    <span>Add option</span>
                  </button>

                  <div className="space-y-1 border-t border-[#eceff3] pt-3">
                    <h4 className="text-[13px] font-semibold text-[#2f343c]">Default</h4>
                    <select
                      className="h-9 w-full rounded-[8px] border border-[#d8dce3] px-2 text-[13px] text-[#2f343c]"
                      value={editingField.defaultSelectOptionLabel}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          defaultSelectOptionLabel: e.target.value,
                        })
                      }
                    >
                      <option value="">None</option>
                      {editingField.selectOptions
                        .filter((option) => option.label.trim().length > 0)
                        .map((option) => (
                          <option key={`default-${option.id}`} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {editingField.showDescription ? (
                <div className="pt-2">
                  <label className="block text-[16px] text-[#666] mb-2">Description</label>
                  <input
                    value={editingField.description}
                    onChange={(e) =>
                      setEditingField({ ...editingField, description: e.target.value })
                    }
                    placeholder="Describe this field (optional)"
                    className="w-full border border-[#d8d8d8] rounded-[10px] h-10 px-3 text-[14px] text-[#1f2937]"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingField({ ...editingField, showDescription: true })}
                  className="text-[14px] text-[#374151]"
                >
                  +  Add description
                </button>
              )}

              <div className="flex items-center justify-end gap-5 pt-2">
                <button
                  onClick={() => {
                    setEditingField(null);
                    setFieldTypeListOpen(false);
                  }}
                  className="text-[14px] text-[#374151]"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFieldEdit}
                  className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[14px] font-semibold px-5 h-10 rounded-[10px]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {duplicatingField && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => setDuplicatingField(null)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[460px] bg-white rounded-[8px]"
            style={{ padding: 32 }}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-[#24292f]">
                Duplicate {duplicatingField.name}
              </h3>
              <button
                onClick={() => setDuplicatingField(null)}
                className="text-[#666] hover:text-[#222] text-[18px]"
              >
                x
              </button>
            </div>
            <label className="flex items-center gap-3 mb-8 text-[13px] text-[#2e3338] cursor-pointer">
              <input
                type="checkbox"
                checked={duplicatingField.duplicateCells}
                onChange={(e) =>
                  setDuplicatingField({
                    ...duplicatingField,
                    duplicateCells: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#16a34a]"
              />
              Duplicate cells
            </label>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDuplicatingField(null)}
                className="text-[14px] text-[#333] px-3 h-10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  duplicateColumn.mutate({
                    columnId: duplicatingField.colId,
                    duplicateCells: duplicatingField.duplicateCells,
                  });
                  setDuplicatingField(null);
                }}
                className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[14px] font-semibold px-4 h-10 rounded-[10px]"
              >
                Duplicate field
              </button>
            </div>
          </div>
        </>
      )}

      {editingDescription && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setEditingDescription(null)} />
          <div className="fixed left-1/2 top-[200px] -translate-x-1/2 z-[60] w-[306px] bg-white border border-[#d8d8d8] rounded-[6px] shadow-lg p-2">
            <input
              autoFocus
              value={editingDescription.value}
              onChange={(e) =>
                setEditingDescription({ ...editingDescription, value: e.target.value })
              }
              className="w-full h-12 border border-[#b9b9b9] rounded-[2px] px-3 text-[13px] text-[#1f2937]"
            />
            <div className="flex items-center justify-end gap-3 mt-3">
              <button
                onClick={() => setEditingDescription(null)}
                className="text-[13px] text-[#374151] px-2"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateColumnDescription.mutate({
                    columnId: editingDescription.colId,
                    description: editingDescription.value.trim() || null,
                  });
                  setEditingDescription(null);
                }}
                className="bg-[#1d6feb] hover:bg-[#155fcb] text-white text-[13px] font-semibold px-3 h-10 rounded-[10px]"
              >
                Save description
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

