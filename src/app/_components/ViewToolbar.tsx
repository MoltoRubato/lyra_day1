"use client";
// src/app/_components/ViewToolbar.tsx
import { useState } from "react";
import type { Column } from "@prisma/client";
import type {
  FilterCondition,
  SortRule,
  GroupRule,
  RowHeight,
} from "./tableUtils";
import { FilterPanel, HideFieldsPanel, PanelWrapper } from "./viewToolbarPanelsA";
import { GroupPanel, RowHeightPanel, SortPanel } from "./viewToolbarPanelsB";

export type ViewConfig = {
  hiddenFields: Record<string, boolean>;
  filters: FilterCondition[];
  sorts: SortRule[];
  groups: GroupRule[];
  rowHeight: RowHeight;
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  hiddenFields: {},
  filters: [],
  sorts: [],
  groups: [],
  rowHeight: "short",
};

type OpenPanel = "hide" | "filter" | "group" | "sort" | "height" | null;

const VIEW_ICONS: Record<string, React.ReactNode> = {
  GRID: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="5" height="5" rx="0.5" />
      <rect x="8" y="1" width="5" height="5" rx="0.5" />
      <rect x="1" y="8" width="5" height="5" rx="0.5" />
      <rect x="8" y="8" width="5" height="5" rx="0.5" />
    </svg>
  ),
  KANBAN: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="3.5" height="12" rx="0.5" />
      <rect x="5.25" y="1" width="3.5" height="8" rx="0.5" />
      <rect x="9.5" y="1" width="3.5" height="10" rx="0.5" />
    </svg>
  ),
};

const VIEW_COLORS: Record<string, string> = {
  GRID: "#166a5b",
  KANBAN: "#9b59b6",
};

export default function ViewToolbar({
  columns,
  config,
  onConfigChange,
  activeViewName,
  activeViewType = "GRID",
  onBulkAddRows,
  bulkAdding = false,
  onToggleSidebar,
}: {
  columns: Column[];
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
  activeViewName?: string;
  activeViewType?: string;
  onBulkAddRows?: () => void;
  bulkAdding?: boolean;
  onToggleSidebar?: () => void;
}) {
  const [open, setOpen] = useState<OpenPanel>(null);

  function toggle(panel: Exclude<OpenPanel, null>) {
    setOpen((p) => (p === panel ? null : panel));
  }

  const hiddenCount = Object.values(config.hiddenFields).filter(Boolean).length;
  const hasFilters = config.filters.length > 0;
  const hasGroups = config.groups.length > 0;
  const hasSorts = config.sorts.length > 0;

  type BtnDef = {
    id: Exclude<OpenPanel, null>;
    label: string;
    active: boolean;
    icon: React.ReactNode;
  };

  const BTNS: BtnDef[] = [
    {
      id: "hide",
      label: hiddenCount > 0 ? `Hide fields (${hiddenCount})` : "Hide fields",
      active: open === "hide" || hiddenCount > 0,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z" />
          <circle cx="6" cy="6" r="1.5" />
          <path d="M2 2l8 8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "filter",
      label: hasFilters ? `Filter (${config.filters.length})` : "Filter",
      active: open === "filter" || hasFilters,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 2h10l-4 5v4l-2-1V7L1 2z" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: "group",
      label: hasGroups ? `Grouped by ${config.groups.length} field${config.groups.length > 1 ? "s" : ""}` : "Group",
      active: open === "group" || hasGroups,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 3h10M1 6h7M1 9h4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "sort",
      label: hasSorts ? `Sorted by ${config.sorts.length} field${config.sorts.length > 1 ? "s" : ""}` : "Sort",
      active: open === "sort" || hasSorts,
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M1 3h10M2 6h6M3 9h4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "height",
      label: "Row height",
      active: open === "height",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1" y="2" width="10" height="3" rx="0.5" />
          <rect x="1" y="7" width="10" height="3" rx="0.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-10 border-b border-[#e0e0e0] flex items-center px-3 gap-1 flex-shrink-0 bg-white">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="mr-1 p-1.5 rounded hover:bg-[#f0f0ef] text-[#444] transition-colors flex-shrink-0"
          title="Toggle view sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {activeViewName && (
        <>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#f5f5f4] text-[#172b4d] font-medium text-[12px] transition-colors">
            <span style={{ color: VIEW_COLORS[activeViewType] ?? "#166a5b" }}>
              {VIEW_ICONS[activeViewType] ?? VIEW_ICONS.GRID}
            </span>
            {activeViewName}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aaa" strokeWidth="1.5">
              <path d="M2.5 4l2.5 2.5L7.5 4" />
            </svg>
          </button>
          <div className="w-px h-5 bg-[#e8e8e8] mx-1" />
        </>
      )}

      <div className="flex-1" />

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

      {onBulkAddRows && (
        <>
          <div className="w-px h-5 bg-[#e8e8e8] mx-1" />
          <button
            onClick={onBulkAddRows}
            disabled={bulkAdding}
            title="DEV — insert 100 000 empty rows to stress-test rendering"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-[#f97316] border border-[#f97316]/40 hover:bg-[#fff7f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {bulkAdding ? (
              <>
                <div className="w-2.5 h-2.5 border border-[#f97316] border-t-transparent rounded-full animate-spin" />
                Adding…
              </>
            ) : (
              "+ 100k rows"
            )}
          </button>
        </>
      )}
    </div>
  );
}
