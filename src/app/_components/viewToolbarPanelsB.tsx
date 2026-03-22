import type { Column } from "@prisma/client";
import type { GroupRule, RowHeight, SortRule } from "~/app/_components/tableUtils";

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
    ["TEXT", "LONG_TEXT", "USER", "SINGLE_SELECT", "MULTI_SELECT", "NUMBER", "DATE", "EMAIL", "URL", "PHONE"].includes(c.type),
  );

  function add() {
    const usedIds = new Set(groups.map((g) => g.columnId));
    const col = groupableCols.find((c) => !usedIds.has(c.id));
    if (!col) return;
    onChange([...groups, { id: uid(), columnId: col.id, dir: "asc" }]);
  }

  function remove(id: string) { onChange(groups.filter((g) => g.id !== id)); }

  function update(id: string, patch: Partial<GroupRule>) {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  return (
    <div className="w-[480px] p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[#172b4d]">Group by</span>
        <div className="flex gap-3 text-[13px] text-[#0069ff]">
          <button className="hover:underline">Collapse all</button>
          <button className="hover:underline">Expand all</button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-[13px] text-[#bbb] italic mb-4">No groups - add one below.</p>
      )}

      <div className="space-y-2 mb-4">
        {groups.map((g, i) => {
          const usedIds = new Set(groups.filter((x) => x.id !== g.id).map((x) => x.columnId));
          const availCols = groupableCols.filter((c) => !usedIds.has(c.id) || c.id === g.columnId);
          return (
            <div key={g.id} className="flex items-center gap-2">
              <span className="text-[13px] text-[#888] w-16 flex-shrink-0 text-right font-medium">
                {i === 0 ? "Group by" : "then by"}
              </span>

              <select
                className="flex-1 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff] bg-white"
                value={g.columnId}
                onChange={(e) => update(g.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="w-24 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff] bg-white"
                value={g.dir}
                onChange={(e) => update(g.id, { dir: e.target.value as "asc" | "desc" })}
              >
                <option value="asc">A ? Z</option>
                <option value="desc">Z ? A</option>
              </select>

              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                </svg>
              </button>

              <button
                onClick={() => remove(g.id)}
                className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
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
          className="flex items-center gap-1.5 text-[13px] text-[#555] hover:text-[#172b4d] font-medium transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
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

  function remove(id: string) { onChange(sorts.filter((s) => s.id !== id)); }

  function update(id: string, patch: Partial<SortRule>) {
    onChange(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="w-[460px] p-4">
      <p className="text-sm font-semibold text-[#172b4d] mb-4">Sort within groups by</p>

      {sorts.length === 0 && (
        <p className="text-[13px] text-[#bbb] italic mb-4">No sort rules - add one below.</p>
      )}

      <div className="space-y-2 mb-4">
        {sorts.map((s) => {
          const usedIds = new Set(sorts.filter((x) => x.id !== s.id).map((x) => x.columnId));
          const availCols = columns.filter((c) => !usedIds.has(c.id) || c.id === s.columnId);
          return (
            <div key={s.id} className="flex items-center gap-2">
              <select
                className="flex-1 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff] bg-white"
                value={s.columnId}
                onChange={(e) => update(s.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="w-24 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-[13px] outline-none focus:border-[#0069ff] bg-white"
                value={s.dir}
                onChange={(e) => update(s.id, { dir: e.target.value as "asc" | "desc" })}
              >
                <option value="asc">A ? Z</option>
                <option value="desc">Z ? A</option>
              </select>

              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                </svg>
              </button>

              <button
                onClick={() => remove(s.id)}
                className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
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
        className="flex items-center gap-1.5 text-[13px] text-[#555] hover:text-[#172b4d] font-medium transition-colors disabled:opacity-40 mb-4"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 1v8M1 5h8" strokeLinecap="round" />
        </svg>
        Add another sort
      </button>

      <div className="flex items-center gap-2.5 border-t border-[#f0f0f0] pt-3">
        <div className="w-8 h-4 rounded-full bg-[#22c55e] relative flex-shrink-0">
          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow" />
        </div>
        <span className="text-[13px] text-[#555]">Automatically sort records</span>
      </div>
    </div>
  );
}

const ROW_HEIGHT_OPTIONS: {
  value: RowHeight;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "short",
    label: "Short",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="6" width="12" height="4" rx="1" />
      </svg>
    ),
  },
  {
    value: "medium",
    label: "Medium",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="5" width="12" height="6" rx="1" />
      </svg>
    ),
  },
  {
    value: "tall",
    label: "Tall",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="4" width="12" height="8" rx="1" />
      </svg>
    ),
  },
  {
    value: "extra-tall",
    label: "Extra Tall",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="2" width="12" height="12" rx="1" />
      </svg>
    ),
  },
];

export function RowHeightPanel({
  rowHeight,
  onChange,
}: {
  rowHeight: RowHeight;
  onChange: (h: RowHeight) => void;
}) {
  return (
    <div className="w-44 p-1.5">
      <p className="text-[11px] text-[#888] px-2 py-1.5">Select a row height</p>
      {ROW_HEIGHT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-[13px] transition-colors ${
            rowHeight === opt.value
              ? "text-[#0069ff] bg-[#f0f7ff]"
              : "text-[#555] hover:bg-[#f5f5f4]"
          }`}
        >
          <span className={rowHeight === opt.value ? "text-[#0069ff]" : "text-[#888]"}>
            {opt.icon}
          </span>
          {opt.label}
        </button>
      ))}
      <div className="border-t border-[#f0f0f0] my-1.5" />
      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f5f5f4] transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#888" strokeWidth="1.3">
          <rect x="2" y="3" width="12" height="3" rx="0.5" />
          <path d="M2 9h12M2 12h8" strokeLinecap="round" />
        </svg>
        Wrap headers
      </button>
    </div>
  );
}

