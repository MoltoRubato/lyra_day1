import type { ColumnType, PrismaClient } from "@prisma/client";

const COLUMN_TYPE_FALLBACK: Partial<Record<ColumnType, ColumnType>> = {
  LONG_TEXT: "TEXT",
  USER: "TEXT",
};

type EnumLabelRow = { enumlabel: string };

export async function loadAvailableColumnTypes(
  db: PrismaClient,
): Promise<Set<string> | null> {
  const isSqlite = process.env.DATABASE_URL?.startsWith("file:") ?? false;
  if (isSqlite) return null;

  try {
    const rows = await db.$queryRaw<EnumLabelRow[]>`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'ColumnType'
    `;
    return new Set(rows.map((row) => row.enumlabel));
  } catch {
    return null;
  }
}

export function resolveSupportedColumnType(
  desired: ColumnType,
  availableTypes: Set<string> | null,
): ColumnType {
  if (!availableTypes || availableTypes.has(desired)) return desired;
  const fallback = COLUMN_TYPE_FALLBACK[desired] ?? "TEXT";
  console.warn(
    `[column-type-compat] DB enum missing "${desired}". Falling back to "${fallback}". Run migrations to sync enum values.`,
  );
  return fallback;
}
