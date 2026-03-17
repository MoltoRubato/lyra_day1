import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  BulkDeleteRowsInput,
  CellOutput,
  CellUpdateInput,
  RowAddInput,
  RowDeleteInput,
  RowOutput,
  RowReorderInput,
} from "~/types/schemas";

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
      const result = await ctx.db.row.deleteMany({
        where: { id: { in: input.rowIds } },
      });
      return { deletedCount: result.count };
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
};
