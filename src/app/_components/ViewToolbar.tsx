"use client";
// src/app/_components/ViewToolbar.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column } from "@prisma/client";
import type {
  FilterTree,
  SortRule,
  GroupRule,
  RowHeight,
} from "./tableUtils";
import {
  countFilterConditions,
  createFilterTree,
  getActiveFilterFieldIds,
  hasActiveFilters,
  normalizeFilterTree,
} from "./tableUtils";
import { FilterPanel, HideFieldsPanel, PanelWrapper } from "./viewToolbarPanelsA";
import { GroupPanel, RowHeightPanel, SortPanel } from "./viewToolbarPanelsB";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";

export type ViewConfig = {
  hiddenFields: Record<string, boolean>;
  filters: FilterTree;
  sorts: SortRule[];
  groups: GroupRule[];
  rowHeight: RowHeight;
  frozenColumnCount: number;
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  hiddenFields: {},
  filters: createFilterTree(),
  sorts: [],
  groups: [],
  rowHeight: "short",
  frozenColumnCount: 0,
};

export type OpenPanel = "hide" | "filter" | "group" | "sort" | "height" | null;

const TOOLBAR_SUBTLE = "rgb(97, 102, 112)";

const VIEW_META: Record<string, { asset: number; color: string }> = {
  GRID: { asset: 236, color: "#2d7ff9" },
  KANBAN: { asset: 207, color: "#22c55e" },
};

const ACTIVE_TOOL_CHIP: Record<Exclude<OpenPanel, null>, { bg: string; icon: string }> = {
  hide: { bg: "#C4ECFF", icon: "#4A5C73" },
  filter: { bg: "#CFF5D1", icon: "#3E5B45" },
  group: { bg: "#E0DAFD", icon: "#544C75" },
  sort: { bg: "#FFE0CC", icon: "#6F5545" },
  height: { bg: "#EAF3FF", icon: "#3668B5" },
};

export default function ViewToolbar({
  columns,
  config,
  onConfigChange,
  onReorderColumns,
  activeViewName,
  activeViewType = "GRID",
  activeViewId,
  activeViewDescription,
  onRenameView,
  onUpdateViewDescription,
  onBulkAddRows,
  bulkAdding = false,
  onToggleSidebar,
  frozenColumnCount: _frozenColumnCount = 0,
  forcedOpenPanel,
  onForcedOpenHandled,
}: {
  columns: Column[];
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
  onReorderColumns?: (orderedIds: string[]) => void;
  activeViewName?: string;
  activeViewType?: string;
  activeViewId?: string | null;
  activeViewDescription?: string | null;
  onRenameView?: (viewId: string, name: string) => void;
  onUpdateViewDescription?: (viewId: string, description: string) => void;
  onBulkAddRows?: () => void;
  bulkAdding?: boolean;
  onToggleSidebar?: () => void;
  frozenColumnCount?: number;
  forcedOpenPanel?: Exclude<OpenPanel, null> | null;
  onForcedOpenHandled?: () => void;
}) {
  const [open, setOpen] = useState<OpenPanel>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<{ left: number; top: number; height: number } | null>(null);
  const [renamingView, setRenamingView] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftName, setDraftName] = useState(activeViewName ?? "");
  const [draftDesc, setDraftDesc] = useState(activeViewDescription ?? "");

  useEffect(() => {
    if (!forcedOpenPanel) return;
    setOpen(forcedOpenPanel);
    onForcedOpenHandled?.();
  }, [forcedOpenPanel, onForcedOpenHandled]);

  function toggle(panel: Exclude<OpenPanel, null>) {
    setOpen((p) => (p === panel ? null : panel));
  }

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns],
  );
  const primaryColumnId = sortedColumns[0]?.id ?? null;
  const nonHideableColumnIds = useMemo(() => {
    return primaryColumnId ? [primaryColumnId] : [];
  }, [primaryColumnId]);
  const nonHideableColumnSet = useMemo(
    () => new Set(nonHideableColumnIds),
    [nonHideableColumnIds],
  );
  const hiddenCount = sortedColumns.reduce((count, column) => {
    if (nonHideableColumnSet.has(column.id)) return count;
    return count + (config.hiddenFields[column.id] ? 1 : 0);
  }, 0);
  const normalizedFilters = useMemo(
    () => normalizeFilterTree(config.filters),
    [config.filters],
  );
  const hasFilters = hasActiveFilters(normalizedFilters);
  const totalFilterConditions = countFilterConditions(normalizedFilters);
  const hasGroups = config.groups.length > 0;
  const hasSorts = config.sorts.length > 0;
  const activeViewMeta = VIEW_META[activeViewType] ?? { asset: 236, color: "#2d7ff9" };
  const columnNameById = new Map(sortedColumns.map((column) => [column.id, column.name]));
  const activeFilterFieldNames = useMemo(() => {
    if (!hasFilters) return [];
    return getActiveFilterFieldIds(normalizedFilters)
      .map((id) => columnNameById.get(id))
      .filter((name): name is string => Boolean(name));
  }, [columnNameById, hasFilters, normalizedFilters]);

  const sanitizeHiddenFields = useCallback((nextHiddenFields: Record<string, boolean>) => {
    if (nonHideableColumnIds.length === 0) return nextHiddenFields;
    const sanitized = { ...nextHiddenFields };
    let changed = false;
    nonHideableColumnIds.forEach((columnId) => {
      if (!sanitized[columnId]) return;
      delete sanitized[columnId];
      changed = true;
    });
    return changed ? sanitized : nextHiddenFields;
  }, [nonHideableColumnIds]);

  useEffect(() => {
    const sanitized = sanitizeHiddenFields(config.hiddenFields);
    if (sanitized === config.hiddenFields) return;
    onConfigChange({ hiddenFields: sanitized });
  }, [config.hiddenFields, onConfigChange, sanitizeHiddenFields]);

  type BtnDef = {
    id: Exclude<OpenPanel, null>;
    label: string;
    active: boolean;
    iconAsset: number;
  };

  const BTNS: BtnDef[] = [
    {
      id: "hide",
      label:
        hiddenCount > 0
          ? `${hiddenCount} hidden field${hiddenCount > 1 ? "s" : ""}`
          : "Hide fields",
      active: open === "hide" || hiddenCount > 0,
      iconAsset: 283,
    },
    {
      id: "filter",
      label:
        hasFilters
          ? `Filtered by ${activeFilterFieldNames.length > 0 ? activeFilterFieldNames.join(", ") : `${totalFilterConditions} field${totalFilterConditions > 1 ? "s" : ""}`}`
          : "Filter",
      active: open === "filter" || hasFilters,
      iconAsset: 255,
    },
    {
      id: "group",
      label: hasGroups ? `Grouped by ${config.groups.length} field${config.groups.length > 1 ? "s" : ""}` : "Group",
      active: open === "group" || hasGroups,
      iconAsset: 232,
    },
    {
      id: "sort",
      label: hasSorts ? `Sorted by ${config.sorts.length} field${config.sorts.length > 1 ? "s" : ""}` : "Sort",
      active: open === "sort" || hasSorts,
      iconAsset: 423,
    },
  ];

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const menuWidth = 260;
  const menuLeft = viewMenuAnchor ? Math.max(68, Math.min(viewMenuAnchor.left, viewportW - menuWidth - 12)) : 68;
  const menuTop = viewMenuAnchor ? viewMenuAnchor.top + viewMenuAnchor.height + 8 : 48;

  return (
    <div className="h-12 border-b border-[#e0e0e0] flex items-center px-3 gap-1 flex-shrink-0 bg-white">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="mr-1 p-1.5 rounded hover:bg-[#f0f0ef] text-[#616670] transition-colors flex-shrink-0"
          title="Toggle view sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {activeViewName && (
        <>
          {renamingView ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                if (onRenameView && activeViewId) onRenameView(activeViewId, draftName.trim() || activeViewName || "");
                setRenamingView(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (onRenameView && activeViewId) onRenameView(activeViewId, draftName.trim() || activeViewName || "");
                  setRenamingView(false);
                }
                if (e.key === "Escape") setRenamingView(false);
              }}
              className="px-2 py-1 rounded border border-[#c9c9c9] text-[13px] text-[#172b4d] font-medium outline-none w-[160px]"
            />
          ) : (
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setViewMenuAnchor({ left: rect.left, top: rect.top, height: rect.height });
                setViewMenuOpen((p) => !p);
                setEditingDesc(false);
                setDraftName(activeViewName ?? "");
                setDraftDesc(activeViewDescription ?? "");
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#f2f3f5] text-[#1d1f25] font-medium text-[13px] transition-colors"
            >
              <AirtableAssetIcon asset={activeViewMeta.asset} alt="" size={16} tintColor={activeViewMeta.color} />
              {activeViewName}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aaa" strokeWidth="1.5">
                <path d="M2.5 4l2.5 2.5L7.5 4" />
              </svg>
            </button>
          )}
          <div className="w-px h-5 bg-[#e8e8e8] mx-1" />
        </>
      )}

      <div className="flex-1" />

      {BTNS.map((btn) => (
        <div key={btn.id} className="relative">
          {(() => {
            const activeChip = ACTIVE_TOOL_CHIP[btn.id];
            return (
          <button
            onClick={() => toggle(btn.id)}
            className={`flex h-[26px] items-center gap-1.5 rounded px-2 py-1 text-[13px] transition-colors ${
              btn.active
                ? "text-[#1d1f25]"
                : "text-[#616670] hover:text-[#1d1f25] hover:bg-[#f5f5f4]"
            }`}
            style={btn.active ? { backgroundColor: activeChip.bg } : undefined}
          >
            <span className="inline-flex items-center justify-center">
              <AirtableAssetIcon
                asset={btn.iconAsset}
                alt=""
                size={16}
                tintColor={btn.active ? activeChip.icon : TOOLBAR_SUBTLE}
              />
            </span>
            {btn.label}
          </button>
            );
          })()}

          {open === btn.id && (
            <PanelWrapper onClose={() => setOpen(null)}>
              {btn.id === "hide" && (
                <HideFieldsPanel
                  columns={sortedColumns}
                  hiddenFields={config.hiddenFields}
                  nonHideableColumnIds={nonHideableColumnIds}
                  onReorderColumns={onReorderColumns}
                  onChange={(hf) =>
                    onConfigChange({ hiddenFields: sanitizeHiddenFields(hf) })
                  }
                />
              )}
              {btn.id === "filter" && (
                <FilterPanel
                  columns={columns}
                  filters={normalizedFilters}
                  onChange={(f) => onConfigChange({ filters: normalizeFilterTree(f) })}
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

      <button className="flex items-center gap-1.5 px-2 py-1 rounded text-[13px] text-[#616670] hover:text-[#1d1f25] hover:bg-[#f5f5f4] transition-colors">
        <AirtableAssetIcon asset={149} alt="" size={16} tintColor={TOOLBAR_SUBTLE} />
        Color
      </button>
      <div className="relative">
        <button
          onClick={() => toggle("height")}
          className={`h-7 w-7 inline-flex items-center justify-center rounded transition-colors ${
            open === "height"
              ? "bg-[#ebf5ff] text-[#0069ff]"
              : "text-[#616670] hover:text-[#1d1f25] hover:bg-[#f5f5f4]"
          }`}
          title="Row height"
        >
          <AirtableAssetIcon asset={105} alt="" size={16} tintColor={open === "height" ? "#0069ff" : TOOLBAR_SUBTLE} />
        </button>
        {open === "height" && (
          <PanelWrapper onClose={() => setOpen(null)}>
            <RowHeightPanel
              rowHeight={config.rowHeight}
              onChange={(h) => onConfigChange({ rowHeight: h })}
            />
          </PanelWrapper>
        )}
      </div>
      <button className="flex items-center gap-1.5 px-2 py-1 rounded text-[13px] text-[#616670] hover:text-[#1d1f25] hover:bg-[#f5f5f4] transition-colors">
        <AirtableAssetIcon asset={430} alt="" size={16} tintColor={TOOLBAR_SUBTLE} />
        Share and sync
      </button>
      <button className="h-7 w-7 inline-flex items-center justify-center rounded text-[#616670] hover:text-[#1d1f25] hover:bg-[#f5f5f4] transition-colors">
        <AirtableAssetIcon asset={175} alt="" size={16} tintColor={TOOLBAR_SUBTLE} />
      </button>
      {onBulkAddRows && (
        <button
          onClick={onBulkAddRows}
          disabled={bulkAdding}
          className="h-7 inline-flex items-center justify-center rounded-[8px] border border-[#d8dbe1] px-2.5 text-[13px] font-medium text-[#1d1f25] hover:bg-[#f5f5f4] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          title="Testing only: add 100,000 filled rows"
        >
          {bulkAdding ? "Adding..." : "+100k rows"}
        </button>
      )}

      {viewMenuOpen && activeViewId && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setViewMenuOpen(false)} />
          <div
            className="fixed z-30 w-[260px] bg-white border border-[#e0e0e0] rounded-xl shadow-xl overflow-hidden text-[13px]"
            style={{ left: menuLeft, top: menuTop }}
          >
            <div className="px-4 py-3 border-b border-[#f0f0f0]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#222]">Collaborative view</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#888" strokeWidth="1.3">
                  <path d="M4 2l4 4-4 4" />
                </svg>
              </div>
              <div className="text-[11px] text-[#888] mt-1">Editors and up can edit the view configuration</div>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setViewMenuOpen(false);
                  setRenamingView(true);
                  setDraftName(activeViewName ?? "");
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#f8f8f8] flex items-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" strokeLinejoin="round" />
                </svg>
                Rename view
              </button>
              <button
                onClick={() => {
                  setEditingDesc(true);
                  setRenamingView(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#f8f8f8] flex items-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="6" cy="6" r="4.5" />
                  <path d="M6 4v4M4 6h4" />
                </svg>
                Edit view description
              </button>
              <div className="border-t border-[#f0f0f0] my-1" />
              <button className="w-full text-left px-4 py-2 hover:bg-[#f8f8f8] flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2" y="2" width="6" height="6" rx="1" />
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                </svg>
                Duplicate view
              </button>
              <div className="border-t border-[#f0f0f0] my-1" />
              <button className="w-full text-left px-4 py-2 hover:bg-[#f8f8f8] flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 1h6v10H3z" />
                  <path d="M5 4h2M5 6h2M5 8h2" />
                </svg>
                Download CSV
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-[#f8f8f8] flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2" y="2" width="8" height="6" rx="1" />
                  <path d="M3 10h6" />
                </svg>
                Print view
              </button>
              <div className="border-t border-[#f0f0f0] my-1" />
              <button className="w-full text-left px-4 py-2 text-red-400 hover:bg-[#fef2f2] flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M3 3l1 7h4l1-7" strokeLinecap="round" />
                </svg>
                Delete view
              </button>
            </div>

            {editingDesc && (
              <div className="border-t border-[#f0f0f0] px-4 py-3 space-y-2">
                {editingDesc && (
                  <>
                    <label className="text-[11px] text-[#777]">Description</label>
                    <textarea
                      rows={2}
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      className="w-full border border-[#d9d9d9] rounded px-2 py-1 text-[13px] outline-none focus:border-[#0069ff] resize-none"
                    />
                  </>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setRenamingView(false);
                      setEditingDesc(false);
                    }}
                    className="text-[13px] text-[#777] hover:text-[#444]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingDesc && onUpdateViewDescription && activeViewId) onUpdateViewDescription(activeViewId, draftDesc);
                      setEditingDesc(false);
                    }}
                    className="text-[13px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-2.5 py-1 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

