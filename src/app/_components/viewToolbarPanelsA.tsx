import { useEffect, useMemo, useRef, useState } from "react";
import type { Column } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";
import {
  FIELD_TYPES,
  FILTER_OPS,
  MAX_FILTER_CONDITIONS,
  MAX_FILTER_DEPTH,
  countFilterConditions,
  createFilterCondition,
  createFilterTree,
  hasActiveFilters,
  normalizeFilterTree,
  operatorsForFieldType,
  type FilterCondition,
  type FilterGroup,
  type FilterNode,
  type FilterTree,
} from "~/app/_components/tableUtils";

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
        className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-[4px] border border-[#d2d6dc] bg-white shadow-[0px_0px_1px_rgba(0,0,0,0.24),0px_0px_2px_rgba(0,0,0,0.16),0px_3px_4px_rgba(0,0,0,0.06),0px_6px_8px_rgba(0,0,0,0.06),0px_12px_16px_rgba(0,0,0,0.08),0px_18px_32px_rgba(0,0,0,0.06)]"
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
  nonHideableColumnIds = [],
  onChange,
}: {
  columns: Column[];
  hiddenFields: Record<string, boolean>;
  nonHideableColumnIds?: string[];
  onChange: (hf: Record<string, boolean>) => void;
}) {
  const [search, setSearch] = useState("");
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
  const lockedColumnIds = new Set(nonHideableColumnIds);
  const hideableColumns = sortedColumns.filter((column) => !lockedColumnIds.has(column.id));
  const filtered = hideableColumns.filter(
    (c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-64 p-3">
      <input
        autoFocus
        className="mb-3 w-full rounded-md border border-[#e0e0e0] px-2.5 py-1.5 text-xs outline-none placeholder-[#aaa] focus:border-[#0069ff]"
        placeholder="Find a field"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-3 max-h-64 space-y-0.5 overflow-y-auto">
        {filtered.map((col) => {
          const ft = FIELD_TYPES[col.type];
          const visible = !hiddenFields[col.id];
          return (
            <div
              key={col.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[#f5f5f4]"
              onClick={() => onChange({ ...hiddenFields, [col.id]: !hiddenFields[col.id] })}
            >
              <div
                className={`relative h-4 w-8 flex-shrink-0 rounded-full transition-colors ${
                  visible ? "bg-[#22c55e]" : "bg-[#d1d5db]"
                }`}
              >
                <div
                  className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all"
                  style={{ left: visible ? "18px" : "2px" }}
                />
              </div>
              <span className="w-3.5 flex-shrink-0 text-center text-xs text-[#888]">{ft?.icon}</span>
              <span className="flex-1 truncate text-xs text-[#1f2937]">{col.name}</span>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" className="flex-shrink-0 text-[#ccc]">
                <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                <circle cx="7" cy="3" r="1.2" fill="currentColor" />
                <circle cx="3" cy="9" r="1.2" fill="currentColor" />
                <circle cx="7" cy="9" r="1.2" fill="currentColor" />
              </svg>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-3 text-center text-xs text-[#aaa]">No fields found</p>}
      </div>

      <div className="flex gap-2 border-t border-[#f0f0f0] pt-2.5">
        <button
          onClick={() =>
            onChange(Object.fromEntries(hideableColumns.map((column) => [column.id, true])))
          }
          className="flex-1 rounded-md border border-[#e0e0e0] py-1 text-xs text-[#555] transition-colors hover:bg-[#f5f5f4]"
        >
          Hide all
        </button>
        <button
          onClick={() => onChange({})}
          className="flex-1 rounded-md border border-[#e0e0e0] py-1 text-xs text-[#555] transition-colors hover:bg-[#f5f5f4]"
        >
          Show all
        </button>
      </div>
    </div>
  );
}
type FloatingMenu =
  | {
      kind: "field";
      conditionId: string;
      left: number;
      top: number;
      width: number;
    }
  | {
      kind: "operator";
      conditionId: string;
      left: number;
      top: number;
      width: number;
    }
  | {
      kind: "conjunction";
      groupId: string;
      left: number;
      top: number;
      width: number;
    }
  | {
      kind: "groupAdd";
      groupId: string;
      left: number;
      top: number;
      width: number;
    };

type DragState = {
  nodeId: string;
  nodeType: "condition" | "group";
  parentGroupId: string;
};

function withDepths(group: FilterGroup, depth = 1): FilterGroup {
  return {
    ...group,
    depth,
    children: group.children.map((child) =>
      child.type === "group" ? withDepths(child, depth + 1) : child,
    ),
  };
}

function updateGroupById(
  root: FilterGroup,
  groupId: string,
  updater: (group: FilterGroup) => FilterGroup,
): FilterGroup {
  if (root.id === groupId) return updater(root);
  let changed = false;
  const children = root.children.map((child) => {
    if (child.type !== "group") return child;
    const next = updateGroupById(child, groupId, updater);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

function updateConditionById(
  root: FilterGroup,
  conditionId: string,
  updater: (condition: FilterCondition) => FilterCondition,
): FilterGroup {
  let changed = false;
  const children = root.children.map((child) => {
    if (child.type === "condition") {
      if (child.id !== conditionId) return child;
      changed = true;
      return updater(child);
    }
    const next = updateConditionById(child, conditionId, updater);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

function removeNodeById(root: FilterGroup, nodeId: string): FilterGroup {
  let changed = false;
  const children: FilterNode[] = [];
  for (const child of root.children) {
    if (child.id === nodeId) {
      changed = true;
      continue;
    }
    if (child.type === "group") {
      const next = removeNodeById(child, nodeId);
      if (next !== child) changed = true;
      children.push(next);
      continue;
    }
    children.push(child);
  }
  return changed ? { ...root, children } : root;
}

function reorderWithinGroup(
  root: FilterGroup,
  groupId: string,
  nodeId: string,
  targetNodeId: string,
): FilterGroup {
  return updateGroupById(root, groupId, (group) => {
    const from = group.children.findIndex((child) => child.id === nodeId);
    const to = group.children.findIndex((child) => child.id === targetNodeId);
    if (from < 0 || to < 0 || from === to) return group;
    const children = [...group.children];
    const [moved] = children.splice(from, 1);
    if (!moved) return group;
    children.splice(to, 0, moved);
    return { ...group, children };
  });
}

function moveNodeToGroup(
  root: FilterGroup,
  sourceGroupId: string,
  nodeId: string,
  targetGroupId: string,
  beforeNodeId: string | null,
): FilterGroup {
  let movedNode: FilterNode | null = null;

  const withoutSource = updateGroupById(root, sourceGroupId, (group) => {
    const fromIndex = group.children.findIndex((child) => child.id === nodeId);
    if (fromIndex < 0) return group;
    movedNode = group.children[fromIndex] ?? null;
    if (!movedNode) return group;
    const children = [...group.children];
    children.splice(fromIndex, 1);
    return { ...group, children };
  });

  if (!movedNode) return root;
  const nodeToInsert = movedNode;

  return updateGroupById(withoutSource, targetGroupId, (group) => {
    const children = [...group.children];
    const insertIndex =
      beforeNodeId == null
        ? children.length
        : children.findIndex((child) => child.id === beforeNodeId);
    if (insertIndex < 0) {
      children.push(nodeToInsert);
      return { ...group, children };
    }
    children.splice(insertIndex, 0, nodeToInsert);
    return { ...group, children };
  });
}

function findGroup(root: FilterGroup, groupId: string): FilterGroup | null {
  if (root.id === groupId) return root;
  for (const child of root.children) {
    if (child.type !== "group") continue;
    const found = findGroup(child, groupId);
    if (found) return found;
  }
  return null;
}

function findCondition(root: FilterGroup, conditionId: string): FilterCondition | null {
  for (const child of root.children) {
    if (child.type === "condition") {
      if (child.id === conditionId) return child;
      continue;
    }
    const found = findCondition(child, conditionId);
    if (found) return found;
  }
  return null;
}

function groupSummary(group: FilterGroup): string {
  return group.conjunction === "and"
    ? "All of the following are true..."
    : "Any of the following are true...";
}

function countGroups(group: FilterGroup): number {
  let total = 1;
  for (const child of group.children) {
    if (child.type === "group") {
      total += countGroups(child);
    }
  }
  return total;
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
      <path
        d="M4.5 6.5L8 10l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TinyQuestion() {
  return <AirtableAssetIcon asset={118} alt="" size={13} tintColor="rgb(97, 102, 112)" />;
}
export function FilterPanel({
  columns,
  filters,
  onChange,
}: {
  columns: Column[];
  filters: FilterTree;
  onChange: (f: FilterTree) => void;
}) {
  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);
  const filterTree = useMemo(() => withDepths(normalizeFilterTree(filters)), [filters]);
  const columnById = useMemo(
    () => new Map(sortedColumns.map((column) => [column.id, column])),
    [sortedColumns],
  );

  const [menu, setMenu] = useState<FloatingMenu | null>(null);
  const [fieldSearch, setFieldSearch] = useState("");
  const [footerNotice, setFooterNotice] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [dragOverContainerGroupId, setDragOverContainerGroupId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const totalConditions = countFilterConditions(filterTree);
  const maxConditionsReached = totalConditions >= MAX_FILTER_CONDITIONS;

  function commit(nextTree: FilterTree) {
    onChange(withDepths(normalizeFilterTree(nextTree)));
  }

  function openFieldMenu(conditionId: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setFieldSearch("");
    setMenu({
      kind: "field",
      conditionId,
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(200, rect.width),
    });
  }

  function openOperatorMenu(conditionId: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setMenu({
      kind: "operator",
      conditionId,
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(188, rect.width),
    });
  }

  function openConjunctionMenu(groupId: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setMenu({
      kind: "conjunction",
      groupId,
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(70, rect.width),
    });
  }

  function openGroupAddMenu(groupId: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setMenu({
      kind: "groupAdd",
      groupId,
      left: rect.left - 144,
      top: rect.bottom + 4,
      width: 180,
    });
  }

  useEffect(() => {
    if (!menu) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setMenu(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menu]);

  function addConditionToGroup(groupId: string) {
    if (maxConditionsReached) {
      setFooterNotice("Maximum of 49 filter conditions reached");
      return;
    }
    setFooterNotice(null);
    const nextTree = updateGroupById(filterTree, groupId, (group) => ({
      ...group,
      children: [...group.children, createFilterCondition()],
    }));
    commit(nextTree);
  }

  function addConditionGroupToGroup(groupId: string) {
    const group = findGroup(filterTree, groupId);
    if (!group) return;
    if (group.depth >= MAX_FILTER_DEPTH) {
      setFooterNotice("Maximum nesting depth reached");
      return;
    }
    if (maxConditionsReached) {
      setFooterNotice("Maximum of 49 filter conditions reached");
      return;
    }

    setFooterNotice(null);
    const seed = createFilterTree();
    const nestedGroup: FilterGroup = {
      ...seed,
      conjunction: "and",
      depth: group.depth + 1,
      children: [createFilterCondition()],
    };
    const nextTree = updateGroupById(filterTree, groupId, (current) => ({
      ...current,
      children: [...current.children, nestedGroup],
    }));
    commit(nextTree);
  }

  function deleteNode(nodeId: string) {
    if (nodeId === filterTree.id) return;
    const nextTree = removeNodeById(filterTree, nodeId);
    commit(nextTree);
  }

  function patchCondition(conditionId: string, patch: Partial<FilterCondition>) {
    const nextTree = updateConditionById(filterTree, conditionId, (condition) => ({
      ...condition,
      ...patch,
    }));
    commit(nextTree);
  }

  function patchConjunction(groupId: string, conjunction: "and" | "or") {
    const nextTree = updateGroupById(filterTree, groupId, (group) => ({
      ...group,
      conjunction,
    }));
    commit(nextTree);
  }

  function clearDragState() {
    setDragState(null);
    setDragTargetId(null);
    setDragOverContainerGroupId(null);
  }

  function handleDrop(parentGroupId: string, targetNodeId: string) {
    if (!dragState) return;
    if (dragState.nodeId === targetNodeId) {
      clearDragState();
      return;
    }

    if (dragState.parentGroupId === parentGroupId) {
      const nextTree = reorderWithinGroup(filterTree, parentGroupId, dragState.nodeId, targetNodeId);
      clearDragState();
      commit(nextTree);
      return;
    }

    if (dragState.nodeType !== "condition") {
      clearDragState();
      return;
    }

    const nextTree = moveNodeToGroup(
      filterTree,
      dragState.parentGroupId,
      dragState.nodeId,
      parentGroupId,
      targetNodeId,
    );
    clearDragState();
    commit(nextTree);
  }

  function handleDropIntoGroup(targetGroupId: string) {
    if (!dragState) return;
    if (dragState.nodeId === targetGroupId) {
      clearDragState();
      return;
    }

    if (dragState.parentGroupId === targetGroupId) {
      const targetGroup = findGroup(filterTree, targetGroupId);
      const lastNodeId = targetGroup?.children[targetGroup.children.length - 1]?.id ?? null;
      if (!lastNodeId || lastNodeId === dragState.nodeId) {
        clearDragState();
        return;
      }
      const nextTree = moveNodeToGroup(
        filterTree,
        dragState.parentGroupId,
        dragState.nodeId,
        targetGroupId,
        null,
      );
      clearDragState();
      commit(nextTree);
      return;
    }

    if (dragState.nodeType !== "condition") {
      clearDragState();
      return;
    }

    const nextTree = moveNodeToGroup(
      filterTree,
      dragState.parentGroupId,
      dragState.nodeId,
      targetGroupId,
      null,
    );
    clearDragState();
    commit(nextTree);
  }
  function renderPrefix(parentGroup: FilterGroup, index: number) {
    if (index === 0) {
      return (
        <div className="flex h-full w-full items-center px-1" data-testid="filter-prefix-label">
          Where
        </div>
      );
    }

    return (
      <button
        type="button"
        className="focus-container pointer flex h-8 items-center rounded border border-[#ced3db] bg-white px-2 text-[13px] hover:bg-[#eef4ff]"
        style={{ width: 56 }}
        onClick={(event) => openConjunctionMenu(parentGroup.id, event.currentTarget)}
      >
        <div className="link-quiet pointer flex w-full items-center justify-between text-left text-[#1d1f25]">
          <div>{parentGroup.conjunction}</div>
          <ChevronDown />
        </div>
      </button>
    );
  }

  function renderCondition(condition: FilterCondition, parentGroup: FilterGroup, index: number) {
    const field = condition.fieldId ? columnById.get(condition.fieldId) : undefined;
    const operator = condition.operator ? FILTER_OPS[condition.operator] : null;
    const needsValue = operator?.needsValue ?? true;

    return (
      <div
        key={condition.id}
        className={`mb-2 transition-[opacity,transform] duration-150 ease-out ${
          dragState?.nodeId === condition.id ? "scale-[0.995] opacity-65" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragTargetId(condition.id);
          setDragOverContainerGroupId(null);
        }}
        onDragLeave={() => {
          setDragTargetId((prev) => (prev === condition.id ? null : prev));
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleDrop(parentGroup.id, condition.id);
        }}
      >
        <div className="flex min-w-0">
          <div className="flex items-center px-1" style={{ width: "4.5rem", paddingBottom: "0.5rem" }}>
            {renderPrefix(parentGroup, index)}
          </div>
          <div
            className="flex min-w-0 flex-auto items-center"
            style={{ paddingRight: "0.5rem", height: "2rem" }}
          >
            <div
              className={`flex min-w-0 flex-1 items-stretch rounded border border-[#ccd2da] bg-white transition-[background-color,box-shadow,transform] duration-150 ease-out ${
                dragTargetId === condition.id ? "bg-[#ebf3ff] shadow-[inset_0_0_0_1px_#9cc2ff]" : ""
              }`}
            >
              <button
                type="button"
                className="flex h-[30px] min-w-0 flex-[0_0_126px] items-center border-r border-[#d2d6dc] px-2 text-left text-[13px] hover:bg-[#eef4ff]"
                onClick={(event) => openFieldMenu(condition.id, event.currentTarget)}
              >
                <div className={`truncate ${field ? "text-[#166ee1]" : "text-[#9ba1ad]"}`}>
                  {field?.name ?? "Select field"}
                </div>
                <div className="ml-auto flex items-center text-[#6d7380]">
                  <ChevronDown />
                </div>
              </button>

              <button
                type="button"
                disabled={!field}
                className={`flex h-[30px] min-w-0 flex-[0_0_126px] items-center border-r border-[#d2d6dc] px-2 text-left text-[13px] ${
                  field ? "text-[#166ee1] hover:bg-[#eef4ff]" : "cursor-not-allowed text-[#b8bec8]"
                }`}
                onClick={(event) => {
                  if (!field) return;
                  openOperatorMenu(condition.id, event.currentTarget);
                }}
              >
                <div className="truncate">
                  {condition.operator ? FILTER_OPS[condition.operator].label : "Select operator"}
                </div>
                <div className="ml-auto flex items-center text-[#6d7380]">
                  <ChevronDown />
                </div>
              </button>

              {needsValue ? (
                <input
                  type="text"
                  className="h-[30px] min-w-0 flex-1 border-r border-[#d2d6dc] bg-transparent px-2 text-[13px] text-[#1d1f25] outline-none placeholder:text-[#8f96a3]"
                  placeholder="Enter a value"
                  value={condition.value ?? ""}
                  disabled={!condition.operator || !field}
                  onChange={(event) => patchCondition(condition.id, { value: event.target.value })}
                />
              ) : (
                <div className="h-[30px] min-w-0 flex-1 border-r border-[#d2d6dc] bg-[#fbfcfd]" />
              )}

              <button
                type="button"
                onClick={() => deleteNode(condition.id)}
                className="flex h-[30px] w-8 self-stretch items-center justify-center border-l border-[#d2d6dc] p-0 text-[#6d7380] hover:bg-[#eef1f5]"
                aria-label="Delete condition"
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
                className="flex h-[30px] w-8 self-stretch items-center justify-center border-l border-[#d2d6dc] p-0 text-[#6d7380] hover:bg-[#eef1f5]"
                aria-label="Reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", condition.id);
                  setDragState({
                    nodeId: condition.id,
                    nodeType: "condition",
                    parentGroupId: parentGroup.id,
                  });
                }}
                onDragEnd={() => clearDragState()}
              >
                <AirtableAssetIcon
                  asset={298}
                  alt=""
                  tintColor="rgb(97, 102, 112)"
                  style={{ width: 16, height: 16, display: "block" }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderGroup(group: FilterGroup, parentGroup: FilterGroup, index: number) {
    return (
      <div
        key={group.id}
        className={`mb-2 transition-[opacity,transform] duration-150 ease-out ${
          dragState?.nodeId === group.id ? "scale-[0.995] opacity-65" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragTargetId(group.id);
        }}
        onDragLeave={() => {
          setDragTargetId((prev) => (prev === group.id ? null : prev));
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(parentGroup.id, group.id);
        }}
      >
        <div className="flex min-w-0">
          <div className="flex items-center px-1" style={{ width: "4.5rem", paddingBottom: "0.5rem" }}>
            {renderPrefix(parentGroup, index)}
          </div>
          <div className="flex min-w-0 flex-auto" style={{ paddingRight: "0.5rem" }}>
            <div
              className={`w-full rounded-[3px] border border-[#cfd4dc] bg-[#f2f4f8] px-3 py-2 transition-[background-color,box-shadow] duration-150 ease-out ${
                dragOverContainerGroupId === group.id
                  ? "bg-[#e9eef8] shadow-[inset_0_0_0_1px_#9db7e7]"
                  : ""
              }`}
              onDragOver={(event) => {
                if (!dragState || dragState.nodeId === group.id) return;
                event.preventDefault();
                event.stopPropagation();
                setDragOverContainerGroupId(group.id);
                setDragTargetId(null);
              }}
              onDragLeave={() => {
                setDragOverContainerGroupId((prev) => (prev === group.id ? null : prev));
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDropIntoGroup(group.id);
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="truncate text-[13px] text-[#616670]">{groupSummary(group)}</div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Add item to group"
                    className="flex h-4 w-4 items-center justify-center p-0"
                    onClick={(event) => openGroupAddMenu(group.id, event.currentTarget)}
                  >
                    <AirtableAssetIcon
                      asset={127}
                      alt=""
                      tintColor="rgb(97, 102, 112)"
                      style={{ width: 16, height: 16, display: "block" }}
                    />
                  </button>
                  <button
                    type="button"
                    className="flex h-4 w-4 items-center justify-center p-0"
                    onClick={() => deleteNode(group.id)}
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
                    className="flex h-4 w-4 items-center justify-center p-0"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", group.id);
                      setDragState({
                        nodeId: group.id,
                        nodeType: "group",
                        parentGroupId: parentGroup.id,
                      });
                    }}
                    onDragEnd={() => clearDragState()}
                  >
                    <AirtableAssetIcon
                      asset={298}
                      alt=""
                      tintColor="rgb(97, 102, 112)"
                      style={{ width: 16, height: 16, display: "block" }}
                    />
                  </button>
                </div>
              </div>
              {group.children.length > 0 ? (
                <div>{renderChildren(group)}</div>
              ) : (
                <div
                  className={`mb-2 rounded border border-[#d2d6dc] bg-[#eceff4] px-3 py-2 text-[13px] text-[#7b8190] transition-[background-color,border-color] duration-150 ease-out ${
                    dragOverContainerGroupId === group.id ? "border-[#95b6eb] bg-[#e8f1ff]" : ""
                  }`}
                  onDragOver={(event) => {
                    if (!dragState || dragState.nodeId === group.id) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setDragOverContainerGroupId(group.id);
                    setDragTargetId(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDropIntoGroup(group.id);
                  }}
                >
                  Drag conditions here to add them to this group
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderChildren(group: FilterGroup) {
    return group.children.map((child, index) =>
      child.type === "condition" ? renderCondition(child, group, index) : renderGroup(child, group, index),
    );
  }

  const emptyState = !hasActiveFilters(filterTree) && filterTree.children.length === 0;
  const hasConditionGroup = filterTree.children.some((child) => child.type === "group");
  const totalGroups = countGroups(filterTree);
  const useExpandedPanelFrame = hasConditionGroup && (totalConditions >= 6 || totalGroups >= 3);
  const lockSingleGroupPanelHeight = hasConditionGroup && totalConditions <= 1 && totalGroups <= 2;
  const rootAddGroupDisabled = filterTree.depth >= MAX_FILTER_DEPTH;
  const panelWidth = emptyState
    ? "min(327.5px, calc(100vw - 16px))"
    : hasConditionGroup
      ? useExpandedPanelFrame
        ? "min(694px, calc(100vw - 16px))"
        : "min(682px, calc(100vw - 16px))"
      : "min(590px, calc(100vw - 16px))";

  const menuCondition =
    menu && (menu.kind === "field" || menu.kind === "operator")
      ? findCondition(filterTree, menu.conditionId)
      : null;
  const menuConditionField = menuCondition?.fieldId
    ? columnById.get(menuCondition.fieldId)
    : undefined;
  const menuGroup =
    menu && (menu.kind === "conjunction" || menu.kind === "groupAdd")
      ? findGroup(filterTree, menu.groupId)
      : null;
  const fieldOptions =
    menu?.kind === "field"
      ? sortedColumns.filter((column) =>
          column.name.toLowerCase().includes(fieldSearch.trim().toLowerCase()),
        )
      : [];
  const operatorOptions = menuConditionField
    ? operatorsForFieldType(menuConditionField.type)
    : operatorsForFieldType("TEXT");

  return (
    <div
      className="baymax colors-background-raised-popover rounded shadow-elevation-high flex flex-col overflow-hidden"
      style={{
        width: panelWidth,
        maxWidth: "1065px",
        ...(emptyState ? {} : { maxHeight: "569.25px" }),
        ...(emptyState
          ? { minHeight: "164.25px" }
          : hasConditionGroup
            ? lockSingleGroupPanelHeight
              ? { minHeight: "252.25px", height: "252.25px" }
              : { minHeight: "252.25px" }
            : {}),
      }}
    >
      <div className="flex items-center justify-between px2 pt2" style={{ padding: "16px 16px 0px" }}>
        <h3 className="font-family-default heading-size-xxsmall text-color-quiet line-height-3 font-weight-strong text-[13px] font-semibold text-[#616670]">
          Filter
        </h3>
      </div>

      <div className="px2 py1" style={{ padding: "8px 16px" }}>
        <div className="relative">
          <div className="button-size-default flex items-center border border-[#d8dde5] bg-white p-[4px]" style={{ borderRadius: 6 }}>
            <div className="ml-half flex flex-none items-center">
              <img src="/airtable_assets/yellow_omni.png" alt="" width={16} height={16} className="h-4 w-4" draggable={false} />
            </div>
            <div className="flex-auto px-half px-2">
              <input
                type="text"
                placeholder="Describe what you want to see"
                aria-label="Ask AI to generate filters"
                className="width-full border-none outline-none text-size-default colors-background-default w-full bg-white text-[13px] text-[#7d8592]"
                style={{ outline: "none", border: "none", boxShadow: "none" }}
                value=""
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {!emptyState && (
        <div className="px2 pt1-and-half text-color-quiet" style={{ padding: "12px 16px 0px", color: "#616670" }}>
          In this view, show records
        </div>
      )}

      <div
        className="existingFilterContainer light-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px2 pt1-and-half"
        style={{
          padding: emptyState ? "8px 16px 0px" : "12px 16px 0px",
          overflowY: lockSingleGroupPanelHeight ? "hidden" : "auto",
        }}
        onDragOver={(event) => {
          if (!dragState) return;
          if (event.target !== event.currentTarget) return;
          if (dragState.nodeId === filterTree.id) return;
          event.preventDefault();
          setDragOverContainerGroupId(filterTree.id);
          setDragTargetId(null);
        }}
        onDragLeave={(event) => {
          if (event.target !== event.currentTarget) return;
          setDragOverContainerGroupId((prev) => (prev === filterTree.id ? null : prev));
        }}
        onDrop={(event) => {
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          handleDropIntoGroup(filterTree.id);
        }}
      >
        {emptyState ? (
          <div className="mb1 flex items-center gap-2 py-1 text-[13px] text-[#616670]">
            <span>No filter conditions are applied</span>
            <TinyQuestion />
          </div>
        ) : (
          <div
            className={`${lockSingleGroupPanelHeight ? "" : "mb1"} transition-[background-color,box-shadow] duration-150 ease-out ${
              dragOverContainerGroupId === filterTree.id
                ? "rounded-[3px] bg-[#ebf3ff] shadow-[inset_0_0_0_1px_#9cc2ff]"
                : ""
            }`}
          >
            {renderChildren(filterTree)}
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between px2 pb2"
        style={{ padding: emptyState ? "0px 16px 12px" : "0px 16px 16px" }}
      >
        <div className="mr2 flex flex-wrap items-center gap-4" style={{ width: "max-content", maxWidth: "100%" }}>
          <button
            type="button"
            className={`focusFirstInModal flex items-center gap-1 text-[13px] font-semibold ${
              maxConditionsReached
                ? "cursor-not-allowed text-[#a9afba]"
                : emptyState
                  ? "text-[#166ee1] hover:text-[#0d52ac]"
                  : "text-[#616670] hover:text-[#1d1f25]"
            }`}
            aria-label="Add condition"
            disabled={maxConditionsReached}
            title={maxConditionsReached ? "Maximum of 49 filter conditions reached" : "Add condition"}
            onClick={() => addConditionToGroup(filterTree.id)}
          >
              <AirtableAssetIcon
                asset={127}
                alt=""
                className="mr-half"
                tintColor={emptyState ? "rgb(22, 110, 225)" : "rgb(97, 102, 112)"}
                style={{ width: 12, height: 12 }}
              />
            Add condition
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex items-center gap-1 text-[13px] font-semibold text-[#616670] ${
                rootAddGroupDisabled || maxConditionsReached
                  ? "cursor-not-allowed text-[#a9afba]"
                  : "hover:text-[#1d1f25]"
              }`}
              aria-label="Add condition group"
              disabled={rootAddGroupDisabled || maxConditionsReached}
              title={rootAddGroupDisabled ? "Maximum nesting depth reached" : "Add condition group"}
              onClick={() => addConditionGroupToGroup(filterTree.id)}
            >
              <AirtableAssetIcon
                asset={127}
                alt=""
                className="mr-half"
                tintColor="rgb(97, 102, 112)"
                style={{ width: 12, height: 12 }}
              />
              Add condition group
            </button>
            <span className="flex items-center text-[#7f8794]">
              <a
                href="https://support.airtable.com/docs/advanced-filtering-using-conditions"
                className="flex items-center rounded-full"
                title="Learn more about advanced filtering"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TinyQuestion />
              </a>
            </span>
          </div>
        </div>
      </div>

      {footerNotice && <div className="px-4 pb-3 text-[12px] text-[#a16207]">{footerNotice}</div>}

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[90] overflow-hidden rounded-[6px] border border-[#cfd5dd] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.18)]"
          style={{ left: menu.left, top: menu.top, width: menu.width }}
        >
          {menu.kind === "field" && (
            <div className="w-full">
              <div className="border-b border-[#eceff3] px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder="Find a field"
                  className="w-full bg-transparent text-[13px] text-[#616670] outline-none placeholder:text-[#8f96a3]"
                />
              </div>
              <div className="max-h-[260px] overflow-auto py-1">
                {fieldOptions.map((column) => {
                  const availableOps = operatorsForFieldType(column.type);
                  const firstOp = availableOps[0] ?? null;
                  return (
                    <button
                      key={column.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#1d1f25] hover:bg-[#f5f7fa]"
                      onClick={() => {
                        patchCondition(menu.conditionId, {
                          fieldId: column.id,
                          operator: firstOp,
                          value: "",
                        });
                        setMenu(null);
                      }}
                    >
                      <span className="inline-flex w-4 items-center justify-center text-[#616670]">
                        <FieldTypeIcon type={column.type} className="text-[#616670]" />
                      </span>
                      <span className="truncate">{column.name}</span>
                    </button>
                  );
                })}
                {fieldOptions.length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-[#8f96a3]">No fields found</div>
                )}
              </div>
            </div>
          )}

          {menu.kind === "operator" && (
            <div className="w-full">
              <div className="px-3 py-2 text-[13px] text-[#8f96a3]">Find an operator</div>
              <div className="max-h-[260px] overflow-auto py-1">
                {operatorOptions.map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] text-[#1d1f25] hover:bg-[#f5f7fa] ${
                      menuCondition?.operator === op ? "bg-[#eef1f5]" : ""
                    }`}
                    onClick={() => {
                      patchCondition(menu.conditionId, {
                        operator: op,
                        ...(FILTER_OPS[op].needsValue ? {} : { value: "" }),
                      });
                      setMenu(null);
                    }}
                  >
                    {FILTER_OPS[op].menuLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          {menu.kind === "conjunction" && (
            <div className="py-1">
              {(["and", "or"] as const).map((conjunction) => (
                <button
                  key={conjunction}
                  type="button"
                  className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-[#1d1f25] hover:bg-[#f5f7fa]"
                  onClick={() => {
                    patchConjunction(menu.groupId, conjunction);
                    setMenu(null);
                  }}
                >
                  {conjunction}
                </button>
              ))}
            </div>
          )}

          {menu.kind === "groupAdd" && (
            <div className="py-1">
              <button
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-[#1d1f25] hover:bg-[#f5f7fa]"
                onClick={() => {
                  addConditionToGroup(menu.groupId);
                  setMenu(null);
                }}
              >
                Add condition
              </button>
              <button
                type="button"
                className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] ${
                  !menuGroup || menuGroup.depth >= MAX_FILTER_DEPTH || maxConditionsReached
                    ? "cursor-not-allowed text-[#a3aab6]"
                    : "text-[#1d1f25] hover:bg-[#f5f7fa]"
                }`}
                disabled={!menuGroup || menuGroup.depth >= MAX_FILTER_DEPTH || maxConditionsReached}
                onClick={() => {
                  addConditionGroupToGroup(menu.groupId);
                  setMenu(null);
                }}
              >
                Add condition group
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
