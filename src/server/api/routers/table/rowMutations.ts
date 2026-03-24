import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  BulkCellUpdateInput,
  BulkDeleteRowsInput,
  CellOutput,
  CellUpdateInput,
  RowAddInput,
  RowDeleteInput,
  RowDuplicateInput,
  RowInsertAboveInput,
  RowInsertBelowInput,
  RowOutput,
  RowReorderInput,
} from "~/types/schemas";
import type { PrismaClient } from "@prisma/client";

async function insertEmptyRowAt(
  db: PrismaClient,
  tableId: string,
  insertOrder: number,
) {
  await db.row.updateMany({
    where: { tableId, order: { gte: insertOrder } },
    data: { order: { increment: 1 } },
  });
  const row = await db.row.create({
    data: { tableId, order: insertOrder },
    include: { cells: true },
  });
  const columns = await db.column.findMany({
    where: { tableId },
    select: { id: true },
  });
  if (columns.length > 0) {
    await db.cell.createMany({
      data: columns.map((col) => ({
        rowId: row.id,
        columnId: col.id,
        value: null,
      })),
    });
  }
  const result = await db.row.findUnique({
    where: { id: row.id },
    include: { cells: true },
  });
  if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return result;
}

export const rowMutationProcedures = {
  addRow: publicProcedure
    .input(RowAddInput)
    .output(RowOutput)
    .mutation(async ({ ctx, input }) => {
      const [maxOrder, columns] = await Promise.all([
        ctx.db.row.aggregate({
          where: { tableId: input.tableId },
          _max: { order: true },
        }),
        ctx.db.column.findMany({
          where: { tableId: input.tableId },
          select: { id: true },
        }),
      ]);

      const row = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
          order: (maxOrder._max.order ?? -1) + 1,
        },
        include: { cells: true },
      });

      if (columns.length > 0) {
        await ctx.db.cell.createMany({
          data: columns.map((col) => ({
            rowId: row.id,
            columnId: col.id,
            value: null,
          })),
        });
      }

      const rowWithCells = await ctx.db.row.findUnique({
        where: { id: row.id },
        include: { cells: true },
      });
      if (!rowWithCells) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return rowWithCells;
    }),

  deleteRow: publicProcedure
    .input(RowDeleteInput)
    .output(RowOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.row.findUnique({
        where: { id: input.rowId },
        include: { cells: true },
      });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Row with id "${input.rowId}" not found`,
        });
      }

      return ctx.db.row.delete({
        where: { id: input.rowId },
        include: { cells: true },
      });
    }),

  reorderRows: publicProcedure
    .input(RowReorderInput)
    .output(z.array(RowOutput))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.row.update({ where: { id }, data: { order: index } }),
        ),
      );

      return ctx.db.row.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
        include: { cells: true },
      });
    }),

  bulkDeleteRows: publicProcedure
    .input(BulkDeleteRowsInput)
    .output(z.object({ deletedCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!("rowIds" in input)) {
        const result = await ctx.db.row.deleteMany({
          where: { tableId: input.tableId },
        });
        return { deletedCount: result.count };
      }

      const rowIds = Array.from(new Set(input.rowIds));
      if (rowIds.length === 0) {
        return { deletedCount: 0 };
      }

      const chunkSize = 5_000;
      let deletedCount = 0;
      for (let i = 0; i < rowIds.length; i += chunkSize) {
        const idsChunk = rowIds.slice(i, i + chunkSize);
        const result = await ctx.db.row.deleteMany({
          where: { id: { in: idsChunk } },
        });
        deletedCount += result.count;
      }

      return { deletedCount };
    }),

  updateCell: publicProcedure
    .input(CellUpdateInput)
    .output(CellOutput)
    .mutation(async ({ ctx, input }) => {
      const [row, column] = await Promise.all([
        ctx.db.row.findUnique({ where: { id: input.rowId } }),
        ctx.db.column.findUnique({ where: { id: input.columnId } }),
      ]);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Row with id "${input.rowId}" not found`,
        });
      }
      if (!column) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column with id "${input.columnId}" not found`,
        });
      }

      return ctx.db.cell.upsert({
        where: {
          rowId_columnId: { rowId: input.rowId, columnId: input.columnId },
        },
        update: { value: input.value },
        create: {
          rowId: input.rowId,
          columnId: input.columnId,
          value: input.value,
        },
      });
    }),

  insertRowAbove: publicProcedure
    .input(RowInsertAboveInput)
    .output(RowOutput)
    .mutation(async ({ ctx, input }) => {
      const anchor = await ctx.db.row.findUnique({
        where: { id: input.anchorRowId },
      });
      if (!anchor)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Row "${input.anchorRowId}" not found`,
        });
      return insertEmptyRowAt(ctx.db, anchor.tableId, anchor.order);
    }),

  insertRowBelow: publicProcedure
    .input(RowInsertBelowInput)
    .output(RowOutput)
    .mutation(async ({ ctx, input }) => {
      const anchor = await ctx.db.row.findUnique({
        where: { id: input.anchorRowId },
      });
      if (!anchor)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Row "${input.anchorRowId}" not found`,
        });
      return insertEmptyRowAt(ctx.db, anchor.tableId, anchor.order + 1);
    }),

  duplicateRow: publicProcedure
    .input(RowDuplicateInput)
    .output(RowOutput)
    .mutation(async ({ ctx, input }) => {
      const sourceRow = await ctx.db.row.findUnique({
        where: { id: input.rowId },
        include: { cells: true },
      });
      if (!sourceRow)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Row "${input.rowId}" not found`,
        });

      const primaryCol = await ctx.db.column.findFirst({
        where: { tableId: sourceRow.tableId },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      const newRow = await insertEmptyRowAt(
        ctx.db,
        sourceRow.tableId,
        sourceRow.order + 1,
      );

      if (sourceRow.cells.length > 0) {
        await ctx.db.$transaction(
          sourceRow.cells.map((cell) =>
            ctx.db.cell.upsert({
              where: {
                rowId_columnId: {
                  rowId: newRow.id,
                  columnId: cell.columnId,
                },
              },
              update: {
                value:
                  primaryCol?.id === cell.columnId && cell.value != null
                    ? `${cell.value} copy`
                    : cell.value,
              },
              create: {
                rowId: newRow.id,
                columnId: cell.columnId,
                value:
                  primaryCol?.id === cell.columnId && cell.value != null
                    ? `${cell.value} copy`
                    : cell.value,
              },
            }),
          ),
        );
      }

      const result = await ctx.db.row.findUnique({
        where: { id: newRow.id },
        include: { cells: true },
      });
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return result;
    }),

  bulkUpdateCells: publicProcedure
    .input(BulkCellUpdateInput)
    .output(z.object({ count: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.updates.map((u) =>
          ctx.db.cell.upsert({
            where: {
              rowId_columnId: { rowId: u.rowId, columnId: u.columnId },
            },
            update: { value: u.value },
            create: {
              rowId: u.rowId,
              columnId: u.columnId,
              value: u.value,
            },
          }),
        ),
      );
      return { count: input.updates.length };
    }),
};
