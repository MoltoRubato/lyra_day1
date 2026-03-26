import Image from "next/image";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FIELD_TYPES } from "~/app/_components/tableUtils";
import {
  FieldTypeIcon,
  SUMMARY_OPTIONS,
} from "~/app/_components/gridView/tableShared";
import type {
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
  pluralLabel: (n: number) => string;
  onDeleteSelectedRows: () => void;
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
  cellContextMenu: { x: number; y: number; rowId: string } | null;
  setCellContextMenu: (
    v: { x: number; y: number; rowId: string } | null,
  ) => void;
  labelLower: string;
  insertRowAbove: { mutate: (v: { anchorRowId: string }) => void };
  insertRowBelow: { mutate: (v: { anchorRowId: string }) => void };
  duplicateRow: { mutate: (v: { rowId: string }) => void };
  deleteRow: { mutate: (v: { rowId: string }) => void };
  contextRowIds: string[] | null;
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
  onDeleteSelectedRows,
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
  cellContextMenu,
  setCellContextMenu,
  labelLower,
  insertRowAbove,
  insertRowBelow,
  duplicateRow,
  deleteRow,
  contextRowIds,
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

      {rowContextMenu && (hasSelectedRows || (contextRowIds && contextRowIds.length > 0)) && (
        <div
          role="dialog"
          tabIndex={-1}
          className="fixed z-[9999999] min-w-[240px] w-min rounded-[8px] border border-[#e3e5e8] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.13),0_1px_4px_rgba(0,0,0,0.08)] overflow-y-auto"
          style={{
            left: Math.min(
              rowContextMenu.x,
              typeof window !== "undefined"
                ? window.innerWidth - 244
                : rowContextMenu.x,
            ),
            top: Math.min(
              rowContextMenu.y,
              typeof window !== "undefined"
                ? window.innerHeight - 200
                : rowContextMenu.y,
            ),
            maxHeight:
              typeof window !== "undefined"
                ? `${window.innerHeight - 24}px`
                : "480px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul role="menu" tabIndex={-1} className="py-[12px] px-[12px]">
            {/* Ask Omni about N records */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setRowContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <Image
                  src="/airtable_assets/AskOmni.png"
                  width={16}
                  height={16}
                  alt=""
                  unoptimized
                  draggable={false}
                />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Ask Omni about {(contextRowIds ?? selectedRowIds).length} {pluralLabel((contextRowIds ?? selectedRowIds).length)}
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              style={{ height: 1, margin: "8px 0", backgroundColor: "rgba(0,0,0,0.05)" }}
            />

            {/* Send all selected records */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setRowContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={289} style={{ width: 13, height: 10 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Send all selected {pluralLabel((contextRowIds ?? selectedRowIds).length)}
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              style={{ height: 1, margin: "8px 0", backgroundColor: "rgba(0,0,0,0.05)" }}
            />

            {/* Delete all selected records */}
            <li
              role="menuitem"
              tabIndex={-1}
              aria-label={`Delete all selected ${pluralLabel((contextRowIds ?? selectedRowIds).length)}`}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#fff1f5] text-[13px] text-[#c91f4a]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => {
                onDeleteSelectedRows();
                setRowContextMenu(null);
              }}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={32} style={{ width: 12, height: 13 }} tintColor="#c91f4a" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Delete all selected {pluralLabel((contextRowIds ?? selectedRowIds).length)}
                </div>
              </span>
            </li>
          </ul>
        </div>
      )}

      {cellContextMenu && (
        <div
          role="dialog"
          tabIndex={-1}
          className="fixed z-[9999999] min-w-[240px] w-min rounded-[8px] border border-[#e3e5e8] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.13),0_1px_4px_rgba(0,0,0,0.08)] overflow-y-auto"
          style={{
            left: Math.min(
              cellContextMenu.x,
              typeof window !== "undefined"
                ? window.innerWidth - 244
                : cellContextMenu.x,
            ),
            top: Math.min(
              cellContextMenu.y,
              typeof window !== "undefined"
                ? window.innerHeight - 420
                : cellContextMenu.y,
            ),
            maxHeight:
              typeof window !== "undefined"
                ? `${window.innerHeight - 24}px`
                : "480px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul role="menu" tabIndex={-1} className="py-[12px] px-[12px]">
            {/* Ask Omni */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <Image
                  src="/airtable_assets/AskOmni.png"
                  width={16}
                  height={16}
                  alt=""
                  unoptimized
                  draggable={false}
                />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Ask Omni
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              className="bg-[#e3e5e8]"
              style={{ height: 1, margin: "4px 0" }}
            />

            {/* Insert record above */}
            <li
              role="menuitem"
              tabIndex={-1}
              aria-label={`Insert ${labelLower} above`}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => {
                insertRowAbove.mutate({ anchorRowId: cellContextMenu.rowId });
                setCellContextMenu(null);
              }}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={427} style={{ width: 10, height: 12 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Insert {labelLower} above
                </div>
              </span>
            </li>

            {/* Insert record below */}
            <li
              role="menuitem"
              tabIndex={-1}
              aria-label={`Insert ${labelLower} below`}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => {
                insertRowBelow.mutate({ anchorRowId: cellContextMenu.rowId });
                setCellContextMenu(null);
              }}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={441} style={{ width: 10, height: 12 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Insert {labelLower} below
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              className="bg-[#e3e5e8]"
              style={{ height: 1, margin: "4px 0" }}
            />

            {/* Duplicate record */}
            <li
              role="menuitem"
              tabIndex={-1}
              aria-label={`Duplicate ${labelLower}`}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => {
                duplicateRow.mutate({ rowId: cellContextMenu.rowId });
                setCellContextMenu(null);
              }}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={320} style={{ width: 12, height: 12 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Duplicate {labelLower}
                </div>
              </span>
            </li>

            {/* Apply template */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={149} style={{ width: 15, height: 14 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Apply template
                </div>
              </span>
            </li>

            {/* Expand record */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={417} style={{ width: 11, height: 11 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Expand {labelLower}
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              className="bg-[#e3e5e8]"
              style={{ height: 1, margin: "4px 0" }}
            />

            {/* Add comment */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={365} style={{ width: 13, height: 12 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Add comment
                </div>
              </span>
            </li>

            {/* Copy cell URL */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={190} style={{ width: 12, height: 12 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Copy cell URL
                </div>
              </span>
            </li>

            {/* Send record */}
            <li
              role="menuitem"
              tabIndex={-1}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#f4f5f7] text-[13px] text-[#1d1f25]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => setCellContextMenu(null)}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={289} style={{ width: 13, height: 10 }} tintColor="#1d1f25" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Send {labelLower}
                </div>
              </span>
            </li>

            {/* Separator */}
            <li
              role="presentation"
              className="bg-[#e3e5e8]"
              style={{ height: 1, margin: "4px 0" }}
            />

            {/* Delete record */}
            <li
              role="menuitem"
              tabIndex={-1}
              aria-label={`Delete ${labelLower}`}
              className="flex items-center h-[34px] rounded-[4px] px-[8px] cursor-pointer hover:bg-[#fff1f5] text-[13px] text-[#c91f4a]"
              style={{
                fontFamily:
                  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
                userSelect: "none",
              }}
              onClick={() => {
                deleteRow.mutate({ rowId: cellContextMenu.rowId });
                setCellContextMenu(null);
              }}
            >
              <span className="flex-none mr-[8px] flex items-center justify-center w-4 h-4">
                <AirtableAssetIcon asset={32} style={{ width: 12, height: 13 }} tintColor="#c91f4a" />
              </span>
              <span className="truncate flex-auto">
                <div
                  className="flex-auto truncate overflow-hidden whitespace-nowrap"
                  style={{ marginLeft: 4 }}
                >
                  Delete {labelLower}
                </div>
              </span>
            </li>
          </ul>
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

