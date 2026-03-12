"use client";
// src/app/_components/ViewToolbar.tsx
import { useState } from "react";
import type { Column } from "@prisma/client";
import {
  FIELD_TYPES,
  FILTER_OPS,
  type FilterCondition,
  type FilterOp,
  type SortRule,
  type GroupRule,
  type RowHeight,
} from "./tableUtils";

// ── Shared types ──────────────────────────────────────────────────────────────

export type ViewConfig = {
  hiddenFields: Record<string, boolean>;
  filters:      FilterCondition[];
  sorts:        SortRule[];
  groups:       GroupRule[];
  rowHeight:    RowHeight;
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  hiddenFields: {},
  filters:      [],
  sorts:        [],
  groups:       [],
  rowHeight:    "short",
};

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── PanelWrapper ──────────────────────────────────────────────────────────────

function PanelWrapper({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

// ── HideFieldsPanel ───────────────────────────────────────────────────────────

function HideFieldsPanel({
  columns,
  hiddenFields,
  onChange,
}: {
  columns: Column[];
  hiddenFields: Record<string, boolean>;
  onChange: (hf: Record<string, boolean>) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = columns.filter(
    (c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-64 p-3">
      <input
        autoFocus
        className="w-full border border-[#e0e0e0] rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#0069ff] mb-3 placeholder-[#aaa]"
        placeholder="Find a field"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-0.5 max-h-64 overflow-y-auto mb-3">
        {filtered.map((col) => {
          const ft      = FIELD_TYPES[col.type];
          const visible = !hiddenFields[col.id];
          return (
            <div
              key={col.id}
              className="flex items-center gap-2 py-1.5 px-1 hover:bg-[#f5f5f4] rounded-md cursor-pointer"
              onClick={() => onChange({ ...hiddenFields, [col.id]: !hiddenFields[col.id] })}
            >
              {/* Toggle pill */}
              <div
                className={`w-8 h-4 rounded-full flex-shrink-0 relative transition-colors ${
                  visible ? "bg-[#22c55e]" : "bg-[#d1d5db]"
                }`}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all"
                  style={{ left: visible ? "18px" : "2px" }}
                />
              </div>
              <span className="text-[#888] text-xs w-3.5 text-center flex-shrink-0">
                {ft?.icon}
              </span>
              <span className="text-xs text-[#1f2937] flex-1 truncate">{col.name}</span>
              <svg
                width="10" height="12" viewBox="0 0 10 12" fill="none"
                className="text-[#ccc] flex-shrink-0"
              >
                <circle cx="3" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="3" cy="9" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="9" r="1.2" fill="currentColor"/>
              </svg>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-[#aaa] text-center py-3">No fields found</p>
        )}
      </div>

      <div className="flex gap-2 border-t border-[#f0f0f0] pt-2.5">
        <button
          onClick={() => onChange(Object.fromEntries(columns.map((c) => [c.id, true])))}
          className="flex-1 py-1 text-xs text-[#555] border border-[#e0e0e0] rounded-md hover:bg-[#f5f5f4] transition-colors"
        >
          Hide all
        </button>
        <button
          onClick={() => onChange({})}
          className="flex-1 py-1 text-xs text-[#555] border border-[#e0e0e0] rounded-md hover:bg-[#f5f5f4] transition-colors"
        >
          Show all
        </button>
      </div>
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

function FilterPanel({
  columns,
  filters,
  onChange,
}: {
  columns: Column[];
  filters: FilterCondition[];
  onChange: (f: FilterCondition[]) => void;
}) {
  function add() {
    const col = columns[0];
    if (!col) return;
    onChange([...filters, { id: uid(), columnId: col.id, op: "contains", value: "" }]);
  }

  function remove(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  function update(id: string, patch: Partial<FilterCondition>) {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function opsForCol(colId: string): FilterOp[] {
    const col = columns.find((c) => c.id === colId);
    if (!col) return ["contains", "does_not_contain", "equals", "not_equals", "is_empty", "is_not_empty"];
    if (["NUMBER", "CURRENCY", "PERCENT", "RATING"].includes(col.type))
      return ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"];
    if (col.type === "CHECKBOX") return ["equals", "not_equals", "is_empty", "is_not_empty"];
    return ["contains", "does_not_contain", "equals", "not_equals", "is_empty", "is_not_empty"];
  }

  return (
    <div className="w-[520px] p-4">
      {/* AI search row (decorative, like Airtable) */}
      <div className="flex items-center gap-2 border border-[#e0e0e0] rounded-lg px-3 py-2 mb-4 bg-[#fafafa]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <circle cx="5" cy="5" r="4" stroke="#f59e0b" strokeWidth="1.3" strokeDasharray="2 1.5"/>
          <path d="M8 8l3.5 3.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-xs text-[#aaa]">Describe what you want to see…</span>
      </div>

      <p className="text-xs text-[#888] mb-3">In this view, show records</p>

      {filters.length === 0 && (
        <p className="text-xs text-[#bbb] italic mb-3">
          No conditions yet — click &ldquo;+ Add condition&rdquo; below.
        </p>
      )}

      <div className="space-y-2 mb-4">
        {filters.map((f, i) => {
          const ops       = opsForCol(f.columnId);
          const needsVal  = FILTER_OPS[f.op]?.needsValue ?? true;
          return (
            <div key={f.id} className="flex items-center gap-2">
              <span className="text-xs text-[#888] w-12 flex-shrink-0 text-right font-medium">
                {i === 0 ? "Where" : "and"}
              </span>

              {/* Column picker */}
              <select
                className="flex-1 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={f.columnId}
                onChange={(e) =>
                  update(f.id, {
                    columnId: e.target.value,
                    op: opsForCol(e.target.value)[0]!,
                    value: "",
                  })
                }
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Operator picker */}
              <select
                className="w-36 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={f.op}
                onChange={(e) => update(f.id, { op: e.target.value as FilterOp })}
              >
                {ops.map((op) => (
                  <option key={op} value={op}>{FILTER_OPS[op]?.label ?? op}</option>
                ))}
              </select>

              {/* Value input */}
              {needsVal ? (
                <input
                  className="w-32 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] placeholder-[#ccc]"
                  placeholder="Enter a value"
                  value={f.value}
                  onChange={(e) => update(f.id, { value: e.target.value })}
                />
              ) : (
                <div className="w-32" />
              )}

              {/* More options dots */}
              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
                </svg>
              </button>

              {/* Delete */}
              <button
                onClick={() => remove(f.id)}
                className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#172b4d] font-medium transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 1v8M1 5h8" strokeLinecap="round"/>
          </svg>
          Add condition
        </button>
        <button className="flex items-center gap-1.5 text-xs text-[#0069ff] hover:underline font-medium">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 1v8M1 5h8" strokeLinecap="round"/>
          </svg>
          Add condition group
        </button>
      </div>
    </div>
  );
}

// ── GroupPanel ────────────────────────────────────────────────────────────────

function GroupPanel({
  columns,
  groups,
  onChange,
}: {
  columns: Column[];
  groups: GroupRule[];
  onChange: (g: GroupRule[]) => void;
}) {
  const groupableCols = columns.filter((c) =>
    ["TEXT", "SINGLE_SELECT", "MULTI_SELECT", "NUMBER", "DATE", "EMAIL", "URL", "PHONE"].includes(c.type),
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
        <div className="flex gap-3 text-xs text-[#0069ff]">
          <button className="hover:underline">Collapse all</button>
          <button className="hover:underline">Expand all</button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-[#bbb] italic mb-4">No groups — add one below.</p>
      )}

      <div className="space-y-2 mb-4">
        {groups.map((g, i) => {
          const usedIds  = new Set(groups.filter((x) => x.id !== g.id).map((x) => x.columnId));
          const availCols = groupableCols.filter((c) => !usedIds.has(c.id) || c.id === g.columnId);
          return (
            <div key={g.id} className="flex items-center gap-2">
              <span className="text-xs text-[#888] w-16 flex-shrink-0 text-right font-medium">
                {i === 0 ? "Group by" : "then by"}
              </span>

              <select
                className="flex-1 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={g.columnId}
                onChange={(e) => update(g.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="w-24 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={g.dir}
                onChange={(e) => update(g.id, { dir: e.target.value as "asc" | "desc" })}
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>

              {/* more dots */}
              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
                </svg>
              </button>

              <button
                onClick={() => remove(g.id)}
                className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {groups.length < groupableCols.length && (
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#172b4d] font-medium transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 1v8M1 5h8" strokeLinecap="round"/>
          </svg>
          Add subgroup
        </button>
      )}
    </div>
  );
}

// ── SortPanel ─────────────────────────────────────────────────────────────────

function SortPanel({
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
    const col     = columns.find((c) => !usedIds.has(c.id));
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
        <p className="text-xs text-[#bbb] italic mb-4">No sort rules — add one below.</p>
      )}

      <div className="space-y-2 mb-4">
        {sorts.map((s) => {
          const usedIds  = new Set(sorts.filter((x) => x.id !== s.id).map((x) => x.columnId));
          const availCols = columns.filter((c) => !usedIds.has(c.id) || c.id === s.columnId);
          return (
            <div key={s.id} className="flex items-center gap-2">
              <select
                className="flex-1 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={s.columnId}
                onChange={(e) => update(s.id, { columnId: e.target.value })}
              >
                {availCols.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="w-24 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={s.dir}
                onChange={(e) => update(s.id, { dir: e.target.value as "asc" | "desc" })}
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>

              {/* more dots */}
              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
                </svg>
              </button>

              <button
                onClick={() => remove(s.id)}
                className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={add}
        disabled={sorts.length >= columns.length}
        className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#172b4d] font-medium transition-colors disabled:opacity-40 mb-4"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 1v8M1 5h8" strokeLinecap="round"/>
        </svg>
        Add another sort
      </button>

      <div className="flex items-center gap-2.5 border-t border-[#f0f0f0] pt-3">
        <div className="w-8 h-4 rounded-full bg-[#22c55e] relative flex-shrink-0">
          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow"/>
        </div>
        <span className="text-xs text-[#555]">Automatically sort records</span>
      </div>
    </div>
  );
}

// ── RowHeightPanel ────────────────────────────────────────────────────────────

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
        <rect x="2" y="6" width="12" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    value: "medium",
    label: "Medium",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="5" width="12" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    value: "tall",
    label: "Tall",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="4" width="12" height="8" rx="1"/>
      </svg>
    ),
  },
  {
    value: "extra-tall",
    label: "Extra Tall",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="2" width="12" height="12" rx="1"/>
      </svg>
    ),
  },
];

function RowHeightPanel({
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
      <div className="border-t border-[#f0f0f0] my-1.5"/>
      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f5f5f4] transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#888" strokeWidth="1.3">
          <rect x="2" y="3" width="12" height="3" rx="0.5"/>
          <path d="M2 9h12M2 12h8" strokeLinecap="round"/>
        </svg>
        Wrap headers
      </button>
    </div>
  );
}

// ── ViewToolbar (main export) ─────────────────────────────────────────────────

type OpenPanel = "hide" | "filter" | "group" | "sort" | "height" | null;

const VIEW_ICONS: Record<string, React.ReactNode> = {
  GRID: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="5" height="5" rx="0.5"/>
      <rect x="8" y="1" width="5" height="5" rx="0.5"/>
      <rect x="1" y="8" width="5" height="5" rx="0.5"/>
      <rect x="8" y="8" width="5" height="5" rx="0.5"/>
    </svg>
  ),
  KANBAN: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1"   y="1" width="3.5" height="12" rx="0.5"/>
      <rect x="5.25" y="1" width="3.5" height="8"  rx="0.5"/>
      <rect x="9.5" y="1" width="3.5" height="10" rx="0.5"/>
    </svg>
  ),
};

const VIEW_COLORS: Record<string, string> = {
  GRID:   "#166a5b",
  KANBAN: "#9b59b6",
};

export default function ViewToolbar({
  columns,
  config,
  onConfigChange,
  activeViewName,
  activeViewType = "GRID",
}: {
  columns: Column[];
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
  activeViewName?: string;
  activeViewType?: string;
}) {
  const [open, setOpen] = useState<OpenPanel>(null);

  function toggle(panel: Exclude<OpenPanel, null>) {
    setOpen((p) => (p === panel ? null : panel));
  }

  const hiddenCount = Object.values(config.hiddenFields).filter(Boolean).length;
  const hasFilters  = config.filters.length > 0;
  const hasGroups   = config.groups.length > 0;
  const hasSorts    = config.sorts.length > 0;

  type BtnDef = {
    id:     Exclude<OpenPanel, null>;
    label:  string;
    active: boolean;
    icon:   React.ReactNode;
  };

  const BTNS: BtnDef[] = [
    {
      id:     "hide",
      label:  hiddenCount > 0 ? `Hide fields (${hiddenCount})` : "Hide fields",
      active: open === "hide" || hiddenCount > 0,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z"/>
          <circle cx="6" cy="6" r="1.5"/>
          <path d="M2 2l8 8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id:     "filter",
      label:  hasFilters ? `Filter (${config.filters.length})` : "Filter",
      active: open === "filter" || hasFilters,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 2h10l-4 5v4l-2-1V7L1 2z" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "group",
      label:
        hasGroups
          ? `Grouped by ${config.groups.length} field${config.groups.length > 1 ? "s" : ""}`
          : "Group",
      active: open === "group" || hasGroups,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 3h10M1 6h7M1 9h4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "sort",
      label:
        hasSorts
          ? `Sorted by ${config.sorts.length} field${config.sorts.length > 1 ? "s" : ""}`
          : "Sort",
      active: open === "sort" || hasSorts,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 3h10M2 6h6M3 9h4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id:     "height",
      label:  "Row height",
      active: open === "height",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1" y="2" width="10" height="3" rx="0.5"/>
          <rect x="1" y="7" width="10" height="3" rx="0.5"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="h-10 border-b border-[#e0e0e0] flex items-center px-3 gap-1 flex-shrink-0 bg-white">
      {/* View name button */}
      {activeViewName && (
        <>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#f5f5f4] text-[#172b4d] font-medium text-[12px] transition-colors">
            <span style={{ color: VIEW_COLORS[activeViewType] ?? "#166a5b" }}>
              {VIEW_ICONS[activeViewType] ?? VIEW_ICONS.GRID}
            </span>
            {activeViewName}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aaa" strokeWidth="1.5">
              <path d="M2.5 4l2.5 2.5L7.5 4"/>
            </svg>
          </button>
          <div className="w-px h-5 bg-[#e8e8e8] mx-1"/>
        </>
      )}

      {/* Tool buttons */}
      {BTNS.map((btn) => (
        <div key={btn.id} className="relative">
          <button
            onClick={() => toggle(btn.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] transition-colors ${
              btn.active
                ? "bg-[#ebf5ff] text-[#0069ff] font-medium"
                : "text-[#666] hover:text-[#172b4d] hover:bg-[#f5f5f4]"
            }`}
          >
            <span className={btn.active ? "text-[#0069ff]" : "text-[#888]"}>{btn.icon}</span>
            {btn.label}
          </button>

          {open === btn.id && (
            <PanelWrapper onClose={() => setOpen(null)}>
              {btn.id === "hide" && (
                <HideFieldsPanel
                  columns={columns}
                  hiddenFields={config.hiddenFields}
                  onChange={(hf) => onConfigChange({ hiddenFields: hf })}
                />
              )}
              {btn.id === "filter" && (
                <FilterPanel
                  columns={columns}
                  filters={config.filters}
                  onChange={(f) => onConfigChange({ filters: f })}
                />
              )}
              {btn.id === "group" && (
                <GroupPanel
                  columns={columns}
                  groups={config.groups}
                  onChange={(g) => onConfigChange({ groups: g })}
                />
              )}
              {btn.id === "sort" && (
                <SortPanel
                  columns={columns}
                  sorts={config.sorts}
                  onChange={(s) => onConfigChange({ sorts: s })}
                />
              )}
              {btn.id === "height" && (
                <RowHeightPanel
                  rowHeight={config.rowHeight}
                  onChange={(h) => onConfigChange({ rowHeight: h })}
                />
              )}
            </PanelWrapper>
          )}
        </div>
      ))}
    </div>
  );
}