import { useMemo, useState, type CSSProperties } from "react";
import type { ColumnType } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FieldTypePicker } from "~/app/_components/gridViewCells";
import { GridViewTableColumnMenu } from "~/app/_components/gridView/GridViewTableColumnMenu";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import type {
  FieldEditorState,
  HeaderPanel,
  VisibleColumn,
} from "~/app/_components/gridView/tableTypes";
import type { FilterTree, GroupRule } from "~/app/_components/tableUtils";
import { FIELD_TYPES } from "~/app/_components/tableUtils";

type GridViewTableHeaderProps = {
  rowH: number;
  wrapHeaders: boolean;
  rowNumberWidth: number;
  visCols: VisibleColumn[];
  freezeCount: number;
  frozenOffsets: number[];
  dragOverColId: string | null;
  setDragColId: (id: string | null) => void;
  setDragOverColId: (id: string | null) => void;
  onDragEnd: () => void;
  headerPanel: HeaderPanel;
  setHeaderPanel: (v: HeaderPanel) => void;
  renamingCol: { id: string; value: string } | null;
  setRenamingCol: (v: { id: string; value: string } | null) => void;
  deleteColumn: { mutate: (v: { columnId: string }) => void };
  renameColumn: { mutate: (v: { columnId: string; name: string }) => void };
  changeType: { mutate: (v: { columnId: string; type: ColumnType }) => void };
  insertColumnLeft: {
    mutate: (v: {
      tableId: string;
      anchorColumnId: string;
      name: string;
      type: ColumnType;
    }) => void;
  };
  insertColumnRight: {
    mutate: (v: {
      tableId: string;
      anchorColumnId: string;
      name: string;
      type: ColumnType;
    }) => void;
  };
  startResize: (e: React.MouseEvent, colId: string, startW: number) => void;
  addingCol: boolean;
  setAddingCol: (v: boolean) => void;
  handleAddColumn: (type: string, suggestedName?: string) => void;
  menuForCol: string | null;
  openColMenu: (colId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  closeColMenu: () => void;
  hoveredInfoCol: string | null;
  setHoveredInfoCol: (
    id: string | null | ((prev: string | null) => string | null),
  ) => void;
  setEditingDescription: (v: { colId: string; value: string } | null) => void;
  setEditingField: (v: FieldEditorState | null) => void;
  setFieldTypeListOpen: (v: boolean) => void;
  setDuplicatingField: (
    v: { colId: string; name: string; duplicateCells: boolean } | null,
  ) => void;
  onRequestChangePrimaryField: () => void;
  tableId: string;
  filters: FilterTree;
  groups: GroupRule[];
  onFiltersChange?: (filters: FilterTree) => void;
  onGroupsChange?: (groups: GroupRule[]) => void;
  onRequestOpenSortPanel?: () => void;
  onRequestOpenFilterPanel?: () => void;
  onRequestOpenGroupPanel?: () => void;
  hasSelectedRows: boolean;
  allInViewSelected: boolean;
  someInViewSelected: boolean;
  toggleAllRowsInView: (checked: boolean) => void;
  highlightedFilterColumnIds: Set<string>;
  highlightedSortColumnIds: Set<string>;
  highlightedGroupColumnIds: Set<string>;
};

export function GridViewTableHeader({
  rowH,
  wrapHeaders,
  rowNumberWidth,
  visCols,
  freezeCount,
  frozenOffsets,
  dragOverColId,
  setDragColId,
  setDragOverColId,
  onDragEnd,
  headerPanel,
  setHeaderPanel,
  renamingCol,
  setRenamingCol,
  deleteColumn,
  renameColumn,
  changeType,
  insertColumnLeft,
  insertColumnRight,
  startResize,
  addingCol,
  setAddingCol,
  handleAddColumn,
  menuForCol,
  openColMenu,
  closeColMenu,
  hoveredInfoCol,
  setHoveredInfoCol,
  setEditingDescription,
  setEditingField,
  setFieldTypeListOpen,
  setDuplicatingField,
  onRequestChangePrimaryField,
  tableId,
  filters,
  groups,
  onFiltersChange,
  onGroupsChange,
  onRequestOpenSortPanel,
  onRequestOpenFilterPanel,
  onRequestOpenGroupPanel,
  hasSelectedRows: _hasSelectedRows,
  allInViewSelected,
  someInViewSelected,
  toggleAllRowsInView,
  highlightedFilterColumnIds,
  highlightedSortColumnIds,
  highlightedGroupColumnIds,
}: GridViewTableHeaderProps) {
  const [fieldTypeQuery, setFieldTypeQuery] = useState("");
  const [hoveredFieldAgent, setHoveredFieldAgent] = useState<string | null>(
    null,
  );
  const normalizedFieldTypeQuery = fieldTypeQuery.trim().toLowerCase();
  const dropdownFontFamily =
    '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
  const dropdownTextStyle: CSSProperties = {
    fontFamily: dropdownFontFamily,
    fontSize: "13px",
    lineHeight: "18px",
    fontWeight: 400,
    color: "rgb(29, 31, 37)",
  };
  const dropdownLabelStyle: CSSProperties = {
    ...dropdownTextStyle,
    boxSizing: "border-box",
    display: "block",
    height: "18px",
    maxWidth: "100%",
    margin: 0,
    overflow: "hidden",
    padding: 0,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const fieldAgentItems = useMemo(
    () =>
      [
        {
          label: "Analyze attachment",
          asset: 279,
          tintColor: "rgb(4, 138, 14)",
          hoverBg: "rgb(230, 252, 232)",
        },
        {
          label: "Research companies",
          asset: 381,
          tintColor: "rgb(22, 110, 225)",
          hoverBg: "rgb(241, 245, 255)",
        },
        {
          label: "Find image from web",
          asset: null,
          tintColor: "rgb(124, 55, 239)",
          hoverBg: "rgb(252, 243, 255)",
        },
        {
          label: "Generate image",
          asset: 220,
          tintColor: "rgb(213, 68, 1)",
          hoverBg: "rgb(255, 236, 227)",
        },
        {
          label: "Deep match",
          asset: 433,
          tintColor: "rgb(1, 221, 213)",
          hoverBg: "rgb(228, 251, 251)",
        },
        {
          label: "Build prototype",
          asset: 308,
          tintColor: "rgb(124, 55, 239)",
          hoverBg: "rgb(252, 243, 255)",
        },
        {
          label: "Create custom agent",
          asset: null,
          tintColor: "rgb(220, 4, 59)",
          hoverBg: "rgb(255, 242, 250)",
        },
        {
          label: "Browse catalog",
          asset: 71,
          tintColor: "rgb(97, 102, 112)",
          hoverBg: "rgb(246, 248, 252)",
        },
      ].filter((item) =>
        normalizedFieldTypeQuery
          ? item.label.toLowerCase().includes(normalizedFieldTypeQuery)
          : true,
      ),
    [normalizedFieldTypeQuery],
  );
  const standardFieldItems = useMemo(
    () =>
      [
        { label: "Link to another record" },
        { label: "Single line text", type: "TEXT" },
        { label: "Long text", type: "LONG_TEXT" },
        { label: "Attachment", type: "ATTACHMENT" },
        { label: "Checkbox", type: "CHECKBOX" },
        { label: "Multiple select", type: "MULTI_SELECT" },
        { label: "Single select", type: "SINGLE_SELECT" },
        { label: "User", type: "USER" },
        { label: "Date", type: "DATE" },
        { label: "Phone number", type: "PHONE" },
        { label: "Email", type: "EMAIL" },
        { label: "URL", type: "URL" },
        { label: "Number", type: "NUMBER" },
        { label: "Currency", type: "CURRENCY" },
        { label: "Percent", type: "PERCENT" },
        { label: "Duration", type: "DURATION" },
        { label: "Rating", type: "RATING" },
        { label: "Formula" },
        { label: "Rollup" },
        { label: "Count" },
        { label: "Lookup" },
        { label: "Created time" },
        { label: "Last modified time" },
        { label: "Created by" },
        { label: "Last modified by" },
        { label: "Autonumber" },
        { label: "Barcode" },
        { label: "Button" },
      ].filter((item) =>
        normalizedFieldTypeQuery
          ? item.label.toLowerCase().includes(normalizedFieldTypeQuery)
          : true,
      ),
    [normalizedFieldTypeQuery],
  );

  return (
    <thead className="sticky top-0 z-20" style={{ boxShadow: "0 1px 0 #e2e5e9" }}>
      <tr className="headerRow bg-white">
        <th
          className="sticky left-0 z-[14] box-border bg-white px-0 py-0 text-left"
          style={{
            width: rowNumberWidth,
            minWidth: rowNumberWidth,
            maxWidth: rowNumberWidth,
          }}
        >
          <div
            className={`flex items-center ${wrapHeaders ? "py-[6px]" : ""}`}
            style={wrapHeaders ? { minHeight: rowH } : { height: rowH }}
          >
            <div className="h-full w-[20px]" aria-hidden="true" />
            <div className="relative h-full w-[44px]">
              <button
                type="button"
                role="checkbox"
                aria-label="Select all rows"
                aria-checked={
                  allInViewSelected
                    ? true
                    : someInViewSelected
                      ? "mixed"
                      : false
                }
                onClick={() => toggleAllRowsInView(!allInViewSelected)}
                className={`absolute top-1/2 left-0 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-[3px] border transition-colors ${
                  allInViewSelected
                    ? "border-transparent bg-[#1c76d2] text-white shadow-[0_1px_2px_rgba(15,23,42,0.24)]"
                    : "border-[#d6d8dd] bg-white text-transparent shadow-[0_1px_2px_rgba(15,23,42,0.16)] hover:border-[#c7ccd5]"
                }`}
              >
                {allInViewSelected ? (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 8.2l2.7 2.8L12.5 4.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>
            </div>
          </div>
        </th>

        {visCols.map((col, colIndex) => {
          const ft = FIELD_TYPES[col.type] ?? FIELD_TYPES.TEXT!;
          const isCurrentPanel = headerPanel?.colId === col.id;
          const isPrimaryField = colIndex === 0;
          const isFrozen = colIndex < freezeCount;
          const frozenLeft = frozenOffsets[colIndex] ?? rowNumberWidth;
          const isLastFrozen = isFrozen && colIndex === freezeCount - 1;
          const isFilterHighlighted = highlightedFilterColumnIds.has(col.id);
          const isSortHighlighted = highlightedSortColumnIds.has(col.id);
          const isGroupHighlighted = highlightedGroupColumnIds.has(col.id);
          const trailingActionInset = col.description ? 42 : 22;
          const headerCellBackground =
            dragOverColId === col.id
              ? "#e8f5f1"
              : isFilterHighlighted
                ? "#ebfbec4D"
                : isSortHighlighted
                  ? "#fffbf9"
                : isGroupHighlighted
                  ? "#fbfaff"
                  : undefined;

          return (
            <th
              key={col.id}
              data-columnid={col.id}
              style={{
                width: col.width,
                minWidth: 60,
                maxWidth: col.width,
                ...(isFrozen ? { left: frozenLeft, zIndex: 12 } : {}),
                ...(isLastFrozen ? { boxShadow: "1px 0 0 #afb5bf" } : {}),
                ...(headerCellBackground
                  ? { backgroundColor: headerCellBackground }
                  : {}),
              }}
              className={`cell header group/col relative box-border border-r border-[#e2e5e9] bg-white px-0 py-0 text-left ${isFrozen ? "sticky" : ""}`}
              draggable={!isPrimaryField}
              onDragStart={() => {
                if (isPrimaryField) return;
                setDragColId(col.id);
              }}
              onDragOver={(e) => {
                if (isPrimaryField) return;
                e.preventDefault();
                setDragOverColId(col.id);
              }}
              onDragEnd={onDragEnd}
            >
              <div
                className={`relative box-border flex h-full w-full min-w-0 gap-1.5 px-2 ${
                  wrapHeaders ? "items-start py-[6px]" : "items-center"
                }`}
                style={wrapHeaders ? { minHeight: rowH } : { height: rowH }}
              >
                <span
                  className={`flex-shrink-0 text-[16px] leading-none text-[#111827] ${
                    wrapHeaders ? "mt-[1px]" : ""
                  }`}
                  title={ft.label}
                >
                  <FieldTypeIcon type={col.type} />
                </span>

                {renamingCol?.id === col.id ? (
                  <input
                    autoFocus
                    className="min-w-0 flex-1 border-b-2 border-[#166254] bg-transparent px-1 text-[13px] text-[#1f2937] outline-none"
                    style={
                      !wrapHeaders
                        ? { paddingRight: trailingActionInset }
                        : undefined
                    }
                    value={renamingCol.value}
                    onChange={(e) =>
                      setRenamingCol({ ...renamingCol, value: e.target.value })
                    }
                    onBlur={() => {
                      renameColumn.mutate({
                        columnId: col.id,
                        name: renamingCol.value.trim() || col.name,
                      });
                      setRenamingCol(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameColumn.mutate({
                          columnId: col.id,
                          name: renamingCol.value.trim() || col.name,
                        });
                        setRenamingCol(null);
                      }
                      if (e.key === "Escape") setRenamingCol(null);
                    }}
                  />
                ) : (
                  <button
                    onDoubleClick={() =>
                      setRenamingCol({ id: col.id, value: col.name })
                    }
                    className={`min-w-0 flex-1 overflow-hidden text-left text-[13px] font-medium text-[#111827] hover:text-[#1f2937] ${
                      wrapHeaders
                        ? "leading-[16px] break-words whitespace-normal"
                        : "truncate"
                    }`}
                    style={
                      !wrapHeaders
                        ? { paddingRight: trailingActionInset }
                        : undefined
                    }
                    title="Double-click to rename"
                  >
                    {col.name}
                  </button>
                )}

                <div
                  className={`${
                    wrapHeaders
                      ? "mt-[1px] flex flex-shrink-0 items-start gap-1"
                      : "absolute top-1/2 right-2 z-[1] flex -translate-y-1/2 items-center gap-1"
                  }`}
                >
                  {!!col.description && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDescription({
                            colId: col.id,
                            value: col.description ?? "",
                          });
                        }}
                        onMouseEnter={() => setHoveredInfoCol(col.id)}
                        onMouseLeave={() =>
                          setHoveredInfoCol((prev) =>
                            prev === col.id ? null : prev,
                          )
                        }
                        className="text-[#9ca3af] hover:text-[#6b7280]"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        >
                          <circle cx="7" cy="7" r="5.5" />
                          <path d="M7 6v3M7 4.2h.01" strokeLinecap="round" />
                        </svg>
                      </button>
                      {hoveredInfoCol === col.id && (
                        <div className="absolute top-full right-0 z-50 mt-1 rounded-[4px] bg-[#2f3542] px-2 py-1 text-[13px] whitespace-nowrap text-white">
                          {col.description}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openColMenu(col.id, e);
                    }}
                    className="rounded p-0.5 text-[13px] text-[#9ca3af] opacity-0 transition-all group-hover/col:opacity-100 hover:bg-[#eef0f3] hover:text-[#6b7280]"
                    title="Field actions"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M2.5 4.5L6 8l3.5-3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {isCurrentPanel && headerPanel?.panel === "type" && (
                <FieldTypePicker
                  current={col.type}
                  onSelect={(t) => {
                    changeType.mutate({
                      columnId: col.id,
                      type: t as ColumnType,
                    });
                    setHeaderPanel(null);
                  }}
                />
              )}

              <GridViewTableColumnMenu
                col={col}
                tableId={tableId}
                visible={menuForCol === col.id}
                filters={filters}
                groups={groups}
                onFiltersChange={onFiltersChange}
                onGroupsChange={onGroupsChange}
                onRequestOpenSortPanel={onRequestOpenSortPanel}
                onRequestOpenFilterPanel={onRequestOpenFilterPanel}
                onRequestOpenGroupPanel={onRequestOpenGroupPanel}
                closeColMenu={closeColMenu}
                deleteColumn={deleteColumn}
                insertColumnLeft={insertColumnLeft}
                insertColumnRight={insertColumnRight}
                setEditingDescription={setEditingDescription}
                setEditingField={setEditingField}
                setFieldTypeListOpen={setFieldTypeListOpen}
                setDuplicatingField={setDuplicatingField}
                isPrimaryField={isPrimaryField}
                onRequestChangePrimaryField={onRequestChangePrimaryField}
              />

              <div
                className="absolute top-0 right-0 z-10 h-full w-px cursor-col-resize"
                onMouseDown={(e) => startResize(e, col.id, col.width)}
              />
            </th>
          );
        })}

        <th className="relative box-border bg-white px-2 py-0 text-left" style={{ width: 94, minWidth: 94 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddingCol(!addingCol);
              setFieldTypeQuery("");
            }}
            className="flex w-full items-center justify-center rounded-[4px] text-[#7d8592] transition-colors hover:bg-[#f0f1f3] hover:text-[#1f2937]"
            style={wrapHeaders ? { minHeight: rowH } : { height: rowH }}
            title="Add field"
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              className="h-3 w-3"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
          </button>
          {addingCol && (
            <div
              className="absolute top-full left-0 z-[60] mt-1 max-h-[min(72vh,900px)] w-[400px] overflow-y-auto rounded-[12px] border border-[#d9dde3] bg-white shadow-[0_12px_32px_rgba(25,30,40,0.22)]"
              role="dialog"
              aria-label="Create field"
              style={dropdownTextStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-[6px]">
                <div className="sticky top-0 z-10 bg-white pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 flex-1 items-center rounded-[10px] border border-[#dfe3e9] bg-[#f6f8fb] px-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        className="text-[#7f8794]"
                      >
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
                      </svg>
                      <input
                        autoFocus
                        type="text"
                        className="ml-2 h-full w-full bg-transparent text-[#1f2937] outline-none placeholder:text-[#8a94a6]"
                        style={dropdownTextStyle}
                        placeholder="Find a field type"
                        value={fieldTypeQuery}
                        onChange={(e) => setFieldTypeQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setAddingCol(false);
                            setFieldTypeQuery("");
                          }
                        }}
                      />
                    </div>
                    <a
                      href="https://support.airtable.com/docs/supported-field-types-in-airtable-overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#6f7683] hover:bg-[#f5f7fa]"
                      title="Learn about field types"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path
                          d="M8 10.8v.01M8 8.6c0-1.6 1.7-1.7 1.7-3.3A1.7 1.7 0 006.3 5.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </a>
                  </div>
                  <hr className="mt-2 border-0 border-t border-[#eceff3]" />
                </div>

                <p
                  className="mx-[10px] my-3 text-[13px] font-normal text-[#616670]"
                  style={{ fontFamily: dropdownFontFamily, lineHeight: "18px" }}
                >
                  Field agents
                </p>
                <div className="flex flex-wrap">
                  {fieldAgentItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="flex h-[34px] w-1/2 items-center gap-2 rounded-[6px] px-[10px] py-[8px] text-left text-[#1d1f25] transition-colors"
                      style={{
                        ...dropdownTextStyle,
                        boxSizing: "border-box",
                        backgroundColor:
                          hoveredFieldAgent === item.label
                            ? item.hoverBg
                            : "transparent",
                      }}
                      onMouseEnter={() => setHoveredFieldAgent(item.label)}
                      onMouseLeave={() =>
                        setHoveredFieldAgent((prev) =>
                          prev === item.label ? null : prev,
                        )
                      }
                    >
                      {item.asset ? (
                        <AirtableAssetIcon
                          asset={item.asset}
                          size={16}
                          tintColor={item.tintColor}
                        />
                      ) : item.label === "Find image from web" ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke={item.tintColor}
                          strokeWidth="1.3"
                        >
                          <path d="M2.5 8h11M8 2.5a7 7 0 010 11M8 2.5a7 7 0 000 11" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <circle cx="8" cy="8" r="6" fill={item.tintColor} />
                          <circle cx="8" cy="8" r="1.7" fill="white" />
                        </svg>
                      )}
                      <span className="truncate" style={dropdownLabelStyle}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
                <hr className="my-2 border-0 border-t border-[#eceff3]" />

                <p
                  className="mx-[10px] my-3 text-[13px] font-normal text-[#616670]"
                  style={{ fontFamily: dropdownFontFamily, lineHeight: "18px" }}
                >
                  Standard fields
                </p>
                <div className="px-1 pb-1">
                  {standardFieldItems.length === 0 && (
                    <div
                      className="px-[10px] py-2 text-[13px] font-normal text-[#8a94a6]"
                      style={{
                        fontFamily: dropdownFontFamily,
                        lineHeight: "18px",
                      }}
                    >
                      No field types found.
                    </div>
                  )}
                  {standardFieldItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={!item.type}
                      onClick={() => {
                        if (!item.type) return;
                        handleAddColumn(item.type, item.label);
                        setFieldTypeQuery("");
                      }}
                      className={`flex h-[34px] w-full items-center rounded-[6px] px-[10px] py-[8px] text-left ${
                        item.type
                          ? "text-[#1d1f25] hover:bg-[#f4f6f9] active:bg-[#eef1f5]"
                          : "cursor-default text-[#5f6672]"
                      }`}
                      style={dropdownTextStyle}
                    >
                      <span className="inline-flex w-5 flex-none items-center justify-center">
                        {item.type ? (
                          <FieldTypeIcon type={item.type} />
                        ) : item.label === "Link to another record" ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          >
                            <path
                              d="M2.2 4.2h9.6M2.2 7h7.2M2.2 9.8h9.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          >
                            <circle cx="7" cy="7" r="5.2" />
                          </svg>
                        )}
                      </span>
                      <span
                        className="ml-2 truncate"
                        style={dropdownLabelStyle}
                      >
                        {item.label}
                      </span>
                      {item.label === "Link to another record" && (
                        <span className="ml-auto text-[#9ca3af]">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          >
                            <path
                              d="M5.2 3.2l3.6 3.8-3.6 3.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </th>
      </tr>
    </thead>
  );
}
