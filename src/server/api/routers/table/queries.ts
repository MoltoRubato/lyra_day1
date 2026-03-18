import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  RowOutput,
  TableGetByIdInput,
  TableWithDataOutput,
} from "~/types/schemas";

type FlatRowCellRecord = {
  row_id: string;
  row_table_id: string;
  row_order: number;
  row_created_at: Date;
  row_updated_at: Date;
  cell_id: string | null;
  cell_value: string | null;
  cell_row_id: string | null;
  cell_column_id: string | null;
  cell_created_at: Date | null;
  cell_updated_at: Date | null;
};

type RowWithCells = z.infer<typeof RowOutput>;

async function fetchRowsAfterOrderRaw(params: {
  ctx: { db: PrismaClient };
  tableId: string;
  afterOrder?: number;
  take: number;
}) {
  const afterOrder = params.afterOrder ?? null;

  const records = await params.ctx.db.$queryRaw<FlatRowCellRecord[]>`
    WITH page_rows AS (
      SELECT
        r.id,
        r."tableId",
        r."order",
        r."createdAt",
        r."updatedAt"
      FROM "Row" r
      WHERE r."tableId" = ${params.tableId}
        AND (${afterOrder}::int IS NULL OR r."order" > ${afterOrder})
      ORDER BY r."order" ASC
      LIMIT ${params.take}
    )
    SELECT
      pr.id AS row_id,
      pr."tableId" AS row_table_id,
      pr."order" AS row_order,
      pr."createdAt" AS row_created_at,
      pr."updatedAt" AS row_updated_at,
      c.id AS cell_id,
      c.value AS cell_value,
      c."rowId" AS cell_row_id,
      c."columnId" AS cell_column_id,
      c."createdAt" AS cell_created_at,
      c."updatedAt" AS cell_updated_at
    FROM page_rows pr
    LEFT JOIN "Cell" c ON c."rowId" = pr.id
    ORDER BY pr."order" ASC, c."columnId" ASC
  `;

  const byRowId = new Map<string, RowWithCells>();

  for (const record of records) {
    const existing = byRowId.get(record.row_id);
    if (!existing) {
      byRowId.set(record.row_id, {
        id: record.row_id,
        tableId: record.row_table_id,
        order: record.row_order,
        createdAt: record.row_created_at,
        updatedAt: record.row_updated_at,
        cells: [],
      });
    }

    if (
      record.cell_id &&
      record.cell_row_id &&
      record.cell_column_id &&
      record.cell_created_at &&
      record.cell_updated_at
    ) {
      byRowId.get(record.row_id)!.cells.push({
        id: record.cell_id,
        value: record.cell_value,
        rowId: record.cell_row_id,
        columnId: record.cell_column_id,
        createdAt: record.cell_created_at,
        updatedAt: record.cell_updated_at,
      });
    }
  }

  return Array.from(byRowId.values());
}

export const tableQueryProcedures = {
  getById: publicProcedure
    .input(TableGetByIdInput)
    .output(TableWithDataOutput)
    .query(async ({ ctx, input }) => {
      const ROW_LIMIT = 1000;

      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { rows: true } },
          columns: {
            orderBy: { order: "asc" },
            include: { selectOptions: { orderBy: { order: "asc" } } },
          },
          rows: {
            take: ROW_LIMIT,
            orderBy: { order: "asc" },
            include: { cells: true },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table with id "${input.id}" not found`,
        });
      }

      let rows = table.rows;

      if (input.filterColumnId && input.filterValue) {
        const needle = input.filterValue.toLowerCase();
        rows = rows.filter((row) => {
          const cell = row.cells.find((c) => c.columnId === input.filterColumnId);
          return cell?.value?.toLowerCase().includes(needle) ?? false;
        });
      }

      if (input.sortByColumnId) {
        const col = table.columns.find((c) => c.id === input.sortByColumnId);
        rows = [...rows].sort((a, b) => {
          const av = a.cells.find((c) => c.columnId === input.sortByColumnId)?.value ?? "";
          const bv = b.cells.find((c) => c.columnId === input.sortByColumnId)?.value ?? "";
          const dir = input.sortDir === "asc" ? 1 : -1;
          if (col?.type === "NUMBER") {
            return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
          }
          return dir * av.localeCompare(bv);
        });
      }

      return { ...table, rows, rowCount: table._count.rows };
    }),

  getRows: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        skip: z.number().int().min(0),
        take: z.number().int().min(1).max(20000),
      }),
    )
    .output(z.array(RowOutput))
    .query(async ({ ctx, input }) => {
      return ctx.db.row.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
        skip: input.skip,
        take: input.take,
        include: { cells: true },
      });
    }),

  getRowsAfterOrder: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        afterOrder: z.number().int().optional(),
        take: z.number().int().min(1).max(20000),
      }),
    )
    .output(z.array(RowOutput))
    .query(async ({ ctx, input }) => {
      return fetchRowsAfterOrderRaw({
        ctx,
        tableId: input.tableId,
        afterOrder: input.afterOrder,
        take: input.take,
      });
    }),

  loadRowsAfterOrder: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        afterOrder: z.number().int().optional(),
        take: z.number().int().min(1).max(20000),
      }),
    )
    .output(z.array(RowOutput))
    .mutation(async ({ ctx, input }) => {
      return fetchRowsAfterOrderRaw({
        ctx,
        tableId: input.tableId,
        afterOrder: input.afterOrder,
        take: input.take,
      });
    }),
};
