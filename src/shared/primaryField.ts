import type { ColumnType } from "@prisma/client";

export const PRIMARY_FIELD_SUPPORTED_TYPES: readonly ColumnType[] = [
  "TEXT",
  "LONG_TEXT",
  "DATE",
  "PHONE",
  "EMAIL",
  "URL",
  "NUMBER",
  "CURRENCY",
  "PERCENT",
  "DURATION",
];

const PRIMARY_FIELD_SUPPORTED_TYPE_SET = new Set<string>(PRIMARY_FIELD_SUPPORTED_TYPES);

export function isPrimaryFieldSupportedType(type: string): boolean {
  return PRIMARY_FIELD_SUPPORTED_TYPE_SET.has(type);
}
