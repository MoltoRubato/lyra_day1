// src/app/_components/tableUtils.ts
import type { Row, Cell, Column } from "@prisma/client";

export type RowWithCells = Row & { cells: Cell[] };
type ColumnLike = Pick<Column, "id" | "name" | "type">;

export function getCellValue(row: RowWithCells, columnId: string): string {
  return row.cells.find((c) => c.columnId === columnId)?.value ?? "";
}

// ── Field type metadata ───────────────────────────────────────────────────────

export type FieldCategory = "text" | "number" | "boolean" | "date" | "select";

export const FIELD_TYPES: Record<string, { label: string; icon: string; category: FieldCategory }> = {
  TEXT:          { label: "Single line text", icon: "T",  category: "text"    },
  LONG_TEXT:     { label: "Long text",      icon: "P",  category: "text"    },
  USER:          { label: "User",           icon: "U",  category: "text"    },
  NUMBER:        { label: "Number",         icon: "#",  category: "number"  },
  CHECKBOX:      { label: "Checkbox",       icon: "☑",  category: "boolean" },
  SINGLE_SELECT: { label: "Single select",  icon: "◉",  category: "select"  },
  MULTI_SELECT:  { label: "Multi select",   icon: "◈",  category: "select"  },
  DATE:          { label: "Date",           icon: "📅", category: "date"    },
  PHONE:         { label: "Phone",          icon: "📞", category: "text"    },
  EMAIL:         { label: "Email",          icon: "@",  category: "text"    },
  URL:           { label: "URL",            icon: "🔗", category: "text"    },
  CURRENCY:      { label: "Currency",       icon: "$",  category: "number"  },
  PERCENT:       { label: "Percent",        icon: "%",  category: "number"  },
  DURATION:      { label: "Duration",       icon: "⏱", category: "text"    },
  RATING:        { label: "Rating",         icon: "★",  category: "number"  },
  ATTACHMENT:    { label: "Attachment",     icon: "📎", category: "text"    },
};

export const FIELD_TYPE_GROUPS = [
  { label: "Text & links",  types: ["TEXT", "LONG_TEXT", "USER", "EMAIL", "URL", "PHONE", "ATTACHMENT", "DURATION"] },
  { label: "Numbers",       types: ["NUMBER", "CURRENCY", "PERCENT", "RATING"] },
  { label: "Date & time",   types: ["DATE"] },
  { label: "Choice",        types: ["SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX"] },
];

/** Format a stored string value for display based on column type */
export function formatCellValue(value: string, type: string): string {
  if (!value) return "";
  switch (type) {
    case "CURRENCY": return value.startsWith("$") ? value : `$${value}`;
    case "PERCENT":  return value.endsWith("%")   ? value : `${value}%`;
    case "CHECKBOX": return value === "true" ? "✓" : "";
    case "RATING":   return "★".repeat(Math.min(Math.max(parseInt(value) || 0, 0), 5));
    default:         return value;
  }
}

export function getSearchableCellText(value: string, type: string): string {
  if (!value) return "";
  if (type === "ATTACHMENT") {
    const lastSegment = value.split("/").filter(Boolean).pop();
    return lastSegment ?? value;
  }
  return formatCellValue(value, type);
}

export function getGridSearchCellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

/** Input type attribute for HTML inputs */
export function inputTypeForField(colType: string): string {
  switch (colType) {
    case "NUMBER": case "CURRENCY": case "PERCENT": case "RATING": return "number";
    case "DATE":   return "date";
    case "EMAIL":  return "email";
    case "URL":    return "url";
    case "PHONE":  return "tel";
    case "USER":   return "text";
    default:       return "text";
  }
}

// ── View config types ─────────────────────────────────────────────────────────

export const MAX_FILTER_CONDITIONS = 49;
export const MAX_FILTER_DEPTH = 3;

export type FilterConjunction = "and" | "or";

export type FilterOp =
  | "contains"
  | "does_not_contain"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty"
  | "is_greater_than"
  | "is_less_than"
  | "is_greater_than_or_equal"
  | "is_less_than_or_equal"
  | "is_exactly"
  | "has_any_of"
  | "has_all_of"
  | "has_none_of"
  | "is_before"
  | "is_after"
  | "in_past_week"
  | "in_past_month"
  | "in_past_year"
  | "in_next_week"
  | "in_next_month"
  | "in_next_year";

export type FilterCondition = {
  id: string;
  type: "condition";
  fieldId: string | null;
  operator: FilterOp | null;
  value?: string;
};

export type FilterGroup = {
  id: string;
  type: "group";
  conjunction: FilterConjunction;
  children: FilterNode[];
  depth: number;
};

export type FilterNode = FilterCondition | FilterGroup;
export type FilterTree = FilterGroup;

export type FilterOpMeta = {
  label: string;
  menuLabel: string;
  needsValue: boolean;
};

export type SortRule = {
  id: string;
  columnId: string;
  dir: "asc" | "desc";
};

export type GroupRule = {
  id: string;
  columnId: string;
  dir: "asc" | "desc";
};

export type RowHeight = "short" | "medium" | "tall" | "extra-tall";

export const ROW_HEIGHT_PX: Record<RowHeight, number> = {
  short: 32,
  medium: 56,
  tall: 88,
  "extra-tall": 128,
};

// -- Filter operators metadata ------------------------------------------------

export const FILTER_OPS: Record<FilterOp, FilterOpMeta> = {
  contains: {
    label: "contains",
    menuLabel: "contains...",
    needsValue: true,
  },
  does_not_contain: {
    label: "does not contain",
    menuLabel: "does not contain...",
    needsValue: true,
  },
  is: {
    label: "is",
    menuLabel: "is...",
    needsValue: true,
  },
  is_not: {
    label: "is not",
    menuLabel: "is not...",
    needsValue: true,
  },
  is_empty: {
    label: "is empty",
    menuLabel: "is empty",
    needsValue: false,
  },
  is_not_empty: {
    label: "is not empty",
    menuLabel: "is not empty",
    needsValue: false,
  },
  is_greater_than: {
    label: "is greater than",
    menuLabel: "is greater than...",
    needsValue: true,
  },
  is_less_than: {
    label: "is less than",
    menuLabel: "is less than...",
    needsValue: true,
  },
  is_greater_than_or_equal: {
    label: "is greater than or equal to",
    menuLabel: "is greater than or equal to...",
    needsValue: true,
  },
  is_less_than_or_equal: {
    label: "is less than or equal to",
    menuLabel: "is less than or equal to...",
    needsValue: true,
  },
  is_exactly: {
    label: "is exactly",
    menuLabel: "is exactly...",
    needsValue: true,
  },
  has_any_of: {
    label: "has any of",
    menuLabel: "has any of...",
    needsValue: true,
  },
  has_all_of: {
    label: "has all of",
    menuLabel: "has all of...",
    needsValue: true,
  },
  has_none_of: {
    label: "has none of",
    menuLabel: "has none of...",
    needsValue: true,
  },
  is_before: {
    label: "is before",
    menuLabel: "is before...",
    needsValue: true,
  },
  is_after: {
    label: "is after",
    menuLabel: "is after...",
    needsValue: true,
  },
  in_past_week: {
    label: "is in the past week",
    menuLabel: "is in the past week",
    needsValue: false,
  },
  in_past_month: {
    label: "is in the past month",
    menuLabel: "is in the past month",
    needsValue: false,
  },
  in_past_year: {
    label: "is in the past year",
    menuLabel: "is in the past year",
    needsValue: false,
  },
  in_next_week: {
    label: "is in the next week",
    menuLabel: "is in the next week",
    needsValue: false,
  },
  in_next_month: {
    label: "is in the next month",
    menuLabel: "is in the next month",
    needsValue: false,
  },
  in_next_year: {
    label: "is in the next year",
    menuLabel: "is in the next year",
    needsValue: false,
  },
};

function createFilterId(prefix: "flt" | "grp" | "cnd"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createFilterCondition(seed?: Partial<FilterCondition>): FilterCondition {
  return {
    id: seed?.id ?? createFilterId("cnd"),
    type: "condition",
    fieldId: seed?.fieldId ?? null,
    operator: seed?.operator ?? null,
    ...(seed?.value !== undefined ? { value: seed.value } : {}),
  };
}

export function createFilterTree(): FilterTree {
  return {
    id: createFilterId("grp"),
    type: "group",
    conjunction: "and",
    children: [],
    depth: 1,
  };
}

type LegacyFilterOp =
  | "contains"
  | "does_not_contain"
  | "equals"
  | "not_equals"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

type LegacyFilterCondition = {
  id?: string;
  columnId?: string;
  op?: LegacyFilterOp;
  value?: string;
};

function normalizeLegacyOp(op: string | null | undefined): FilterOp | null {
  switch (op) {
    case "contains":
    case "does_not_contain":
    case "is_empty":
    case "is_not_empty":
      return op;
    case "equals":
      return "is";
    case "not_equals":
      return "is_not";
    case "gt":
      return "is_greater_than";
    case "gte":
      return "is_greater_than_or_equal";
    case "lt":
      return "is_less_than";
    case "lte":
      return "is_less_than_or_equal";
    default:
      return null;
  }
}

function normalizeFilterConditionValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value == null) return undefined;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value);
  }
  return undefined;
}

function isFilterGroupLike(value: unknown): value is { type?: unknown; children?: unknown } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "children" in value &&
      (!("type" in value) || (value as { type?: unknown }).type === "group"),
  );
}

function isFilterConditionLike(value: unknown): value is {
  type?: unknown;
  fieldId?: unknown;
  columnId?: unknown;
  operator?: unknown;
  op?: unknown;
  value?: unknown;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      (!("type" in value) || (value as { type?: unknown }).type === "condition"),
  );
}

function normalizeFilterCondition(raw: unknown): FilterCondition | null {
  if (!isFilterConditionLike(raw)) return null;
  const condition = raw as {
    id?: unknown;
    fieldId?: unknown;
    columnId?: unknown;
    operator?: unknown;
    op?: unknown;
    value?: unknown;
  };

  const operatorFromNewModel =
    typeof condition.operator === "string" && condition.operator in FILTER_OPS
      ? (condition.operator as FilterOp)
      : null;
  const operatorFromLegacyModel = normalizeLegacyOp(
    typeof condition.op === "string" ? condition.op : null,
  );
  const operator = operatorFromNewModel ?? operatorFromLegacyModel;

  const value = normalizeFilterConditionValue(condition.value);

  return {
    id:
      typeof condition.id === "string" && condition.id.trim().length > 0
        ? condition.id
        : createFilterId("cnd"),
    type: "condition",
    fieldId:
      typeof condition.fieldId === "string"
        ? condition.fieldId
        : typeof condition.columnId === "string"
          ? condition.columnId
          : null,
    operator,
    ...(value !== undefined ? { value } : {}),
  };
}

function normalizeFilterGroup(raw: unknown, depth: number): FilterGroup | null {
  if (!isFilterGroupLike(raw)) return null;
  if (depth > MAX_FILTER_DEPTH) return null;

  const group = raw as {
    id?: unknown;
    conjunction?: unknown;
    children?: unknown;
  };

  const conjunction: FilterConjunction =
    group.conjunction === "or" || group.conjunction === "and" ? group.conjunction : "and";

  const childrenRaw = Array.isArray(group.children) ? group.children : [];
  const normalizedChildren: FilterNode[] = [];

  for (const child of childrenRaw) {
    const normalizedChild = normalizeFilterNode(child, depth + 1);
    if (!normalizedChild) continue;
    normalizedChildren.push(normalizedChild);
  }

  return {
    id:
      typeof group.id === "string" && group.id.trim().length > 0
        ? group.id
        : createFilterId("grp"),
    type: "group",
    conjunction,
    children: normalizedChildren,
    depth,
  };
}

function normalizeFilterNode(raw: unknown, depth: number): FilterNode | null {
  if (isFilterGroupLike(raw)) return normalizeFilterGroup(raw, depth);
  return normalizeFilterCondition(raw);
}

function normalizeLegacyFilterList(legacy: unknown[]): FilterTree {
  const root = createFilterTree();
  root.children = legacy
    .map((entry) => normalizeFilterCondition(entry as LegacyFilterCondition))
    .filter((entry): entry is FilterCondition => Boolean(entry));
  return root;
}

export function normalizeFilterTree(raw: unknown): FilterTree {
  if (Array.isArray(raw)) {
    return normalizeLegacyFilterList(raw);
  }
  const normalizedRoot = normalizeFilterGroup(raw, 1);
  if (!normalizedRoot) return createFilterTree();
  return normalizedRoot;
}

export function countFilterConditions(tree: FilterTree | null | undefined): number {
  if (!tree) return 0;
  let count = 0;
  const stack: FilterNode[] = [...tree.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === "condition") {
      count += 1;
      continue;
    }
    stack.push(...node.children);
  }
  return count;
}

export function firstFilterFieldId(tree: FilterTree | null | undefined): string | null {
  if (!tree) return null;
  const queue: FilterNode[] = [...tree.children];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.type === "condition") {
      if (node.fieldId) return node.fieldId;
      continue;
    }
    queue.unshift(...node.children);
  }
  return null;
}

export function operatorsForFieldType(fieldType: string): FilterOp[] {
  if (["NUMBER", "CURRENCY", "PERCENT", "RATING"].includes(fieldType)) {
    return [
      "is",
      "is_not",
      "is_greater_than",
      "is_less_than",
      "is_greater_than_or_equal",
      "is_less_than_or_equal",
      "is_empty",
      "is_not_empty",
    ];
  }
  if (fieldType === "DATE") {
    return [
      "is",
      "is_not",
      "is_before",
      "is_after",
      "in_past_week",
      "in_past_month",
      "in_past_year",
      "in_next_week",
      "in_next_month",
      "in_next_year",
      "is_empty",
      "is_not_empty",
    ];
  }
  if (fieldType === "SINGLE_SELECT" || fieldType === "MULTI_SELECT") {
    return [
      "is_exactly",
      "has_any_of",
      "has_all_of",
      "has_none_of",
      "is_empty",
      "is_not_empty",
    ];
  }
  if (fieldType === "CHECKBOX") {
    return ["is", "is_not", "is_empty", "is_not_empty"];
  }
  return ["contains", "does_not_contain", "is", "is_not", "is_empty", "is_not_empty"];
}

function conditionNeedsValue(condition: FilterCondition): boolean {
  if (!condition.operator) return false;
  return FILTER_OPS[condition.operator]?.needsValue ?? true;
}

export function isCompleteFilterCondition(condition: FilterCondition): boolean {
  if (!condition.fieldId || !condition.operator) return false;
  if (!conditionNeedsValue(condition)) return true;
  return (condition.value ?? "").trim().length > 0;
}

export function getActiveFilterFieldIds(
  tree: FilterTree | null | undefined,
): string[] {
  if (!tree) return [];
  const ids: string[] = [];
  const seen = new Set<string>();

  function walk(group: FilterGroup) {
    for (const node of group.children) {
      if (node.type === "condition") {
        if (!node.fieldId || !isCompleteFilterCondition(node)) continue;
        if (seen.has(node.fieldId)) continue;
        seen.add(node.fieldId);
        ids.push(node.fieldId);
        continue;
      }
      walk(node);
    }
  }

  walk(tree);

  return ids;
}

function splitFilterValue(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function evalRelativeDateWindow(targetDate: Date, direction: "past" | "next", daySpan: number): boolean {
  const now = new Date();
  const target = targetDate.getTime();
  const nowTime = now.getTime();
  const spanMs = daySpan * 24 * 60 * 60 * 1000;
  if (direction === "past") {
    return target >= nowTime - spanMs && target <= nowTime;
  }
  return target >= nowTime && target <= nowTime + spanMs;
}

function evaluateCondition(
  condition: FilterCondition,
  row: RowWithCells,
): boolean | null {
  if (!condition.fieldId || !condition.operator) return null;

  const rawValue = getCellValue(row, condition.fieldId).trim();
  const compareValue = (condition.value ?? "").trim();
  const operatorMeta = FILTER_OPS[condition.operator];
  const needsValue = operatorMeta?.needsValue ?? true;
  if (needsValue && compareValue.length === 0) return null;

  const lowerRawValue = rawValue.toLowerCase();
  const lowerCompareValue = compareValue.toLowerCase();

  switch (condition.operator) {
    case "contains":
      return lowerRawValue.includes(lowerCompareValue);
    case "does_not_contain":
      return !lowerRawValue.includes(lowerCompareValue);
    case "is":
      return rawValue === compareValue;
    case "is_not":
      return rawValue !== compareValue;
    case "is_empty":
      return rawValue.length === 0;
    case "is_not_empty":
      return rawValue.length > 0;
    case "is_greater_than":
      return Number(rawValue) > Number(compareValue);
    case "is_less_than":
      return Number(rawValue) < Number(compareValue);
    case "is_greater_than_or_equal":
      return Number(rawValue) >= Number(compareValue);
    case "is_less_than_or_equal":
      return Number(rawValue) <= Number(compareValue);
    case "is_exactly":
      return splitFilterValue(rawValue).join("|") === splitFilterValue(compareValue).join("|");
    case "has_any_of": {
      const haystack = new Set(splitFilterValue(rawValue));
      return splitFilterValue(compareValue).some((value) => haystack.has(value));
    }
    case "has_all_of": {
      const haystack = new Set(splitFilterValue(rawValue));
      return splitFilterValue(compareValue).every((value) => haystack.has(value));
    }
    case "has_none_of": {
      const haystack = new Set(splitFilterValue(rawValue));
      return splitFilterValue(compareValue).every((value) => !haystack.has(value));
    }
    case "is_before": {
      const rawDate = parseDateValue(rawValue);
      const compareDate = parseDateValue(compareValue);
      if (!rawDate || !compareDate) return false;
      return rawDate.getTime() < compareDate.getTime();
    }
    case "is_after": {
      const rawDate = parseDateValue(rawValue);
      const compareDate = parseDateValue(compareValue);
      if (!rawDate || !compareDate) return false;
      return rawDate.getTime() > compareDate.getTime();
    }
    case "in_past_week": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "past", 7);
    }
    case "in_past_month": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "past", 30);
    }
    case "in_past_year": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "past", 365);
    }
    case "in_next_week": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "next", 7);
    }
    case "in_next_month": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "next", 30);
    }
    case "in_next_year": {
      const rawDate = parseDateValue(rawValue);
      if (!rawDate) return false;
      return evalRelativeDateWindow(rawDate, "next", 365);
    }
    default:
      return null;
  }
}

function evaluateNode(node: FilterNode, row: RowWithCells): boolean | null {
  if (node.type === "condition") return evaluateCondition(node, row);
  if (!node.children.length) return null;

  const childResults = node.children
    .map((child) => evaluateNode(child, row))
    .filter((result): result is boolean => result !== null);

  if (!childResults.length) return null;
  if (node.conjunction === "and") return childResults.every(Boolean);
  return childResults.some(Boolean);
}

export function hasActiveFilters(tree: FilterTree | null | undefined): boolean {
  if (!tree) return false;
  const stack: FilterNode[] = [...tree.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === "condition") {
      if (isCompleteFilterCondition(node)) return true;
      continue;
    }
    stack.push(...node.children);
  }
  return false;
}

// -- Filtering ----------------------------------------------------------------

export function applyFilters(
  rows: RowWithCells[],
  filterTree: FilterTree | null | undefined,
): RowWithCells[] {
  if (!filterTree || !hasActiveFilters(filterTree)) return rows;
  return rows.filter((row) => {
    const result = evaluateNode(filterTree, row);
    return result ?? true;
  });
}

// -- Sorting (multi-field) ----------------------------------------------------
export function applySorts(
  rows: RowWithCells[],
  sorts: SortRule[],
  columns: ColumnLike[],
): RowWithCells[] {
  if (!sorts.length) return rows;
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const col = colMap.get(sort.columnId);
      if (!col) continue;
      const av    = getCellValue(a, sort.columnId);
      const bv    = getCellValue(b, sort.columnId);
      const isNum = ["NUMBER", "CURRENCY", "PERCENT", "RATING"].includes(col.type);
      const cmp   = isNum
        ? (parseFloat(av) || 0) - (parseFloat(bv) || 0)
        : av.localeCompare(bv);
      if (cmp !== 0) return sort.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

/** Legacy single-sort helper — kept for backward compat */
export function sortRows(
  rows: RowWithCells[],
  sort: { columnId: string; dir: "asc" | "desc" } | null,
  columns: ColumnLike[],
): RowWithCells[] {
  if (!sort) return rows;
  return applySorts(rows, [{ id: "legacy", ...sort }], columns);
}

// ── Grouping (multi-level nested) ─────────────────────────────────────────────

export type GroupNode = {
  key:       string;           // unique React key
  value:     string;           // display label
  columnId:  string;
  depth:     number;           // -1 = ungrouped root (no header)
  rows:      RowWithCells[];   // leaf rows (only set at deepest level)
  subgroups: GroupNode[];
};

function buildGroupTree(
  items: RowWithCells[],
  rules: GroupRule[],
  depth: number,
  parentKey: string,
): GroupNode[] {
  const rule = rules[depth]!;
  const map  = new Map<string, RowWithCells[]>();
  for (const row of items) {
    const rawValue = getCellValue(row, rule.columnId).trim();
    const val = rawValue.length ? rawValue : "(Empty)";
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(row);
  }
  const sorted = [...map.entries()].sort(([a], [b]) =>
    rule.dir === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
  const isLeaf = depth === rules.length - 1;
  return sorted.map(([value, groupRows]) => {
    const key = `${parentKey}::${value}`;
    return {
      key,
      value,
      columnId: rule.columnId,
      depth,
      rows:      isLeaf ? groupRows : [],
      subgroups: isLeaf ? [] : buildGroupTree(groupRows, rules, depth + 1, key),
    };
  });
}

export function applyGroups(
  rows: RowWithCells[],
  groups: GroupRule[],
): GroupNode[] {
  if (!groups.length) {
    return [{ key: "__all__", value: "", columnId: "", depth: -1, rows, subgroups: [] }];
  }
  return buildGroupTree(rows, groups, 0, "root");
}

export function collectGroupKeys(nodes: GroupNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.depth >= 0) keys.push(node.key);
    if (node.subgroups.length) {
      keys.push(...collectGroupKeys(node.subgroups));
    }
  }
  return keys;
}

/** Flatten a GroupNode tree into a flat renderable list */
export type FlatItem =
  | { kind: "group"; node: GroupNode; totalRows: number; rows: RowWithCells[] }
  | { kind: "row";   row: RowWithCells };

function rowsIn(node: GroupNode): RowWithCells[] {
  if (node.subgroups.length) return node.subgroups.flatMap(rowsIn);
  return node.rows;
}

export function flattenGroupTree(
  nodes: GroupNode[],
  collapsedGroupKeys: ReadonlySet<string> = new Set<string>(),
): FlatItem[] {
  const result: FlatItem[] = [];
  for (const node of nodes) {
    // depth >= 0 means it's a real group that needs a header row
    if (node.depth >= 0) {
      const rows = rowsIn(node);
      result.push({ kind: "group", node, totalRows: rows.length, rows });
      if (collapsedGroupKeys.has(node.key)) continue;
    }
    if (node.subgroups.length) {
      result.push(...flattenGroupTree(node.subgroups, collapsedGroupKeys));
    } else {
      for (const row of node.rows) {
        result.push({ kind: "row", row });
      }
    }
  }
  return result;
}

// ── Legacy groupRows (kept for KanbanView) ────────────────────────────────────

export type GroupedRows = { value: string; rows: RowWithCells[] }[];

export function groupRows(rows: RowWithCells[], groupColId: string | null): GroupedRows {
  if (!groupColId) return [{ value: "", rows }];
  const map = new Map<string, RowWithCells[]>();
  for (const row of rows) {
    const key = getCellValue(row, groupColId) || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.entries()).map(([value, rows]) => ({ value, rows }));
}

// ── Kanban helpers ────────────────────────────────────────────────────────────

export function resolveGroupColumn(
  columns: ColumnLike[],
  groupByColumnId?: string | null,
): ColumnLike | undefined {
  if (groupByColumnId) return columns.find((c) => c.id === groupByColumnId);
  return (
    columns.find((c) => c.name.toLowerCase() === "status") ??
    columns.find((c) => ["TEXT", "LONG_TEXT", "USER", "SINGLE_SELECT"].includes(c.type))
  );
}

export function resolveNameColumn(columns: ColumnLike[]): ColumnLike | undefined {
  return columns.find((c) => c.name.toLowerCase() === "name") ?? columns[0];
}

