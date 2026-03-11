// src/types/schemas.ts
import { z } from "zod";
import { ColumnType, ViewType } from "@prisma/client";

export const IdInput = z.object({ id: z.string() });

// ─── Workspace ────────────────────────────────────────────────────────────────

export const WorkspaceOutput = z.object({
  id: z.string(), name: z.string(),
  description: z.string().nullable(),
  starred: z.boolean(),
  createdAt: z.date(), updatedAt: z.date(),
  bases: z.array(z.object({
    id: z.string(), name: z.string(), starred: z.boolean(),
    lastOpenedAt: z.date().nullable(),
    tables: z.array(z.object({
      id: z.string(), name: z.string(),
      _count: z.object({ rows: z.number() }),
    })),
  })),
});
export const WorkspaceCreateInput      = z.object({ name: z.string().min(1), description: z.string().optional() });
export const WorkspaceRenameInput      = z.object({ id: z.string(), name: z.string().min(1) });
export const WorkspaceDescriptionInput = z.object({ id: z.string(), description: z.string().nullable() });
export const WorkspaceToggleStarInput  = z.object({ id: z.string(), starred: z.boolean() });
export const WorkspaceDeleteInput      = IdInput;

// ─── Base ─────────────────────────────────────────────────────────────────────

export const BaseOutput = z.object({
  id: z.string(), name: z.string(), starred: z.boolean(),
  workspaceId: z.string().nullable(),
  lastOpenedAt: z.date().nullable(),
  createdAt: z.date(), updatedAt: z.date(),
});
export const BaseWithTablesOutput = BaseOutput.extend({
  workspace: z.object({ id: z.string(), name: z.string() }).nullable(),
  tables: z.array(z.object({
    id: z.string(), name: z.string(),
    _count: z.object({ rows: z.number() }),
  })),
});
export const BaseCreateInput       = z.object({ name: z.string().min(1), workspaceId: z.string().optional() });
export const BaseRenameInput       = z.object({ id: z.string(), name: z.string().min(1) });
export const BaseDeleteInput       = IdInput;
export const BaseToggleStarInput   = z.object({ id: z.string(), starred: z.boolean() });
export const BaseMoveInput         = z.object({ id: z.string(), workspaceId: z.string().nullable() });

// ─── View ─────────────────────────────────────────────────────────────────────

export const ViewOutput = z.object({
  id: z.string(), name: z.string(),
  type: z.nativeEnum(ViewType),
  order: z.number(), groupByColumnId: z.string().nullable(),
  tableId: z.string(), createdAt: z.date(), updatedAt: z.date(),
});
export const ViewCreateInput       = z.object({ tableId: z.string(), name: z.string().min(1), type: z.nativeEnum(ViewType).default("GRID") });
export const ViewRenameInput       = z.object({ viewId: z.string(), name: z.string().min(1) });
export const ViewDeleteInput       = z.object({ viewId: z.string() });
export const ViewUpdateConfigInput = z.object({ viewId: z.string(), groupByColumnId: z.string().nullable() });
export const ViewReorderInput      = z.object({ tableId: z.string(), orderedIds: z.array(z.string()).min(1) });

// ─── Select options ────────────────────────────────────────────────────────────

export const SelectOptionOutput      = z.object({ id: z.string(), label: z.string(), color: z.string(), order: z.number(), columnId: z.string() });
export const SelectOptionAddInput    = z.object({ columnId: z.string(), label: z.string(), color: z.string().default("#166254") });
export const SelectOptionDeleteInput = z.object({ optionId: z.string() });
export const SelectOptionUpdateInput = z.object({ optionId: z.string(), label: z.string().optional(), color: z.string().optional() });

// ─── Column ───────────────────────────────────────────────────────────────────

export const ColumnOutput        = z.object({ id: z.string(), name: z.string(), type: z.nativeEnum(ColumnType), order: z.number(), width: z.number(), tableId: z.string(), selectOptions: z.array(SelectOptionOutput).optional() });
export const ColumnAddInput      = z.object({ tableId: z.string(), name: z.string().min(1), type: z.nativeEnum(ColumnType).default("TEXT") });
export const ColumnDeleteInput   = z.object({ columnId: z.string() });
export const ColumnRenameInput   = z.object({ columnId: z.string(), name: z.string().min(1) });
export const ColumnChangeTypeInput = z.object({ columnId: z.string(), type: z.string().min(1) });
export const ColumnReorderInput  = z.object({ tableId: z.string(), orderedIds: z.array(z.string()).min(1) });
export const ColumnResizeInput   = z.object({ columnId: z.string(), width: z.number().int().min(80).max(1200) });

// ─── Table + rows/cells ───────────────────────────────────────────────────────

export const TableOutput      = z.object({ id: z.string(), name: z.string(), baseId: z.string(), createdAt: z.date(), updatedAt: z.date() });
export const CellOutput       = z.object({ id: z.string(), value: z.string().nullable(), rowId: z.string(), columnId: z.string(), createdAt: z.date(), updatedAt: z.date() });
export const RowOutput        = z.object({ id: z.string(), order: z.number(), tableId: z.string(), cells: z.array(CellOutput), createdAt: z.date(), updatedAt: z.date() });
export const TableWithDataOutput = TableOutput.extend({ columns: z.array(ColumnOutput), rows: z.array(RowOutput) });
export const TableCreateInput = z.object({ baseId: z.string(), name: z.string().min(1) });
export const TableRenameInput = z.object({ tableId: z.string(), name: z.string().min(1) });
export const TableDeleteInput = z.object({ tableId: z.string() });
export const CellUpdateInput  = z.object({ rowId: z.string(), columnId: z.string(), value: z.string().nullable() });
export const RowAddInput      = z.object({ tableId: z.string() });
export const RowDeleteInput   = z.object({ rowId: z.string() });
export const BulkDeleteRowsInput = z.object({ rowIds: z.array(z.string()).min(1) });
export const TableGetByIdInput   = z.object({ id: z.string(), filterColumnId: z.string().optional(), filterValue: z.string().optional(), sortByColumnId: z.string().optional(), sortDir: z.enum(["asc", "desc"]).optional() });