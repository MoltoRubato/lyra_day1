"use client";
// src/app/_components/ViewToolbar.tsx
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Column } from "@prisma/client";
import type { FilterTree, SortRule, GroupRule, RowHeight } from "./tableUtils";
import {
  countFilterConditions,
  createFilterTree,
  getActiveFilterFieldIds,
  hasActiveFilters,
  normalizeFilterTree,
} from "./tableUtils";
import {
  FilterPanel,
  HideFieldsPanel,
  PanelWrapper,
} from "./viewToolbarPanelsA";
import { GroupPanel, RowHeightPanel, SortPanel } from "./viewToolbarPanelsB";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";

export type ViewConfig = {
  hiddenFields: Record<string, boolean>;
  filters: FilterTree;
  sorts: SortRule[];
  autoSortRecords: boolean;
  groups: GroupRule[];
  rowHeight: RowHeight;
  wrapHeaders: boolean;
  frozenColumnCount: number;
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  hiddenFields: {},
  filters: createFilterTree(),
  sorts: [],
  autoSortRecords: true,
  groups: [],
  rowHeight: "short",
  wrapHeaders: false,
  frozenColumnCount: 0,
};

export type OpenPanel = "hide" | "filter" | "group" | "sort" | "height" | null;

const TOOLBAR_SUBTLE = "rgb(97, 102, 112)";
const TOOLBAR_ICON_DIMENSIONS: Record<
  number,
  { width: number; height: number }
> = {
  236: { width: 14, height: 12 },
  283: { width: 15, height: 12 },
  255: { width: 14, height: 7 },
  232: { width: 13, height: 11 },
  423: { width: 11, height: 11 },
  149: { width: 15.58, height: 14.02 },
  105: { width: 14, height: 11 },
  106: { width: 14, height: 11 },
  107: { width: 14, height: 11 },
  108: { width: 14, height: 11 },
  430: { width: 12, height: 12 },
  175: { width: 13, height: 13 },
};

const ROW_HEIGHT_TOOL_ICONS: Record<RowHeight, number> = {
  short: 105,
  medium: 106,
  tall: 107,
  "extra-tall": 108,
};

const VIEW_META: Record<string, { asset: number; color: string }> = {
  GRID: { asset: 236, color: "#2d7ff9" },
  KANBAN: { asset: 207, color: "#22c55e" },
};

const ACTIVE_TOOL_CHIP: Record<
  Exclude<OpenPanel, null>,
  { bg: string; icon: string }
> = {
  hide: { bg: "#C4ECFF", icon: "#4A5C73" },
  filter: { bg: "#CFF5D1", icon: "#3E5B45" },
  group: { bg: "#E0DAFD", icon: "#544C75" },
  sort: { bg: "#FFE0CC", icon: "#6F5545" },
  height: { bg: "#EAF3FF", icon: "#3668B5" },
};

const GRID_SEARCH_COUNT_STYLE: CSSProperties = {
  alignItems: "center",
  boxSizing: "border-box",
  color: "rgb(29, 31, 37)",
  display: "flex",
  flexBasis: "auto",
  flexGrow: 0,
  flexShrink: 0,
  fontFamily:
    '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  fontSize: "11px",
  fontWeight: 400,
  height: "37.6231px",
  lineHeight: "18px",
  margin: 0,
  opacity: 0.5,
  padding: "0 8px 0 0",
  pointerEvents: "none",
  unicodeBidi: "isolate",
  userSelect: "none",
  WebkitBoxAlign: "center",
  WebkitBoxFlex: 0,
};

function ToolbarAssetIcon({
  asset,
  tintColor,
}: {
  asset: number;
  tintColor: string;
}) {
  const dimensions = TOOLBAR_ICON_DIMENSIONS[asset] ?? {
    width: 16,
    height: 16,
  };
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      <AirtableAssetIcon
        asset={asset}
        alt=""
        tintColor={tintColor}
        style={{ width: dimensions.width, height: dimensions.height }}
      />
    </span>
  );
}

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
  collapsedGroupKeys = [],
  availableGroupKeys = [],
  onCollapseAllGroups,
  onExpandAllGroups,
  enableGridSearch = false,
  gridSearchOpen = false,
  gridSearchQuery = "",
  gridSearchMatchCount = 0,
  onOpenGridSearch,
  onCloseGridSearch,
  onGridSearchQueryChange,
  onGridSearchNavigate,
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
  collapsedGroupKeys?: string[];
  availableGroupKeys?: string[];
  onCollapseAllGroups?: () => void;
  onExpandAllGroups?: () => void;
  enableGridSearch?: boolean;
  gridSearchOpen?: boolean;
  gridSearchQuery?: string;
  gridSearchMatchCount?: number;
  onOpenGridSearch?: () => void;
  onCloseGridSearch?: () => void;
  onGridSearchQueryChange?: (value: string) => void;
  onGridSearchNavigate?: (direction: 1 | -1) => void;
}) {
  const [open, setOpen] = useState<OpenPanel>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);
  const [renamingView, setRenamingView] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftName, setDraftName] = useState(activeViewName ?? "");
  const [draftDesc, setDraftDesc] = useState(activeViewDescription ?? "");
  const [localGridSearchActiveMatchNumber, setLocalGridSearchActiveMatchNumber] =
    useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridSearchSessionKeyRef = useRef("");

  useEffect(() => {
    if (!forcedOpenPanel) return;
    setOpen(forcedOpenPanel);
    onForcedOpenHandled?.();
  }, [forcedOpenPanel, onForcedOpenHandled]);

  useEffect(() => {
    if (!gridSearchOpen) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [gridSearchOpen]);

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
  const rowHeightToolAsset = ROW_HEIGHT_TOOL_ICONS[config.rowHeight] ?? 105;
  const activeViewMeta = VIEW_META[activeViewType] ?? {
    asset: 236,
    color: "#2d7ff9",
  };
  const columnNameById = useMemo(
    () => new Map(sortedColumns.map((column) => [column.id, column.name])),
    [sortedColumns],
  );
  const activeFilterFieldNames = useMemo(() => {
    if (!hasFilters) return [];
    return getActiveFilterFieldIds(normalizedFilters)
      .map((id) => columnNameById.get(id))
      .filter((name): name is string => Boolean(name));
  }, [columnNameById, hasFilters, normalizedFilters]);

  const sanitizeHiddenFields = useCallback(
    (nextHiddenFields: Record<string, boolean>) => {
      if (nonHideableColumnIds.length === 0) return nextHiddenFields;
      const sanitized = { ...nextHiddenFields };
      let changed = false;
      nonHideableColumnIds.forEach((columnId) => {
        if (!sanitized[columnId]) return;
        delete sanitized[columnId];
        changed = true;
      });
      return changed ? sanitized : nextHiddenFields;
    },
    [nonHideableColumnIds],
  );

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
      label: hasFilters
        ? `Filtered by ${activeFilterFieldNames.length > 0 ? activeFilterFieldNames.join(", ") : `${totalFilterConditions} field${totalFilterConditions > 1 ? "s" : ""}`}`
        : "Filter",
      active: open === "filter" || hasFilters,
      iconAsset: 255,
    },
    {
      id: "group",
      label: hasGroups
        ? `Grouped by ${config.groups.length} field${config.groups.length > 1 ? "s" : ""}`
        : "Group",
      active: open === "group" || hasGroups,
      iconAsset: 232,
    },
    {
      id: "sort",
      label: hasSorts
        ? `Sorted by ${config.sorts.length} field${config.sorts.length > 1 ? "s" : ""}`
        : "Sort",
      active: open === "sort" || hasSorts,
      iconAsset: 423,
    },
  ];

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const menuWidth = 260;
  const menuLeft = viewMenuAnchor
    ? Math.max(68, Math.min(viewMenuAnchor.left, viewportW - menuWidth - 12))
    : 68;
  const menuTop = viewMenuAnchor
    ? viewMenuAnchor.top + viewMenuAnchor.height + 8
    : 48;
  const trimmedGridSearchQuery = gridSearchQuery.trim();
  const gridSearchSessionKey = gridSearchOpen ? trimmedGridSearchQuery : "";
  const hasGridSearchTerm =
    enableGridSearch && gridSearchOpen && trimmedGridSearchQuery.length > 0;
  const hasGridSearchMatches = hasGridSearchTerm && gridSearchMatchCount > 0;

  useEffect(() => {
    const searchSessionChanged =
      gridSearchSessionKeyRef.current !== gridSearchSessionKey;
    gridSearchSessionKeyRef.current = gridSearchSessionKey;

    if (!hasGridSearchTerm || gridSearchMatchCount === 0) {
      setLocalGridSearchActiveMatchNumber(0);
      return;
    }

    if (searchSessionChanged) {
      setLocalGridSearchActiveMatchNumber(1);
      return;
    }

    setLocalGridSearchActiveMatchNumber((prev) => {
      if (prev <= 0) return 1;
      return Math.min(prev, gridSearchMatchCount);
    });
  }, [gridSearchMatchCount, gridSearchSessionKey, hasGridSearchTerm]);

  const navigateGridSearch = useCallback(
    (direction: 1 | -1) => {
      if (!hasGridSearchMatches) return;

      setLocalGridSearchActiveMatchNumber((prev) => {
        const baseIndex =
          prev > 0 ? prev - 1 : direction > 0 ? -1 : 0;
        return (
          ((baseIndex + direction + gridSearchMatchCount) %
            gridSearchMatchCount) +
          1
        );
      });

      onGridSearchNavigate?.(direction);
    },
    [gridSearchMatchCount, hasGridSearchMatches, onGridSearchNavigate],
  );
  const displayedGridSearchActiveMatchNumber = hasGridSearchMatches
    ? Math.min(Math.max(localGridSearchActiveMatchNumber, 1), gridSearchMatchCount)
    : 0;
  const gridSearchSummaryLabel = hasGridSearchMatches
    ? `${displayedGridSearchActiveMatchNumber} of ${gridSearchMatchCount}`
    : "No results";

  return (
    <div className="relative z-[50] flex h-12 flex-shrink-0 items-center gap-1 border-b border-[#e0e0e0] bg-white px-3">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="mr-1 flex-shrink-0 rounded p-1.5 text-[#616670] transition-colors hover:bg-[#f0f0ef]"
          title="Toggle view sidebar"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
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
                if (onRenameView && activeViewId)
                  onRenameView(
                    activeViewId,
                    draftName.trim() || activeViewName || "",
                  );
                setRenamingView(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (onRenameView && activeViewId)
                    onRenameView(
                      activeViewId,
                      draftName.trim() || activeViewName || "",
                    );
                  setRenamingView(false);
                }
                if (e.key === "Escape") setRenamingView(false);
              }}
              className="w-[160px] rounded border border-[#c9c9c9] px-2 py-1 text-[13px] font-medium text-[#172b4d] outline-none"
            />
          ) : (
            <button
              onClick={(e) => {
                const rect = (
                  e.currentTarget as HTMLButtonElement
                ).getBoundingClientRect();
                setViewMenuAnchor({
                  left: rect.left,
                  top: rect.top,
                  height: rect.height,
                });
                setViewMenuOpen((p) => !p);
                setEditingDesc(false);
                setDraftName(activeViewName ?? "");
                setDraftDesc(activeViewDescription ?? "");
              }}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] font-medium text-[#1d1f25] transition-colors hover:bg-[#f2f3f5]"
            >
              <ToolbarAssetIcon
                asset={activeViewMeta.asset}
                tintColor={activeViewMeta.color}
              />
              {activeViewName}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="#aaa"
                strokeWidth="1.5"
              >
                <path d="M2.5 4l2.5 2.5L7.5 4" />
              </svg>
            </button>
          )}
          <div className="mx-1 h-5 w-px bg-[#e8e8e8]" />
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
                    : "text-[#616670] hover:bg-[#f5f5f4] hover:text-[#1d1f25]"
                }`}
                style={
                  btn.active ? { backgroundColor: activeChip.bg } : undefined
                }
              >
                <span className="inline-flex items-center justify-center">
                  <ToolbarAssetIcon
                    asset={btn.iconAsset}
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
                  onChange={(f) =>
                    onConfigChange({ filters: normalizeFilterTree(f) })
                  }
                />
              )}
              {btn.id === "group" && (
                <GroupPanel
                  columns={columns}
                  groups={config.groups}
                  onChange={(g) => onConfigChange({ groups: g })}
                  collapsedGroupKeys={collapsedGroupKeys}
                  availableGroupKeys={availableGroupKeys}
                  onCollapseAll={onCollapseAllGroups}
                  onExpandAll={onExpandAllGroups}
                />
              )}
              {btn.id === "sort" && (
                <SortPanel
                  columns={columns}
                  sorts={config.sorts}
                  onChange={(s) => onConfigChange({ sorts: s })}
                  autoSortRecords={config.autoSortRecords}
                  onToggleAutoSort={() =>
                    onConfigChange({
                      autoSortRecords: !config.autoSortRecords,
                    })
                  }
                />
              )}
              {btn.id === "height" && (
                <RowHeightPanel
                  rowHeight={config.rowHeight}
                  wrapHeaders={config.wrapHeaders}
                  onChange={(h) => onConfigChange({ rowHeight: h })}
                  onToggleWrapHeaders={() =>
                    onConfigChange({ wrapHeaders: !config.wrapHeaders })
                  }
                />
              )}
            </PanelWrapper>
          )}
        </div>
      ))}

      <button className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] text-[#616670] transition-colors hover:bg-[#f5f5f4] hover:text-[#1d1f25]">
        <ToolbarAssetIcon asset={149} tintColor={TOOLBAR_SUBTLE} />
        Color
      </button>
      <div className="relative">
        <button
          onClick={() => toggle("height")}
          className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
            open === "height"
              ? "bg-[#ebf5ff] text-[#0069ff]"
              : "text-[#616670] hover:bg-[#f5f5f4] hover:text-[#1d1f25]"
          }`}
          title="Row height"
        >
          <ToolbarAssetIcon
            asset={rowHeightToolAsset}
            tintColor={open === "height" ? "#0069ff" : TOOLBAR_SUBTLE}
          />
        </button>
        {open === "height" && (
          <PanelWrapper onClose={() => setOpen(null)}>
            <RowHeightPanel
              rowHeight={config.rowHeight}
              wrapHeaders={config.wrapHeaders}
              onChange={(h) => onConfigChange({ rowHeight: h })}
              onToggleWrapHeaders={() =>
                onConfigChange({ wrapHeaders: !config.wrapHeaders })
              }
            />
          </PanelWrapper>
        )}
      </div>
      <button className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] text-[#616670] transition-colors hover:bg-[#f5f5f4] hover:text-[#1d1f25]">
        <ToolbarAssetIcon asset={430} tintColor={TOOLBAR_SUBTLE} />
        Share and sync
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (!enableGridSearch) return;
            setOpen(null);
            setViewMenuOpen(false);
            onOpenGridSearch?.();
          }}
          className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
            gridSearchOpen
              ? "bg-[#eef1f5] text-[#1d1f25]"
              : "text-[#616670] hover:bg-[#f5f5f4] hover:text-[#1d1f25]"
          }`}
          aria-label="Find in view"
          title="Find in view"
        >
          <ToolbarAssetIcon
            asset={175}
            tintColor={gridSearchOpen ? "#1d1f25" : TOOLBAR_SUBTLE}
          />
        </button>

        {enableGridSearch && gridSearchOpen && (
          <div
            className="absolute top-full right-0 z-40 mt-2 w-[366px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[6px] border border-[#d8dbe1] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
            role="presentation"
          >
            <div className="flex h-[38px] items-stretch">
              <input
                ref={searchInputRef}
                type="text"
                value={gridSearchQuery}
                placeholder="Find in view..."
                autoComplete="off"
                onChange={(e) => onGridSearchQueryChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onCloseGridSearch?.();
                    return;
                  }
                  if (e.key === "Enter" && hasGridSearchMatches) {
                    e.preventDefault();
                    navigateGridSearch(e.shiftKey ? -1 : 1);
                  }
                }}
                className="min-w-0 flex-auto border-0 bg-transparent px-2 text-[13px] text-[#1d1f25] placeholder-[#8a8f99] outline-none"
                style={{ border: "2px solid transparent" }}
              />

              {hasGridSearchTerm ? (
                <>
                  <div style={GRID_SEARCH_COUNT_STYLE}>
                    {gridSearchSummaryLabel}
                  </div>

                  {hasGridSearchMatches && (
                    <div className="flex flex-none items-center py-1">
                      <button
                        type="button"
                        onClick={() => navigateGridSearch(-1)}
                        className="flex h-full w-5 items-center justify-center rounded text-[#616670] transition-colors hover:bg-[#f2f3f5] hover:text-[#1d1f25]"
                        aria-label="Previous result"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.75 7.25L6 4l3.25 3.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateGridSearch(1)}
                        className="flex h-full w-5 items-center justify-center rounded text-[#616670] transition-colors hover:bg-[#f2f3f5] hover:text-[#1d1f25]"
                        aria-label="Next result"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.75 4.75L6 8l3.25-3.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-none items-center pr-2" />
              )}

              <button
                type="button"
                className="mx-[2px] my-[7px] inline-flex h-6 flex-none items-center justify-center rounded-[999px] bg-[#1d1f25] px-2 text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.22)] transition-colors hover:bg-[#14161a]"
              >
                Ask Omni
              </button>

              <button
                type="button"
                onClick={() => onCloseGridSearch?.()}
                className="mx-[2px] my-[8px] inline-flex h-5 w-5 flex-none items-center justify-center rounded text-[#616670] transition-colors hover:bg-[#f2f3f5] hover:text-[#1d1f25]"
                aria-label="Close find in view"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      {onBulkAddRows && (
        <button
          onClick={onBulkAddRows}
          disabled={bulkAdding}
          className="inline-flex h-7 items-center justify-center rounded-[8px] border border-[#d8dbe1] px-2.5 text-[13px] font-medium text-[#1d1f25] transition-colors hover:bg-[#f5f5f4] disabled:cursor-not-allowed disabled:opacity-60"
          title="Testing only: add 100,000 filled rows"
        >
          {bulkAdding ? "Adding..." : "+100k rows"}
        </button>
      )}

      {viewMenuOpen && activeViewId && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setViewMenuOpen(false)}
          />
          <div
            className="fixed z-30 w-[260px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white text-[13px] shadow-xl"
            style={{ left: menuLeft, top: menuTop }}
          >
            <div className="border-b border-[#f0f0f0] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#222]">
                  Collaborative view
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="#888"
                  strokeWidth="1.3"
                >
                  <path d="M4 2l4 4-4 4" />
                </svg>
              </div>
              <div className="mt-1 text-[11px] text-[#888]">
                Editors and up can edit the view configuration
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setViewMenuOpen(false);
                  setRenamingView(true);
                  setDraftName(activeViewName ?? "");
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f8f8]"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path
                    d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z"
                    strokeLinejoin="round"
                  />
                </svg>
                Rename view
              </button>
              <button
                onClick={() => {
                  setEditingDesc(true);
                  setRenamingView(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f8f8]"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <circle cx="6" cy="6" r="4.5" />
                  <path d="M6 4v4M4 6h4" />
                </svg>
                Edit view description
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <rect x="2" y="2" width="6" height="6" rx="1" />
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                </svg>
                Duplicate view
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M3 1h6v10H3z" />
                  <path d="M5 4h2M5 6h2M5 8h2" />
                </svg>
                Download CSV
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f8f8]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <rect x="2" y="2" width="8" height="6" rx="1" />
                  <path d="M3 10h6" />
                </svg>
                Print view
              </button>
              <div className="my-1 border-t border-[#f0f0f0]" />
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-[#fef2f2]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path
                    d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M3 3l1 7h4l1-7"
                    strokeLinecap="round"
                  />
                </svg>
                Delete view
              </button>
            </div>

            {editingDesc && (
              <div className="space-y-2 border-t border-[#f0f0f0] px-4 py-3">
                {editingDesc && (
                  <>
                    <label className="text-[11px] text-[#777]">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      className="w-full resize-none rounded border border-[#d9d9d9] px-2 py-1 text-[13px] outline-none focus:border-[#0069ff]"
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
                      if (
                        editingDesc &&
                        onUpdateViewDescription &&
                        activeViewId
                      )
                        onUpdateViewDescription(activeViewId, draftDesc);
                      setEditingDesc(false);
                    }}
                    className="rounded bg-[#0069ff] px-2.5 py-1 text-[13px] text-white hover:bg-[#0055d4]"
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
