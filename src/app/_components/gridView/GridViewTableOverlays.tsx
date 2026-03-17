import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FIELD_TYPES } from "~/app/_components/tableUtils";
import {
  FieldTypeIcon,
  SUMMARY_OPTIONS,
} from "~/app/_components/gridView/tableShared";
import type { SummaryOption } from "~/app/_components/gridView/tableTypes";

type GridViewTableOverlaysProps = {
  summaryMenu: { colId: string; left: number; top: number } | null;
  setSummaryMenu: (v: { colId: string; left: number; top: number } | null) => void;
  summaryByCol: Record<string, SummaryOption>;
  setSummaryByCol: (
    v: Record<string, SummaryOption> | ((prev: Record<string, SummaryOption>) => Record<string, SummaryOption>),
  ) => void;
  rowContextMenu: { x: number; y: number } | null;
  hasSelectedRows: boolean;
  selectedRowIds: string[];
  pluralLabel: (n: number) => string;
  bulkDeleteRows: { mutate: (v: { rowIds: string[] }) => void };
  setSelectedRowIds: (v: string[] | ((prev: string[]) => string[])) => void;
  setRowContextMenu: (v: { x: number; y: number } | null) => void;
  editingField:
    | {
        colId: string;
        name: string;
        type: string;
        description: string;
        showDescription: boolean;
      }
    | null;
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
          style={{ left: summaryMenu.left, top: summaryMenu.top, transform: "translateY(-100%)" }}
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
              const ids = [...selectedRowIds];
              if (ids.length === 0) return;
              bulkDeleteRows.mutate({ rowIds: ids });
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
                            setEditingField({ ...editingField, type: typeKey });
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
              <p className="text-[13px] text-[#666]">Enter text.</p>

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
