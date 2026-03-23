import Image from "next/image";
import type { Column } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import type {
  GroupRule,
  RowHeight,
  SortRule,
} from "~/app/_components/tableUtils";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function GroupPanel({
  columns,
  groups,
  onChange,
}: {
  columns: Column[];
  groups: GroupRule[];
  onChange: (g: GroupRule[]) => void;
}) {
  const groupableCols = columns.filter((c) =>
    [
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
    ].includes(c.type),
  );

  function add() {
    const usedIds = new Set(groups.map((g) => g.columnId));
    const col = groupableCols.find((c) => !usedIds.has(c.id));
    if (!col) return;
    onChange([...groups, { id: uid(), columnId: col.id, dir: "asc" }]);
  }

  function remove(id: string) {
    onChange(groups.filter((g) => g.id !== id));
  }

  function update(id: string, patch: Partial<GroupRule>) {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  return (
    <div className="w-[480px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#172b4d]">Group by</span>
        <div className="flex gap-3 text-[13px] text-[#0069ff]">
          <button className="hover:underline">Collapse all</button>
          <button className="hover:underline">Expand all</button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="mb-4 text-[13px] text-[#bbb] italic">
          No groups - add one below.
        </p>
      )}

      <div className="mb-4 space-y-2">
        {groups.map((g, i) => {
          const usedIds = new Set(
            groups.filter((x) => x.id !== g.id).map((x) => x.columnId),
          );
          const availCols = groupableCols.filter(
            (c) => !usedIds.has(c.id) || c.id === g.columnId,
          );
          return (
            <div key={g.id} className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 text-right text-[13px] font-medium text-[#888]">
                {i === 0 ? "Group by" : "then by"}
              </span>

              <select
                className="flex-1 rounded-md border border-[#e0e0e0] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff]"
                value={g.columnId}
                onChange={(e) => update(g.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-24 rounded-md border border-[#e0e0e0] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff]"
                value={g.dir}
                onChange={(e) =>
                  update(g.id, { dir: e.target.value as "asc" | "desc" })
                }
              >
                <option value="asc">A ? Z</option>
                <option value="desc">Z ? A</option>
              </select>

              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <circle cx="6" cy="2" r="1.2" />
                  <circle cx="6" cy="6" r="1.2" />
                  <circle cx="6" cy="10" r="1.2" />
                </svg>
              </button>

              <button
                onClick={() => remove(g.id)}
                className="p-1 text-[#ccc] transition-colors hover:text-red-500"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {groups.length < groupableCols.length && (
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#555] transition-colors hover:text-[#172b4d]"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 1v8M1 5h8" strokeLinecap="round" />
          </svg>
          Add subgroup
        </button>
      )}
    </div>
  );
}

export function SortPanel({
  columns,
  sorts,
  onChange,
}: {
  columns: Column[];
  sorts: SortRule[];
  onChange: (s: SortRule[]) => void;
}) {
  function add() {
    const usedIds = new Set(sorts.map((s) => s.columnId));
    const col = columns.find((c) => !usedIds.has(c.id));
    if (!col) return;
    onChange([...sorts, { id: uid(), columnId: col.id, dir: "asc" }]);
  }

  function remove(id: string) {
    onChange(sorts.filter((s) => s.id !== id));
  }

  function update(id: string, patch: Partial<SortRule>) {
    onChange(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="w-[460px] p-4">
      <p className="mb-4 text-sm font-semibold text-[#172b4d]">
        Sort within groups by
      </p>

      {sorts.length === 0 && (
        <p className="mb-4 text-[13px] text-[#bbb] italic">
          No sort rules - add one below.
        </p>
      )}

      <div className="mb-4 space-y-2">
        {sorts.map((s) => {
          const usedIds = new Set(
            sorts.filter((x) => x.id !== s.id).map((x) => x.columnId),
          );
          const availCols = columns.filter(
            (c) => !usedIds.has(c.id) || c.id === s.columnId,
          );
          return (
            <div key={s.id} className="flex items-center gap-2">
              <select
                className="flex-1 rounded-md border border-[#e0e0e0] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff]"
                value={s.columnId}
                onChange={(e) => update(s.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="w-24 rounded-md border border-[#e0e0e0] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff]"
                value={s.dir}
                onChange={(e) =>
                  update(s.id, { dir: e.target.value as "asc" | "desc" })
                }
              >
                <option value="asc">A ? Z</option>
                <option value="desc">Z ? A</option>
              </select>

              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <circle cx="6" cy="2" r="1.2" />
                  <circle cx="6" cy="6" r="1.2" />
                  <circle cx="6" cy="10" r="1.2" />
                </svg>
              </button>

              <button
                onClick={() => remove(s.id)}
                className="p-1 text-[#ccc] transition-colors hover:text-red-500"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={add}
        disabled={sorts.length >= columns.length}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[#555] transition-colors hover:text-[#172b4d] disabled:opacity-40"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 1v8M1 5h8" strokeLinecap="round" />
        </svg>
        Add another sort
      </button>

      <div className="flex items-center gap-2.5 border-t border-[#f0f0f0] pt-3">
        <div className="relative h-4 w-8 flex-shrink-0 rounded-full bg-[#22c55e]">
          <div className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-white shadow" />
        </div>
        <span className="text-[13px] text-[#555]">
          Automatically sort records
        </span>
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
            className="h-4 w-4 object-contain scale-81"
            draggable={false}
          />
        </span>
        Wrap headers
      </button>
    </div>
  );
}
