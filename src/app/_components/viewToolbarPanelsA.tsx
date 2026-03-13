import { useState } from "react";
import type { Column } from "@prisma/client";
import {
  FIELD_TYPES,
  FILTER_OPS,
  type FilterCondition,
  type FilterOp,
} from "~/app/_components/tableUtils";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function PanelWrapper({
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
        className="absolute top-full right-0 z-50 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

export function HideFieldsPanel({
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
          const ft = FIELD_TYPES[col.type];
          const visible = !hiddenFields[col.id];
          return (
            <div
              key={col.id}
              className="flex items-center gap-2 py-1.5 px-1 hover:bg-[#f5f5f4] rounded-md cursor-pointer"
              onClick={() => onChange({ ...hiddenFields, [col.id]: !hiddenFields[col.id] })}
            >
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
                <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                <circle cx="7" cy="3" r="1.2" fill="currentColor" />
                <circle cx="3" cy="9" r="1.2" fill="currentColor" />
                <circle cx="7" cy="9" r="1.2" fill="currentColor" />
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

export function FilterPanel({
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
      <div className="flex items-center gap-2 border border-[#e0e0e0] rounded-lg px-3 py-2 mb-4 bg-[#fafafa]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
          <circle cx="5" cy="5" r="4" stroke="#f59e0b" strokeWidth="1.3" strokeDasharray="2 1.5" />
          <path d="M8 8l3.5 3.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
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
          const ops = opsForCol(f.columnId);
          const needsVal = FILTER_OPS[f.op]?.needsValue ?? true;
          return (
            <div key={f.id} className="flex items-center gap-2">
              <span className="text-xs text-[#888] w-12 flex-shrink-0 text-right font-medium">
                {i === 0 ? "Where" : "and"}
              </span>

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

              <select
                className="w-36 border border-[#e0e0e0] rounded-md px-2 py-1.5 text-xs outline-none focus:border-[#0069ff] bg-white"
                value={f.op}
                onChange={(e) => update(f.id, { op: e.target.value as FilterOp })}
              >
                {ops.map((op) => (
                  <option key={op} value={op}>{FILTER_OPS[op]?.label ?? op}</option>
                ))}
              </select>

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

              <button className="p-1 text-[#ccc] hover:text-[#888]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                </svg>
              </button>

              <button
                onClick={() => remove(f.id)}
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

      <div className="flex items-center gap-4">
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#172b4d] font-medium transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 1v8M1 5h8" strokeLinecap="round" />
          </svg>
          Add condition
        </button>
        <button className="flex items-center gap-1.5 text-xs text-[#0069ff] hover:underline font-medium">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 1v8M1 5h8" strokeLinecap="round" />
          </svg>
          Add condition group
        </button>
      </div>
    </div>
  );
}
