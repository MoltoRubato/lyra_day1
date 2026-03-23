"use client";
import { useMemo, useState } from "react";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import {
  getBaseTableBarBorderColor,
  getBaseTableBarColor,
} from "~/app/_components/baseAppearanceColors";

function tabBarBg(hex: string): string {
  return getBaseTableBarColor(hex);
}
function tabBarBorder(hex: string): string {
  return getBaseTableBarBorderColor(hex);
}

type TableTabsBarProps = {
  baseColor: string;
  tables: Array<{ id: string; name: string }>;
  currentTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onDeleteTable: (tableId: string) => void;
  onCreateTable: (name: string, recordLabel?: string) => void;
  currentRecordLabel: string;
};

type AnchorRect = { left: number; top: number; width: number; height: number };

function CenteredTabIcon({
  asset,
  width,
  height,
}: {
  asset: number;
  width: number;
  height: number;
}) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <AirtableAssetIcon asset={asset} alt="" style={{ width, height }} />
    </span>
  );
}

function DownArrowIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <AirtableAssetIcon asset={349} alt="" style={{ width: 9, height: 5 }} />
    </span>
  );
}

export function TableTabsBar({
  baseColor,
  tables,
  currentTableId,
  onSelectTable,
  onRenameTable,
  onDeleteTable,
  onCreateTable,
  currentRecordLabel,
}: TableTabsBarProps) {
  const [renamingTable, setRenamingTable] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [tableSearchOpen, setTableSearchOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [tableMenuAnchor, setTableMenuAnchor] = useState<AnchorRect | null>(
    null,
  );
  const [tableSearchAnchor, setTableSearchAnchor] = useState<AnchorRect | null>(
    null,
  );
  const [addMenuAnchor, setAddMenuAnchor] = useState<AnchorRect | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [recordLabel, setRecordLabel] = useState("Record");

  const suggestedName = useMemo(() => {
    return `Table ${tables.length + 1}`;
  }, [tables.length]);
  const showAddOrImportLabel = tables.length <= 3;

  function commitTableRename() {
    if (!renamingTable?.value.trim()) {
      setRenamingTable(null);
      return;
    }
    onRenameTable(renamingTable.id, renamingTable.value.trim());
    setRenamingTable(null);
  }

  function openStartFromScratch() {
    setAddMenuOpen(false);
    setScratchOpen(true);
    setNewTableName(suggestedName);
    setRecordLabel(currentRecordLabel || "Record");
  }

  function handleCreateTable() {
    if (!newTableName.trim()) return;
    onCreateTable(newTableName.trim(), recordLabel);
    setScratchOpen(false);
    setNewTableName("");
  }

  const filteredTables = tableSearch.trim()
    ? tables.filter((t) =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase()),
      )
    : tables;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const minMenuLeft = 68;
  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
  const searchMenuWidth = 360;
  const addMenuWidth = 280;
  const searchLeft = tableSearchAnchor
    ? clamp(
        tableSearchAnchor.left - 120,
        minMenuLeft,
        viewportW - searchMenuWidth - 12,
      )
    : minMenuLeft;
  const addMenuLeft = addMenuAnchor
    ? clamp(
        addMenuAnchor.left + addMenuAnchor.width - addMenuWidth,
        minMenuLeft,
        viewportW - addMenuWidth - 12,
      )
    : minMenuLeft;
  const menuWidth = 280;
  const menuLeft = tableMenuAnchor
    ? clamp(tableMenuAnchor.left, minMenuLeft, viewportW - menuWidth - 12)
    : minMenuLeft;
  const tabDividerColor = tabBarBorder(baseColor);

  return (
    <div
      className="relative box-border flex h-8 min-h-8 flex-shrink-0 items-center overflow-hidden pr-2 pl-0"
      style={{ background: tabBarBg(baseColor) }}
    >
      {tables.map((table) => {
        const isActive = currentTableId === table.id;
        const isRenaming = renamingTable?.id === table.id;
        return (
          <div
            key={table.id}
            className={`group/tab relative box-border flex h-8 min-h-8 flex-shrink-0 items-center transition-all ${
              isActive
                ? "z-10 -mt-px -mb-px rounded-tr border-t border-r border-[#d8d8d8] bg-white"
                : "border-r"
            }`}
            style={isActive ? undefined : { borderRightColor: tabDividerColor }}
          >
            {isRenaming ? (
              <input
                autoFocus
                value={renamingTable.value}
                className="mx-2 my-1 w-28 rounded border border-[#0069ff] bg-white px-2 py-0.5 text-[13px] outline-none"
                onChange={(e) =>
                  setRenamingTable({ ...renamingTable, value: e.target.value })
                }
                onBlur={commitTableRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTableRename();
                  if (e.key === "Escape") setRenamingTable(null);
                }}
              />
            ) : (
              <div className="box-border flex h-8 min-h-8 items-center">
                <button
                  onClick={() => onSelectTable(table.id)}
                  onDoubleClick={() =>
                    setRenamingTable({ id: table.id, value: table.name })
                  }
                  className={`box-border flex h-8 min-h-8 items-center gap-1 px-3 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "text-[#172b4d]"
                      : "rounded-tr text-[#444] hover:bg-black/5 hover:text-[#172b4d]"
                  }`}
                >
                  {table.name}
                </button>
                {isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (
                        e.currentTarget as HTMLButtonElement
                      ).getBoundingClientRect();
                      setTableMenuAnchor({
                        left: rect.left - 120,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      });
                      setTableMenuOpen((p) => !p);
                    }}
                    className="mr-2 inline-flex h-4 w-4 items-center justify-center text-[#6b6b6b] hover:text-[#444]"
                    title="Table options"
                  >
                    <DownArrowIcon />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {tableMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setTableMenuOpen(false)}
          />
          <div
            className="fixed z-30 w-[280px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white text-[13px] shadow-xl"
            style={{
              left: menuLeft,
              top:
                (tableMenuAnchor?.top ?? 0) +
                (tableMenuAnchor?.height ?? 0) +
                8,
            }}
          >
            <div className="max-h-[360px] overflow-y-auto">
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 4v4l2 2" strokeLinecap="round" />
                </svg>
                Import data
                <span className="ml-auto text-[#bbb]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 2l4 3-4 3" />
                  </svg>
                </span>
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button
                onClick={() => {
                  const activeId = currentTableId ?? "";
                  const active = tables.find((t) => t.id === activeId);
                  if (active)
                    setRenamingTable({ id: active.id, value: active.name });
                  setTableMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path
                    d="M10.5 2.5L13.5 5.5L6 13H3V10L10.5 2.5Z"
                    strokeLinejoin="round"
                  />
                </svg>
                Rename table
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M2 8s3-4 6-4 6 4 6 4-3 4-6 4-6-4-6-4Z" />
                  <circle cx="8" cy="8" r="1.8" />
                  <path d="M3 3l10 10" strokeLinecap="round" />
                </svg>
                Hide table
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M3 4h10M3 8h6M3 12h8" strokeLinecap="round" />
                  <path d="M11 7v6M9 9h4" strokeLinecap="round" />
                </svg>
                Manage fields
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="6" y="6" width="8" height="8" rx="1" />
                </svg>
                Duplicate table
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M3 8h10M8 3v10" strokeLinecap="round" />
                  <path d="M12 12l2 2" strokeLinecap="round" />
                </svg>
                Configure date dependencies
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v6M5 8h6" strokeLinecap="round" />
                </svg>
                Edit table description
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5 7V5a3 3 0 016 0v2" />
                </svg>
                Edit table permissions
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
                Clear data
              </button>
              <button
                onClick={() => {
                  if (currentTableId) onDeleteTable(currentTableId);
                  setTableMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-red-500 hover:bg-[#fef2f2]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path
                    d="M4 5l1 9h6l1-9M3 5h10M6 5V3h4v2"
                    strokeLinecap="round"
                  />
                </svg>
                Delete table
              </button>
            </div>
          </div>
        </>
      )}

      <div className="relative ml-1 flex-shrink-0">
        <button
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLButtonElement
            ).getBoundingClientRect();
            setTableSearchAnchor({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            });
            setTableSearchOpen((p) => !p);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[#444] transition-colors hover:bg-black/10"
          title="Switch table"
        >
          <DownArrowIcon />
        </button>

        {tableSearchOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setTableSearchOpen(false)}
            />
            <div
              className="fixed z-30 w-[360px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white shadow-xl"
              style={{
                left: searchLeft,
                top:
                  (tableSearchAnchor?.top ?? 0) +
                  (tableSearchAnchor?.height ?? 0) +
                  8,
              }}
            >
              <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3 text-[#888]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M11 11l3 3" strokeLinecap="round" />
                </svg>
                <input
                  autoFocus
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Find a table"
                  className="flex-1 text-[13px] text-[#333] placeholder-[#bbb] outline-none"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto py-2">
                {filteredTables.map((table) => {
                  const isActive = currentTableId === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        onSelectTable(table.id);
                        setTableSearchOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                        isActive
                          ? "bg-[#f5f5f5] font-medium text-[#172b4d]"
                          : "text-[#333] hover:bg-[#f8f8f8]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isActive && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="#111"
                            strokeWidth="2"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        <span>{table.name}</span>
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-3 text-[#bbb]">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          >
                            <path d="M1.5 8s2.5-3.5 6.5-3.5S14.5 8 14.5 8s-2.5 3.5-6.5 3.5S1.5 8 1.5 8z" />
                            <circle cx="8" cy="8" r="1.5" />
                            <path d="M3 3l10 10" strokeLinecap="round" />
                          </svg>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="currentColor"
                          >
                            <circle cx="2" cy="7" r="1.2" />
                            <circle cx="7" cy="7" r="1.2" />
                            <circle cx="12" cy="7" r="1.2" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#f0f0f0]">
                <button
                  onClick={() => {
                    setTableSearchOpen(false);
                    openStartFromScratch();
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-[13px] text-[#555] hover:bg-[#f8f8f8]"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path d="M7 2v10M2 7h10" />
                    </svg>
                    Add table
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 2l4 3-4 3" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative ml-1 flex-shrink-0">
        <button
          onClick={(e) => {
            const rect = (
              e.currentTarget as HTMLButtonElement
            ).getBoundingClientRect();
            setAddMenuAnchor({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            });
            setAddMenuOpen((p) => !p);
          }}
          className={
            showAddOrImportLabel
              ? "inline-flex h-8 items-center gap-1.5 px-3 text-[13px] font-normal text-[#000000D9] transition-colors hover:bg-black/5 hover:text-[#172b4d]"
              : "flex h-7 w-7 items-center justify-center rounded text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]"
          }
          title={showAddOrImportLabel ? "Add or import table" : "Add table"}
          aria-label={
            showAddOrImportLabel ? "Add or import table" : "Add table"
          }
        >
          <CenteredTabIcon asset={127} width={12} height={12} />
          {showAddOrImportLabel && <span>Add or import</span>}
        </button>

        {addMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setAddMenuOpen(false)}
            />
            <div
              className="fixed z-30 w-[280px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white text-[13px] shadow-xl"
              style={{
                left: addMenuLeft,
                top:
                  (addMenuAnchor?.top ?? 0) + (addMenuAnchor?.height ?? 0) + 8,
              }}
            >
              <div className="px-4 pt-3 text-[13px] text-[#999]">
                Add a blank table
              </div>
              <button
                onClick={openStartFromScratch}
                className="w-full px-4 py-3 text-left font-medium hover:bg-[#f8f8f8]"
              >
                Start from scratch
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <div className="px-4 py-2 text-[11px] text-[#999] uppercase">
                Add from other sources
              </div>
              {[
                "Airtable base",
                "CSV file",
                "Google Calendar",
                "Google Sheets",
                "Microsoft Excel",
                "Salesforce",
              ].map((label) => (
                <button
                  key={label}
                  className="w-full px-4 py-2 text-left text-[#444] hover:bg-[#f8f8f8]"
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex-shrink-0">
        <button className="flex items-center gap-1 rounded px-2 py-1 text-[13px] text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]">
          Tools
          <DownArrowIcon />
        </button>
      </div>

      {scratchOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setScratchOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 z-40 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e0e0e0] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="flex-1 rounded border border-[#2d7ff9] px-2 py-1 text-[18px] font-semibold text-[#172b4d] outline-none"
              />
              <button
                onClick={() => setScratchOpen(false)}
                className="ml-2 text-[#bbb] hover:text-[#555]"
              >
                x
              </button>
            </div>
            <div className="mb-2 text-[13px] text-[#666]">
              What should each record be called?
            </div>
            <div className="relative mb-4">
              <select
                value={recordLabel}
                onChange={(e) => setRecordLabel(e.target.value)}
                className="w-full appearance-none rounded border border-[#e0e0e0] bg-white px-3 py-2 pr-8 text-[13px] text-[#444]"
              >
                <option>Record</option>
                <option>Item</option>
                <option>Event</option>
                <option>Row</option>
              </select>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="#999"
                strokeWidth="1.5"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              >
                <path d="M2.5 4l2.5 2.5L7.5 4" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[13px] text-[#888]">
                <span className="flex items-center gap-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M6 1v10M1 6h10" />
                  </svg>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  >
                    <path d="M2 4h12v8H2z" />
                    <path d="M2 5l6 4 6-4" />
                  </svg>
                  Send records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScratchOpen(false)}
                  className="px-2 py-1 text-[13px] text-[#555]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTable}
                  className="rounded bg-[#2d7ff9] px-4 py-1.5 text-[13px] text-white hover:bg-[#2569d4]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
