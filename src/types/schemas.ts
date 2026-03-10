// src/types/schemas.ts
// Contract-first: define all input/output shapes here.
// Routers import from this file — never define inline schemas on write paths.

import { z } from "zod";
import { ColumnType } from "@prisma/client";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const IdInput = z.object({ id: z.string().cuid() });

// ─── Base schemas ─────────────────────────────────────────────────────────────

export const BaseOutput = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseWithTablesOutput = BaseOutput.extend({
  tables: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      _count: z.object({ rows: z.number() }),
    })
  ),
});

export const BaseCreateInput = z.object({
  name: z.string().min(1, "Base name is required"),
});

export const BaseRenameInput = z.object({
  id: z.string(),
  name: z.string().min(1, "Base name is required"),
});

export const BaseDeleteInput = IdInput;

// ─── Table schemas ────────────────────────────────────────────────────────────

export const TableOutput = z.object({
  id: z.string(),
  name: z.string(),
  baseId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TableCreateInput = z.object({
  baseId: z.string(),
  name: z.string().min(1, "Table name is required"),
});

export const TableRenameInput = z.object({
  tableId: z.string(),
  name: z.string().min(1, "Table name is required"),
});

export const TableDeleteInput = z.object({ tableId: z.string() });

// ─── Column schemas ───────────────────────────────────────────────────────────

export const ColumnOutput = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(ColumnType),
  order: z.number(),
  tableId: z.string(),
});

export const ColumnAddInput = z.object({
  tableId: z.string(),
  name: z.string().min(1, "Column name is required"),
  type: z.nativeEnum(ColumnType).default("TEXT"),
});

export const ColumnDeleteInput = z.object({ columnId: z.string() });

export const ColumnRenameInput = z.object({
  columnId: z.string(),
  name: z.string().min(1, "Column name is required"),
});

// ─── Cell schemas ─────────────────────────────────────────────────────────────

export const CellOutput = z.object({
  id: z.string(),
  rowId: z.string(),
  columnId: z.string(),
  value: z.string().nullable(),
});

export const CellUpdateInput = z.object({
  rowId: z.string(),
  columnId: z.string(),
  value: z.string().nullable(),
});

// ─── Row schemas ──────────────────────────────────────────────────────────────

export const RowOutput = z.object({
  id: z.string(),
  order: z.number(),
  tableId: z.string(),
  cells: z.array(CellOutput),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RowAddInput = z.object({ tableId: z.string() });

export const RowDeleteInput = z.object({ rowId: z.string() });

export const BulkDeleteRowsInput = z.object({
  rowIds: z.array(z.string()).min(1, "At least one row ID is required"),
});

// ─── Table query (getById with filtering/sorting) ─────────────────────────────

export const TableGetByIdInput = z.object({
  id: z.string(),
  // Optional: sort rows by a specific column's cell value
  sortByColumnId: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  // Optional: filter rows where a specific column contains a substring
  filterColumnId: z.string().optional(),
  filterValue: z.string().optional(),
});

export const TableWithDataOutput = TableOutput.extend({
  columns: z.array(ColumnOutput),
  rows: z.array(RowOutput),
});