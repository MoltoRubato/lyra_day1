"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import {
  getBaseTableBarBorderColor,
  getBaseTableBarColor,
} from "~/app/_components/baseAppearanceColors";

type TableTabsBarProps = {
  baseColor: string;
  tables: Array<{ id: string; name: string }>;
  currentTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onUpdateRecordLabel: (tableId: string, recordLabel: string) => void;
  onDeleteTable: (tableId: string) => void;
  onCreateTable: (
    name: string,
    recordLabel?: string,
    callbacks?: {
      onCreated?: (table: { id: string; name: string }) => void;
      onError?: () => void;
    },
  ) => void;
  currentRecordLabel: string;
};

type AnchorRect = { left: number; top: number; width: number; height: number };

type TableSetupState = {
  mode: "create" | "rename";
  anchor: AnchorRect;
  tableId: string | null;
  name: string;
  recordLabel: string;
  originalName: string;
  originalRecordLabel: string;
  creating: boolean;
};

type AddSourceItem = {
  key: string;
  label: string;
  badge?: "Team" | "Business";
  chevron?: boolean;
  icon:
    | { kind: "asset"; asset: number; width: number; height: number }
    | { kind: "image"; src: string; alt: string };
};

const SYSTEM_FONT_STACK =
  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const MENU_WIDTH = 280;
const TABLE_SETUP_WIDTH = 299;
const RECORD_LABEL_OPTIONS = ["Record", "Item", "Event", "Row"] as const;
const MENU_SHADOW =
  "0 12px 28px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.12)";
const PANEL_SHADOW =
  "0 16px 36px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.1)";
const ADD_SOURCE_ITEMS: AddSourceItem[] = [
  {
    key: "airtable-base",
    label: "Airtable base",
    badge: "Team",
    icon: {
      kind: "image",
      src: "/airtable_assets/AirtableLogoPNG.png",
      alt: "Airtable base",
    },
  },
  {
    key: "csv-file",
    label: "CSV file",
    icon: { kind: "asset", asset: 278, width: 16, height: 16 },
  },
  {
    key: "google-calendar",
    label: "Google Calendar",
    badge: "Team",
    icon: {
      kind: "image",
      src: "/airtable_assets/Gcal.png",
      alt: "Google Calendar",
    },
  },
  {
    key: "google-sheets",
    label: "Google Sheets",
    icon: {
      kind: "image",
      src: "/airtable_assets/gsheets.png",
      alt: "Google Sheets",
    },
  },
  {
    key: "excel",
    label: "Microsoft Excel",
    icon: {
      kind: "image",
      src: "/airtable_assets/excel.png",
      alt: "Microsoft Excel",
    },
  },
  {
    key: "salesforce",
    label: "Salesforce",
    badge: "Business",
    icon: {
      kind: "image",
      src: "/airtable_assets/salesforce.png",
      alt: "Salesforce",
    },
  },
  {
    key: "24-more-sources",
    label: "24 more sources...",
    chevron: true,
    icon: { kind: "asset", asset: 389, width: 14, height: 12 },
  },
];

function tabBarBg(hex: string) {
  return getBaseTableBarColor(hex);
}

function tabBarBorder(hex: string) {
  return getBaseTableBarBorderColor(hex);
}

function clampPosition(value: number, width: number) {
  if (typeof window === "undefined") return value;
  return Math.max(12, Math.min(value, window.innerWidth - width - 12));
}

function getAnchorRect(element: HTMLElement | null): AnchorRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function DownArrowIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <AirtableAssetIcon asset={349} alt="" style={{ width: 9, height: 5 }} />
    </span>
  );
}

function RightChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M6 4.5L9.5 8L6 11.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CenteredAssetIcon({
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

function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <li
      role="presentation"
      className="mx-2 mb-[2px] truncate text-[11px] leading-[16.5px] text-[#616670]"
      style={{ width: 248, fontFamily: SYSTEM_FONT_STACK }}
    >
      {children}
    </li>
  );
}

function MenuDivider() {
  return <li role="presentation" className="mx-2 my-1 h-px bg-[#e5e8ee]" />;
}

function Badge({
  label,
  beta = false,
}: {
  label: string;
  beta?: boolean;
}) {
  if (beta) {
    return (
      <span className="ml-2 inline-flex h-6 items-center rounded-full bg-[#f6df9c] px-2.5 text-[11px] text-[#8a5f00]">
        {label}
      </span>
    );
  }

  return (
    <span className="ml-2 inline-flex h-6 items-center rounded-full bg-[#d6efff] px-2.5 text-[11px] text-[#126aa3]">
      <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
        <AirtableAssetIcon asset={127} alt="" style={{ width: 9, height: 9 }} tintColor="currentColor" />
      </span>
      {label}
    </span>
  );
}

function lowerRecordLabel(label: string) {
  const normalized = label.trim() || "Record";
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function pluralRecordLabel(label: string) {
  const singular = lowerRecordLabel(label);
  return singular.endsWith("s") ? singular : `${singular}s`;
}

export function TableTabsBar({
  baseColor,
  tables,
  currentTableId,
  onSelectTable,
  onRenameTable,
  onUpdateRecordLabel,
  onDeleteTable,
  onCreateTable,
  currentRecordLabel,
}: TableTabsBarProps) {
  const [renamingTable, setRenamingTable] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [tableSearchOpen, setTableSearchOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [tableSetup, setTableSetup] = useState<TableSetupState | null>(null);
  const [recordLabelMenuOpen, setRecordLabelMenuOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [tableMenuAnchor, setTableMenuAnchor] = useState<AnchorRect | null>(null);
  const [tableSearchAnchor, setTableSearchAnchor] = useState<AnchorRect | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<AnchorRect | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const tableNameInputRef = useRef<HTMLInputElement | null>(null);
  const recordLabelButtonRef = useRef<HTMLButtonElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const showAddOrImportLabel = tables.length <= 3;
  const suggestedName = useMemo(() => `Table ${tables.length + 1}`, [tables.length]);
  const filteredTables = tableSearch.trim()
    ? tables.filter((table) =>
        table.name.toLowerCase().includes(tableSearch.toLowerCase()),
      )
    : tables;

  const searchLeft = tableSearchAnchor
    ? clampPosition(tableSearchAnchor.left - 120, 360)
    : 12;
  const addMenuLeft = addMenuAnchor
    ? clampPosition(addMenuAnchor.left, MENU_WIDTH)
    : 12;
  const menuLeft = tableMenuAnchor
    ? clampPosition(tableMenuAnchor.left, MENU_WIDTH)
    : 12;
  const tableSetupLeft = tableSetup
    ? clampPosition(tableSetup.anchor.left, TABLE_SETUP_WIDTH)
    : 12;
  const tableSetupTop = tableSetup
    ? tableSetup.anchor.top + tableSetup.anchor.height + 10
    : 0;

  useEffect(() => {
    if (!tableSetup) return;
    const frame = requestAnimationFrame(() => {
      tableNameInputRef.current?.focus();
      tableNameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [tableSetup]);

  function commitInlineRename() {
    if (!renamingTable?.value.trim()) {
      setRenamingTable(null);
      return;
    }
    onRenameTable(renamingTable.id, renamingTable.value.trim());
    setRenamingTable(null);
  }

  function closeTableSetup() {
    setTableSetup(null);
    setRecordLabelMenuOpen(false);
  }

  function openAddMenuFromButton() {
    const anchor = getAnchorRect(addButtonRef.current);
    if (!anchor) return;
    setAddMenuAnchor(anchor);
    setTableSearchOpen(false);
    setAddMenuOpen(true);
  }

  function openStartFromScratch() {
    const anchor = addMenuAnchor ?? getAnchorRect(addButtonRef.current);
    if (!anchor) return;
    setAddMenuOpen(false);
    setRecordLabelMenuOpen(false);
    setTableSetup({
      mode: "create",
      anchor,
      tableId: null,
      name: suggestedName,
      recordLabel: "Record",
      originalName: suggestedName,
      originalRecordLabel: "Record",
      creating: true,
    });
    onCreateTable(suggestedName, "Record", {
      onCreated: (table) => {
        setTableSetup((prev) =>
          prev?.mode === "create"
            ? {
                ...prev,
                tableId: table.id,
                creating: false,
                originalName: table.name,
                originalRecordLabel: "Record",
              }
            : prev,
        );
      },
      onError: () => {
        setTableSetup((prev) =>
          prev?.mode === "create" ? { ...prev, creating: false } : prev,
        );
      },
    });
  }

  function openRenameSetup(tableId: string) {
    const table = tables.find((entry) => entry.id === tableId);
    const anchor =
      getAnchorRect(tabButtonRefs.current[tableId] ?? null) ?? tableMenuAnchor;
    if (!table || !anchor) return;
    setTableMenuOpen(false);
    setRecordLabelMenuOpen(false);
    setTableSetup({
      mode: "rename",
      anchor,
      tableId,
      name: table.name,
      recordLabel: currentRecordLabel || "Record",
      originalName: table.name,
      originalRecordLabel: currentRecordLabel || "Record",
      creating: false,
    });
  }

  function saveTableSetup() {
    if (!tableSetup) return;
    const nextName = tableSetup.name.trim();
    if (!nextName || !tableSetup.tableId || tableSetup.creating) return;
    if (nextName !== tableSetup.originalName) {
      onRenameTable(tableSetup.tableId, nextName);
    }
    if (tableSetup.recordLabel !== tableSetup.originalRecordLabel) {
      onUpdateRecordLabel(tableSetup.tableId, tableSetup.recordLabel);
    }
    closeTableSetup();
  }

  return (
    <div
      className="relative box-border flex h-8 min-h-8 flex-shrink-0 items-center overflow-hidden pr-2 pl-0"
      style={{
        background: tabBarBg(baseColor),
        fontFamily: SYSTEM_FONT_STACK,
      }}
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
            style={isActive ? undefined : { borderRightColor: tabBarBorder(baseColor) }}
          >
            {isRenaming ? (
              <input
                autoFocus
                value={renamingTable.value}
                className="mx-2 my-1 w-28 rounded border border-[#0069ff] bg-white px-2 py-0.5 text-[13px] outline-none"
                onChange={(event) =>
                  setRenamingTable({
                    ...renamingTable,
                    value: event.target.value,
                  })
                }
                onBlur={commitInlineRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitInlineRename();
                  if (event.key === "Escape") setRenamingTable(null);
                }}
              />
            ) : (
              <div className="box-border flex h-8 min-h-8 items-center">
                <button
                  ref={(node) => {
                    tabButtonRefs.current[table.id] = node;
                  }}
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
                {isActive ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setTableMenuAnchor(getAnchorRect(event.currentTarget));
                      setTableMenuOpen((open) => !open);
                    }}
                    className="mr-2 inline-flex h-4 w-4 items-center justify-center text-[#6b6b6b] hover:text-[#444]"
                    title="Table options"
                  >
                    <DownArrowIcon />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      <div className="relative ml-1 flex-shrink-0">
        <button
          onClick={(event) => {
            setTableSearchAnchor(getAnchorRect(event.currentTarget));
            setTableSearchOpen((open) => !open);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[#444] transition-colors hover:bg-black/10"
          title="Switch table"
        >
          <DownArrowIcon />
        </button>

        {tableSearchOpen ? (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setTableSearchOpen(false)} />
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
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M11 11l3 3" strokeLinecap="round" />
                </svg>
                <input
                  autoFocus
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Find a table"
                  className="flex-1 text-[13px] text-[#333] placeholder-[#bbb] outline-none"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto py-2">
                {filteredTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      onSelectTable(table.id);
                      setTableSearchOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                      currentTableId === table.id
                        ? "bg-[#f5f5f5] font-medium text-[#172b4d]"
                        : "text-[#333] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <span>{table.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[#f0f0f0]">
                <button
                  onClick={openAddMenuFromButton}
                  className="flex w-full items-center justify-between px-4 py-2 text-[13px] text-[#555] hover:bg-[#f8f8f8]"
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M7 2v10M2 7h10" />
                    </svg>
                    Add table
                  </span>
                  <RightChevronIcon />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="relative ml-1 flex-shrink-0">
        <button
          ref={addButtonRef}
          onClick={(event) => {
            setAddMenuAnchor(getAnchorRect(event.currentTarget));
            setAddMenuOpen((open) => !open);
          }}
          className={
            showAddOrImportLabel
              ? "inline-flex h-8 items-center gap-1.5 px-3 text-[13px] font-normal text-[#000000D9] transition-colors hover:bg-black/5 hover:text-[#172b4d]"
              : "flex h-7 w-7 items-center justify-center rounded text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]"
          }
          title={showAddOrImportLabel ? "Add or import table" : "Add table"}
          aria-label={showAddOrImportLabel ? "Add or import table" : "Add table"}
        >
          <CenteredAssetIcon asset={127} width={12} height={12} />
          {showAddOrImportLabel ? <span>Add or import</span> : null}
        </button>
        {addMenuOpen ? (
          <>
            <div className="fixed inset-0 z-[135]" onClick={() => setAddMenuOpen(false)} />
            <div
              role="dialog"
              tabIndex={-1}
              className="fixed z-[145] overflow-hidden rounded-[16px] border border-[#d8dce4] bg-white"
              style={{
                left: addMenuLeft,
                top:
                  (addMenuAnchor?.top ?? 0) +
                  (addMenuAnchor?.height ?? 0) +
                  8,
                width: MENU_WIDTH,
                minWidth: MENU_WIDTH,
                boxShadow: MENU_SHADOW,
              }}
            >
              <ul role="menu" tabIndex={-1} className="p-2">
                <MenuHeading>Add a blank table</MenuHeading>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={openStartFromScratch}
                    className="flex h-[34px] w-full items-center rounded-[3px] px-2 text-left text-[13px] text-[#1d1f25] hover:bg-black/[0.05]"
                  >
                    <span className="truncate flex-1">Start from scratch</span>
                  </button>
                </li>
                <MenuDivider />
                <MenuHeading>Build with Omni</MenuHeading>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="flex h-[34px] w-full items-center rounded-[3px] px-2 text-left text-[13px] text-[#1d1f25] hover:bg-black/[0.05]"
                  >
                    <span className="truncate flex-1">New table</span>
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="flex h-[34px] w-full items-center rounded-[3px] px-2 text-left text-[13px] text-[#1d1f25] hover:bg-black/[0.05]"
                  >
                    <span className="flex min-w-0 flex-1 items-center justify-between">
                      <span className="truncate">New table with web data</span>
                      <Badge label="Beta" beta />
                    </span>
                  </button>
                </li>
                <MenuDivider />
                <MenuHeading>Add from other sources</MenuHeading>
                {ADD_SOURCE_ITEMS.map((item) => (
                  <li key={item.key} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      className="flex h-[34px] w-full items-center rounded-[3px] px-2 text-left text-[13px] text-[#1d1f25] hover:bg-black/[0.05]"
                    >
                      <span className="mr-1.5 inline-flex h-4 w-4 flex-none items-center justify-center text-[#1d1f25]">
                        {item.icon.kind === "asset" ? (
                          <AirtableAssetIcon
                            asset={item.icon.asset}
                            alt=""
                            style={{
                              width: item.icon.width,
                              height: item.icon.height,
                            }}
                          />
                        ) : (
                          <Image
                            src={item.icon.src}
                            alt={item.icon.alt}
                            width={16}
                            height={16}
                            unoptimized
                            className="h-4 w-4 object-contain"
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {item.badge ? <Badge label={item.badge} /> : null}
                        {item.chevron ? (
                          <span className="ml-auto inline-flex flex-none items-center text-[#8f96a3]">
                            <RightChevronIcon />
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex-shrink-0">
        <button className="flex items-center gap-1 rounded px-2 py-1 text-[13px] text-[#444] transition-colors hover:bg-black/5 hover:text-[#172b4d]">
          Tools
          <DownArrowIcon />
        </button>
      </div>

      {tableMenuOpen ? (
        <>
          <div className="fixed inset-0 z-[135]" onClick={() => setTableMenuOpen(false)} />
          <div
            className="fixed z-[145] w-[280px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white shadow-xl"
            style={{
              left: menuLeft,
              top:
                (tableMenuAnchor?.top ?? 0) +
                (tableMenuAnchor?.height ?? 0) +
                8,
            }}
          >
            <div className="py-1 text-[13px] text-[#1d1f25]">
              <button
                onClick={() => {
                  if (currentTableId) openRenameSetup(currentTableId);
                }}
                className="flex h-9 w-full items-center px-4 text-left hover:bg-[#f8f8f8]"
              >
                Rename table
              </button>
              <button className="flex h-9 w-full items-center px-4 text-left hover:bg-[#f8f8f8]">
                Hide table
              </button>
              <button className="flex h-9 w-full items-center px-4 text-left hover:bg-[#f8f8f8]">
                Duplicate table
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button
                onClick={() => {
                  if (currentTableId) onDeleteTable(currentTableId);
                  setTableMenuOpen(false);
                }}
                className="flex h-9 w-full items-center px-4 text-left text-red-500 hover:bg-[#fef2f2]"
              >
                Delete table
              </button>
            </div>
          </div>
        </>
      ) : null}

      {tableSetup ? (
        <>
          <div className="fixed inset-0 z-[145]" onClick={closeTableSetup} />
          <div
            className="fixed z-[155] rounded-[10px] border border-[#d8dce4] bg-white p-4"
            style={{
              left: tableSetupLeft,
              top: tableSetupTop,
              width: TABLE_SETUP_WIDTH,
              boxShadow: PANEL_SHADOW,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center">
              <input
                ref={tableNameInputRef}
                aria-label="Table name editor"
                type="text"
                maxLength={255}
                value={tableSetup.name}
                onChange={(event) =>
                  setTableSetup((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev,
                  )
                }
                className="mb-4 h-[38px] w-full rounded-[12px] border-2 border-[#166ee1] px-2 py-2 text-[18px] leading-[22px] text-[#1d1f25] outline-none"
              />
            </div>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-[14px] font-normal text-[#1d1f25]">
                What should each record be called?
              </h5>
              <a
                href="https://support.airtable.com/docs/customizing-terminology-used-for-records-in-a-table"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#6f7782]"
              >
                <AirtableAssetIcon
                  asset={118}
                  alt=""
                  style={{ width: 13, height: 13 }}
                  tintColor="currentColor"
                />
              </a>
            </div>
            <div className="relative mb-3">
              <button
                ref={recordLabelButtonRef}
                type="button"
                aria-expanded={recordLabelMenuOpen}
                onClick={() => setRecordLabelMenuOpen((open) => !open)}
                className="flex h-[42px] w-full items-center rounded-[12px] bg-[#f2f4f8] px-3 text-left"
                style={{
                  boxShadow: recordLabelMenuOpen
                    ? "inset 0 0 0 2px #166ee1"
                    : "inset 0 0 0 1px #e2e7f0",
                }}
              >
                <span className="truncate flex-1 text-[15px] text-[#616670]">
                  {tableSetup.recordLabel}
                </span>
                <span className="ml-2 inline-flex h-4 w-4 flex-none items-center justify-center text-[#6f7782]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path
                      d="M4.5 6L8 9.5L11.5 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
            <div className="mb-6 flex items-center whitespace-nowrap text-[13px] text-[#616670]">
              <div className="mr-4 shrink-0">Examples:</div>
              <div className="flex min-w-0 flex-nowrap items-center gap-4">
                <div className="inline-flex shrink-0 items-center">
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center">
                    <AirtableAssetIcon
                      asset={127}
                      alt=""
                      style={{ width: 12, height: 12 }}
                      tintColor="#616670"
                    />
                  </span>
                  {`Add ${lowerRecordLabel(tableSetup.recordLabel)}`}
                </div>
                <div className="inline-flex shrink-0 items-center">
                  <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center">
                    <AirtableAssetIcon
                      asset={289}
                      alt=""
                      style={{ width: 13, height: 10 }}
                      tintColor="#616670"
                    />
                  </span>
                  {`Send ${pluralRecordLabel(tableSetup.recordLabel)}`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTableSetup}
                className="inline-flex h-7 items-center justify-center px-2 text-[13px] text-[#1d1f25]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTableSetup}
                disabled={
                  tableSetup.creating ||
                  !tableSetup.tableId ||
                  !tableSetup.name.trim()
                }
                className="inline-flex h-7 items-center justify-center rounded-[12px] bg-[#166ee1] px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] disabled:cursor-default disabled:opacity-70"
              >
                Save
              </button>
            </div>
          </div>

          {recordLabelMenuOpen ? (
            <>
              <div className="fixed inset-0 z-[155]" onClick={() => setRecordLabelMenuOpen(false)} />
              <div
                className="fixed z-[165] overflow-hidden rounded-[12px] border border-[#d8dce4] bg-white py-1"
                style={{
                  left: clampPosition(
                    recordLabelButtonRef.current?.getBoundingClientRect().left ?? tableSetupLeft,
                    TABLE_SETUP_WIDTH,
                  ),
                  top:
                    (recordLabelButtonRef.current?.getBoundingClientRect().bottom ??
                      tableSetupTop + 90) + 6,
                  width: TABLE_SETUP_WIDTH,
                  boxShadow: MENU_SHADOW,
                }}
              >
                {RECORD_LABEL_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setTableSetup((prev) =>
                        prev ? { ...prev, recordLabel: option } : prev,
                      );
                      setRecordLabelMenuOpen(false);
                    }}
                    className="flex h-[34px] w-full items-center px-3 text-left text-[13px] text-[#1d1f25] hover:bg-black/[0.05]"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
