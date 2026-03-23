import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Column } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import type {
  GroupRule,
  RowHeight,
  SortRule,
} from "~/app/_components/tableUtils";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const DROPDOWN_FONT_FAMILY =
  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

const GROUPABLE_COLUMN_TYPES = new Set([
  "TEXT",
  "LONG_TEXT",
  "USER",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "NUMBER",
  "DATE",
  "EMAIL",
  "URL",
  "PHONE",
]);

const NUMERIC_GROUP_TYPES = new Set([
  "NUMBER",
  "CURRENCY",
  "PERCENT",
  "RATING",
]);

function isGroupableColumn(column: Column): boolean {
  return GROUPABLE_COLUMN_TYPES.has(column.type);
}

function getGroupSortLabels(columnType: string) {
  if (NUMERIC_GROUP_TYPES.has(columnType)) {
    return {
      asc: "1 \u2192 9",
      desc: "9 \u2192 1",
    };
  }

  return {
    asc: "A \u2192 Z",
    desc: "Z \u2192 A",
  };
}

function TinyQuestion() {
  return <AirtableAssetIcon asset={118} alt="" size={16} tintColor="#8f96a3" />;
}

function SearchGlyph({ className = "text-[#2d7ff9]" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.8" />
      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path
        d="M4.5 6.5L8 10l3.5-3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusGlyph() {
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
      <path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" />
    </svg>
  );
}

function DragDotsGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="3.5" r="1" />
      <circle cx="10" cy="3.5" r="1" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <circle cx="6" cy="12.5" r="1" />
      <circle cx="10" cy="12.5" r="1" />
    </svg>
  );
}

function TeamGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      <path
        d="M8 4.7l.94 1.9 2.1.3-1.52 1.48.36 2.08L8 9.52l-1.88.99.36-2.08-1.52-1.48 2.1-.3L8 4.7z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function reorderItemsById<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
) {
  const fromIndex = items.findIndex((item) => item.id === sourceId);
  const toIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function GroupPanel({
  columns,
  groups,
  onChange,
  collapsedGroupKeys = [],
  availableGroupKeys = [],
  onCollapseAll,
  onExpandAll,
}: {
  columns: Column[];
  groups: GroupRule[];
  onChange: (g: GroupRule[]) => void;
  collapsedGroupKeys?: string[];
  availableGroupKeys?: string[];
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [emptySearch, setEmptySearch] = useState("");
  const [fieldMenu, setFieldMenu] = useState<{
    targetId: string;
    search: string;
  } | null>(null);
  const [sortMenuGroupId, setSortMenuGroupId] = useState<string | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns],
  );
  const columnById = useMemo(
    () => new Map(sortedColumns.map((column) => [column.id, column])),
    [sortedColumns],
  );
  const usedColumnIds = useMemo(
    () => new Set(groups.map((group) => group.columnId)),
    [groups],
  );
  const groupableCount = sortedColumns.filter(isGroupableColumn).length;
  const collapsedGroupCount = useMemo(
    () => new Set(collapsedGroupKeys).size,
    [collapsedGroupKeys],
  );
  const canCollapseAll =
    availableGroupKeys.length > 0 &&
    collapsedGroupCount < availableGroupKeys.length;
  const canExpandAll = collapsedGroupCount > 0;

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      setFieldMenu(null);
      setSortMenuGroupId(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFieldMenu(null);
      setSortMenuGroupId(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  function addGroupWithColumn(columnId: string) {
    const column = columnById.get(columnId);
    if (!column || !isGroupableColumn(column) || usedColumnIds.has(column.id))
      return;
    onChange([...groups, { id: uid(), columnId: column.id, dir: "asc" }]);
    setFieldMenu(null);
    setEmptySearch("");
  }

  function remove(id: string) {
    onChange(groups.filter((group) => group.id !== id));
    setFieldMenu((current) => (current?.targetId === id ? null : current));
    setSortMenuGroupId((current) => (current === id ? null : current));
  }

  function update(id: string, patch: Partial<GroupRule>) {
    onChange(
      groups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
    if (patch.columnId) setFieldMenu(null);
    if (patch.dir) setSortMenuGroupId(null);
  }

  function availableColumnsForGroup(groupId: string) {
    const current = groups.find((group) => group.id === groupId);
    if (!current) return [];
    return sortedColumns.filter(
      (column) =>
        !usedColumnIds.has(column.id) || column.id === current.columnId,
    );
  }

  function remainingColumns() {
    return sortedColumns.filter((column) => !usedColumnIds.has(column.id));
  }

  function renderFieldList(
    options: Column[],
    search: string,
    emptyState: boolean,
  ) {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = options.filter((column) =>
      normalizedSearch
        ? column.name.toLowerCase().includes(normalizedSearch)
        : true,
    );

    return (
      <>
        <div
          className={`flex items-center ${emptyState ? "h-[34px] px-2" : "h-10 px-3"} ${
            emptyState ? "" : "border-b border-[#eceff3]"
          }`}
        >
          {emptyState ? <SearchGlyph /> : null}
          <input
            type="text"
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              if (emptyState) setEmptySearch(next);
              else
                setFieldMenu((current) =>
                  current ? { ...current, search: next } : current,
                );
            }}
            placeholder="Find a field"
            className={`w-full bg-transparent text-[13px] text-[#1d1f25] outline-none placeholder:text-[#8a94a6] ${
              emptyState ? "ml-3" : ""
            }`}
            style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div
              className="px-4 py-3 text-[13px] text-[#8a94a6]"
              style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
            >
              No fields found
            </div>
          ) : (
            filtered.map((column) => {
              const disabled = !isGroupableColumn(column);
              return (
                <button
                  key={column.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (groups.length === 0) {
                      addGroupWithColumn(column.id);
                      return;
                    }

                    const targetId = fieldMenu?.targetId;
                    if (targetId === "add") {
                      addGroupWithColumn(column.id);
                      return;
                    }

                    if (targetId) update(targetId, { columnId: column.id });
                  }}
                  className={`flex h-[26px] w-full items-center px-2 text-left ${
                    disabled
                      ? "cursor-default text-[#b6bcc7]"
                      : "text-[#1d1f25] hover:bg-[#f4f6f9]"
                  }`}
                  style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
                >
                  <span className="mr-3 inline-flex h-4 w-4 flex-none items-center justify-center">
                    <FieldTypeIcon
                      type={column.type}
                      className={disabled ? "text-[#b6bcc7]" : "text-[#616670]"}
                    />
                  </span>
                  <span className="truncate text-[13px] leading-[18px]">
                    {column.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </>
    );
  }

  if (groups.length === 0) {
    return (
      <div
        ref={panelRef}
        className="w-[292px] max-w-[calc(100vw-32px)] min-w-[280px] bg-white"
      >
        <div className="p-3">
          <div className="flex items-center gap-1.5">
            <h3
              className="text-[13px] leading-[20px] font-semibold text-[#616670]"
              style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
            >
              Group by
            </h3>
            <button
              type="button"
              aria-label="Learn more about grouping"
              className="inline-flex h-4 w-4 items-center justify-center"
            >
              <TinyQuestion />
            </button>
          </div>
          <div className="mt-3 border-t border-[#d9dde3]" />
          <div className="pt-2">
            {renderFieldList(sortedColumns, emptySearch, true)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="w-[508px] max-w-[calc(100vw-32px)] bg-white"
      style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
    >
      <div className="p-3 pb-0">
        <div className="mx-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] leading-[20px] font-semibold text-[#616670]">
              Group by
            </h3>
            <button
              type="button"
              aria-label="Learn more about grouping"
              className="inline-flex h-4 w-4 items-center justify-center"
            >
              <TinyQuestion />
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] leading-[16px] text-[#616670]">
            <button
              type="button"
              onClick={onCollapseAll}
              disabled={!canCollapseAll}
              className="hover:text-[#1d1f25] disabled:cursor-default disabled:text-[#b6bcc7]"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={onExpandAll}
              disabled={!canExpandAll}
              className="hover:text-[#1d1f25] disabled:cursor-default disabled:text-[#b6bcc7]"
            >
              Expand all
            </button>
          </div>
        </div>
        <div className="mx-1 mt-3 border-t border-[#d9dde3]" />

        <div className="mt-3 space-y-2">
          {groups.map((group) => {
            const column = columnById.get(group.columnId);
            if (!column) return null;
            const sortLabels = getGroupSortLabels(column.type);
            const openFieldMenu = fieldMenu?.targetId === group.id;
            const openSortMenu = sortMenuGroupId === group.id;
            return (
              <div
                key={group.id}
                className="relative pb-2"
                onDragOver={(event) => {
                  if (!draggedGroupId || draggedGroupId === group.id) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!draggedGroupId || draggedGroupId === group.id) return;
                  event.preventDefault();
                  onChange(reorderItemsById(groups, draggedGroupId, group.id));
                  setDraggedGroupId(null);
                }}
              >
                <div className="mx-1 grid grid-cols-[240px_120px_28px_28px_28px] items-center gap-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSortMenuGroupId(null);
                      setFieldMenu((current) =>
                        current?.targetId === group.id
                          ? null
                          : { targetId: group.id, search: "" },
                      );
                    }}
                    className="flex h-7 items-center rounded-[4px] border border-[#d8dde5] bg-white px-2 text-[#1d1f25] hover:bg-[#f7f9fc]"
                  >
                    <span className="inline-flex h-4 w-4 flex-none items-center justify-center text-[#616670]">
                      <FieldTypeIcon
                        type={column.type}
                        className="text-[#616670]"
                      />
                    </span>
                    <span className="ml-2 flex-1 truncate text-left text-[13px] leading-[18px]">
                      {column.name}
                    </span>
                    <span className="ml-2 inline-flex h-4 w-4 flex-none items-center justify-center text-[#4b5563]">
                      <ChevronDown />
                    </span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFieldMenu(null);
                        setSortMenuGroupId((current) =>
                          current === group.id ? null : group.id,
                        );
                      }}
                      className="flex h-7 w-[120px] items-center rounded-[4px] border border-[#d8dde5] bg-white px-2 text-[#1d1f25] hover:bg-[#f7f9fc]"
                      data-testid="sort-direction-selector"
                    >
                      <span className="flex-1 text-left text-[13px] leading-[18px]">
                        {group.dir === "asc" ? sortLabels.asc : sortLabels.desc}
                      </span>
                      <span className="ml-2 inline-flex h-4 w-4 flex-none items-center justify-center text-[#4b5563]">
                        <ChevronDown />
                      </span>
                    </button>

                    {openSortMenu && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-[148px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                        {(["asc", "desc"] as const).map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() => update(group.id, { dir })}
                            className="flex h-10 w-full items-center px-4 text-left text-[13px] leading-[18px] text-[#1d1f25] hover:bg-[#f4f6f9]"
                          >
                            {dir === "asc" ? sortLabels.asc : sortLabels.desc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-7 w-7" />

                  <button
                    type="button"
                    onClick={() => remove(group.id)}
                    aria-label="Remove group"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8f96a3] hover:bg-[#f4f6f9] hover:text-[#616670]"
                  >
                    <AirtableAssetIcon
                      asset={32}
                      alt=""
                      tintColor="rgb(65, 69, 77)"
                      style={{ width: 16, height: 16, display: "block" }}
                    />
                  </button>

                  <button
                    type="button"
                    draggable
                    aria-label="Reorder group"
                    onDragStart={() => setDraggedGroupId(group.id)}
                    onDragEnd={() => setDraggedGroupId(null)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8f96a3] hover:bg-[#f4f6f9] hover:text-[#616670]"
                  >
                    <DragDotsGlyph />
                  </button>
                </div>

                {openFieldMenu && (
                  <div className="absolute top-full left-1 z-20 mt-1 w-[360px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    {renderFieldList(
                      availableColumnsForGroup(group.id),
                      fieldMenu?.search ?? "",
                      false,
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {groups.length < groupableCount && (
          <div className="relative mx-1 mt-2 w-fit">
            <button
              type="button"
              onClick={() => {
                setSortMenuGroupId(null);
                setFieldMenu((current) =>
                  current?.targetId === "add"
                    ? null
                    : { targetId: "add", search: "" },
                );
              }}
              className="flex h-8 items-center text-[13px] leading-[18px] text-[#616670] hover:text-[#1d1f25]"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center text-[#8f96a3]">
                <PlusGlyph />
              </span>
              <span className="ml-4">Add subgroup</span>
            </button>

            {fieldMenu?.targetId === "add" && (
              <div className="absolute top-full left-0 z-20 mt-2 w-[460px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                {renderFieldList(remainingColumns(), fieldMenu.search, false)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#e5e9ef] bg-[#f2f4f8] px-3 py-3">
        <div className="mx-1 flex items-center text-[11px] leading-[20px] whitespace-nowrap text-[#1d1f25]">
          <span>Summarize your records further with a pivot table in an</span>
          <a
            href="https://airtable.com/wspKiLhnnF4t5xXMn/workspace/plans?ref=bp.upteu"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-[#166ee1] hover:underline"
          >
            interface dashboard layout
          </a>
          <span className="ml-2 inline-flex items-center rounded-full bg-[#cfe1ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#166ee1]">
            <span className="mr-1 inline-flex h-3 w-3 items-center justify-center rounded-full border border-current">
              <TeamGlyph />
            </span>
            Team
          </span>
        </div>
      </div>
    </div>
  );
}

export function SortPanel({
  columns,
  sorts,
  onChange,
  autoSortRecords = true,
  onToggleAutoSort,
}: {
  columns: Column[];
  sorts: SortRule[];
  onChange: (s: SortRule[]) => void;
  autoSortRecords?: boolean;
  onToggleAutoSort?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [emptySearch, setEmptySearch] = useState("");
  const [fieldMenu, setFieldMenu] = useState<{
    targetId: string;
    search: string;
  } | null>(null);
  const [dirMenuSortId, setDirMenuSortId] = useState<string | null>(null);
  const [draggedSortId, setDraggedSortId] = useState<string | null>(null);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns],
  );
  const columnById = useMemo(
    () => new Map(sortedColumns.map((column) => [column.id, column])),
    [sortedColumns],
  );
  const usedColumnIds = useMemo(
    () => new Set(sorts.map((sort) => sort.columnId)),
    [sorts],
  );

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      setFieldMenu(null);
      setDirMenuSortId(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFieldMenu(null);
      setDirMenuSortId(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  function addSortWithColumn(columnId: string) {
    const column = columnById.get(columnId);
    if (!column || usedColumnIds.has(column.id)) return;
    onChange([...sorts, { id: uid(), columnId: column.id, dir: "asc" }]);
    setFieldMenu(null);
    setEmptySearch("");
  }

  function remove(id: string) {
    onChange(sorts.filter((sort) => sort.id !== id));
    setFieldMenu((current) => (current?.targetId === id ? null : current));
    setDirMenuSortId((current) => (current === id ? null : current));
  }

  function update(id: string, patch: Partial<SortRule>) {
    onChange(
      sorts.map((sort) => (sort.id === id ? { ...sort, ...patch } : sort)),
    );
    if (patch.columnId) setFieldMenu(null);
    if (patch.dir) setDirMenuSortId(null);
  }

  function availableColumnsForSort(sortId: string) {
    const current = sorts.find((sort) => sort.id === sortId);
    if (!current) return [];
    return sortedColumns.filter(
      (column) =>
        !usedColumnIds.has(column.id) || column.id === current.columnId,
    );
  }

  function remainingColumns() {
    return sortedColumns.filter((column) => !usedColumnIds.has(column.id));
  }

  function renderFieldList(
    options: Column[],
    search: string,
    emptyState: boolean,
  ) {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = options.filter((column) =>
      normalizedSearch
        ? column.name.toLowerCase().includes(normalizedSearch)
        : true,
    );

    return (
      <>
        <div
          className={`flex items-center ${emptyState ? "h-[34px] px-2" : "h-10 px-3"} ${
            emptyState ? "" : "border-b border-[#eceff3]"
          }`}
        >
          {emptyState ? <SearchGlyph /> : null}
          <input
            type="text"
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              if (emptyState) setEmptySearch(next);
              else
                setFieldMenu((current) =>
                  current ? { ...current, search: next } : current,
                );
            }}
            placeholder="Find a field"
            className={`w-full bg-transparent text-[13px] text-[#1d1f25] outline-none placeholder:text-[#8a94a6] ${
              emptyState ? "ml-3" : ""
            }`}
            style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div
              className="px-4 py-3 text-[13px] text-[#8a94a6]"
              style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
            >
              No fields found
            </div>
          ) : (
            filtered.map((column) => (
              <button
                key={column.id}
                type="button"
                onClick={() => {
                  if (sorts.length === 0) {
                    addSortWithColumn(column.id);
                    return;
                  }

                  const targetId = fieldMenu?.targetId;
                  if (targetId === "add") {
                    addSortWithColumn(column.id);
                    return;
                  }

                  if (targetId) update(targetId, { columnId: column.id });
                }}
                className="flex h-[26px] w-full items-center px-2 text-left text-[#1d1f25] hover:bg-[#f4f6f9]"
                style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
              >
                <span className="mr-3 inline-flex h-4 w-4 flex-none items-center justify-center">
                  <FieldTypeIcon type={column.type} className="text-[#616670]" />
                </span>
                <span className="truncate text-[13px] leading-[18px]">
                  {column.name}
                </span>
              </button>
            ))
          )}
        </div>
      </>
    );
  }

  if (sorts.length === 0) {
    return (
      <div
        ref={panelRef}
        className="w-[292px] max-w-[calc(100vw-32px)] min-w-[280px] bg-white"
      >
        <div className="p-3">
          <div className="flex items-center gap-1.5">
            <h3
              className="text-[13px] leading-[20px] font-semibold text-[#616670]"
              style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
            >
              Sort by
            </h3>
            <button
              type="button"
              aria-label="Learn more about sorting"
              className="inline-flex h-4 w-4 items-center justify-center"
            >
              <TinyQuestion />
            </button>
          </div>
          <div className="mt-3 border-t border-[#d9dde3]" />
          <div className="pt-2">
            {renderFieldList(sortedColumns, emptySearch, true)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="w-[508px] max-w-[calc(100vw-32px)] bg-white"
      style={{ fontFamily: DROPDOWN_FONT_FAMILY }}
    >
      <div className="p-3 pb-0">
        <div className="mx-1 flex items-center gap-1.5">
          <h3 className="text-[13px] leading-[20px] font-semibold text-[#616670]">
            Sort by
          </h3>
          <button
            type="button"
            aria-label="Learn more about sorting"
            className="inline-flex h-4 w-4 items-center justify-center"
          >
            <TinyQuestion />
          </button>
        </div>
        <div className="mx-1 mt-3 border-t border-[#d9dde3]" />

        <div className="mt-3 space-y-2">
          {sorts.map((sort) => {
            const column = columnById.get(sort.columnId);
            if (!column) return null;
            const sortLabels = getGroupSortLabels(column.type);
            const openFieldMenu = fieldMenu?.targetId === sort.id;
            const openDirMenu = dirMenuSortId === sort.id;
            return (
              <div
                key={sort.id}
                className="relative pb-2"
                onDragOver={(event) => {
                  if (!draggedSortId || draggedSortId === sort.id) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!draggedSortId || draggedSortId === sort.id) return;
                  event.preventDefault();
                  onChange(reorderItemsById(sorts, draggedSortId, sort.id));
                  setDraggedSortId(null);
                }}
              >
                <div className="mx-1 grid grid-cols-[240px_120px_28px_28px_28px] items-center gap-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDirMenuSortId(null);
                      setFieldMenu((current) =>
                        current?.targetId === sort.id
                          ? null
                          : { targetId: sort.id, search: "" },
                      );
                    }}
                    className="flex h-7 items-center rounded-[4px] border border-[#d8dde5] bg-white px-2 text-[#1d1f25] hover:bg-[#f7f9fc]"
                  >
                    <span className="inline-flex h-4 w-4 flex-none items-center justify-center text-[#616670]">
                      <FieldTypeIcon
                        type={column.type}
                        className="text-[#616670]"
                      />
                    </span>
                    <span className="ml-2 flex-1 truncate text-left text-[13px] leading-[18px]">
                      {column.name}
                    </span>
                    <span className="ml-2 inline-flex h-4 w-4 flex-none items-center justify-center text-[#4b5563]">
                      <ChevronDown />
                    </span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFieldMenu(null);
                        setDirMenuSortId((current) =>
                          current === sort.id ? null : sort.id,
                        );
                      }}
                      className="flex h-7 w-[120px] items-center rounded-[4px] border border-[#d8dde5] bg-white px-2 text-[#1d1f25] hover:bg-[#f7f9fc]"
                      data-testid="sort-direction-selector"
                    >
                      <span className="flex-1 text-left text-[13px] leading-[18px]">
                        {sort.dir === "asc" ? sortLabels.asc : sortLabels.desc}
                      </span>
                      <span className="ml-2 inline-flex h-4 w-4 flex-none items-center justify-center text-[#4b5563]">
                        <ChevronDown />
                      </span>
                    </button>

                    {openDirMenu && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-[148px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                        {(["asc", "desc"] as const).map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() => update(sort.id, { dir })}
                            className="flex h-10 w-full items-center px-4 text-left text-[13px] leading-[18px] text-[#1d1f25] hover:bg-[#f4f6f9]"
                          >
                            {dir === "asc" ? sortLabels.asc : sortLabels.desc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-7 w-7" />

                  <button
                    type="button"
                    onClick={() => remove(sort.id)}
                    aria-label="Remove sort"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8f96a3] hover:bg-[#f4f6f9] hover:text-[#616670]"
                  >
                    <AirtableAssetIcon
                      asset={32}
                      alt=""
                      tintColor="rgb(65, 69, 77)"
                      style={{ width: 16, height: 16, display: "block" }}
                    />
                  </button>

                  <button
                    type="button"
                    draggable
                    aria-label="Reorder sort"
                    onDragStart={() => setDraggedSortId(sort.id)}
                    onDragEnd={() => setDraggedSortId(null)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8f96a3] hover:bg-[#f4f6f9] hover:text-[#616670]"
                  >
                    <DragDotsGlyph />
                  </button>
                </div>

                {openFieldMenu && (
                  <div className="absolute top-full left-1 z-20 mt-1 w-[360px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    {renderFieldList(
                      availableColumnsForSort(sort.id),
                      fieldMenu?.search ?? "",
                      false,
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sorts.length < sortedColumns.length && (
          <div className="relative mx-1 mt-2 w-fit">
            <button
              type="button"
              onClick={() => {
                setDirMenuSortId(null);
                setFieldMenu((current) =>
                  current?.targetId === "add"
                    ? null
                    : { targetId: "add", search: "" },
                );
              }}
              className="flex h-8 items-center text-[13px] leading-[18px] text-[#616670] hover:text-[#1d1f25]"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center text-[#8f96a3]">
                <PlusGlyph />
              </span>
              <span className="ml-4">Add another sort</span>
            </button>

            {fieldMenu?.targetId === "add" && (
              <div className="absolute top-full left-0 z-20 mt-2 w-[460px] overflow-hidden rounded-[4px] border border-[#d9dde3] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                {renderFieldList(remainingColumns(), fieldMenu.search, false)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#e5e9ef] bg-[#f2f4f8] px-3 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={autoSortRecords}
          onClick={onToggleAutoSort}
          className="mx-1 flex w-[calc(100%-8px)] items-center justify-between rounded-[6px] px-1 py-0.5 text-left"
        >
          <span className="text-[13px] leading-[18px] text-[#1d1f25]">
            Automatically sort records
          </span>
          <span
            className={`relative inline-flex h-4 w-8 flex-none rounded-full transition-colors ${
              autoSortRecords ? "bg-[#22c55e]" : "bg-[#c7ccd4]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] transition-transform ${
                autoSortRecords ? "translate-x-[17px]" : "translate-x-[2px]"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

const ROW_HEIGHT_OPTIONS: {
  value: RowHeight;
  label: string;
  asset: number;
}[] = [
  {
    value: "short",
    label: "Short",
    asset: 105,
  },
  {
    value: "medium",
    label: "Medium",
    asset: 106,
  },
  {
    value: "tall",
    label: "Tall",
    asset: 107,
  },
  {
    value: "extra-tall",
    label: "Extra Tall",
    asset: 108,
  },
];

export function RowHeightPanel({
  rowHeight,
  wrapHeaders,
  onChange,
  onToggleWrapHeaders,
}: {
  rowHeight: RowHeight;
  wrapHeaders: boolean;
  onChange: (h: RowHeight) => void;
  onToggleWrapHeaders: () => void;
}) {
  return (
    <div className="w-[200px] py-2">
      <p className="px-4 pb-2 text-[11px] leading-[16px] text-[#7d8592]">
        Select a row height
      </p>
      {ROW_HEIGHT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex w-full items-center gap-3 px-4 py-2 text-[13px] leading-[18px] transition-colors hover:bg-[#f5f7fa] ${
            rowHeight === opt.value ? "text-[#2d7ff9]" : "text-[#607289]"
          }`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center">
            <AirtableAssetIcon
              asset={opt.asset}
              alt=""
              tintColor={rowHeight === opt.value ? "#2d7ff9" : "#607289"}
              style={{ width: 16, height: 16 }}
            />
          </span>
          {opt.label}
        </button>
      ))}
      <div className="mx-4 my-2 border-t border-[#e8ebf0]" />
      <button
        type="button"
        onClick={onToggleWrapHeaders}
        aria-pressed={wrapHeaders}
        className={`flex w-full items-center gap-3 px-4 py-2 text-[13px] leading-[18px] transition-colors hover:bg-[#f5f7fa] ${
          wrapHeaders ? "text-[#2d7ff9]" : "text-[#607289]"
        }`}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden">
          <Image
            src="/airtable_assets/WrapHeader.png"
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 scale-81 object-contain"
            draggable={false}
          />
        </span>
        Wrap headers
      </button>
    </div>
  );
}
