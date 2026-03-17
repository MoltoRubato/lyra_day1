import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  ColumnAddInput,
  ColumnChangeTypeInput,
  ColumnDeleteInput,
  ColumnDescriptionInput,
  ColumnDuplicateInput,
  ColumnInsertLeftInput,
  ColumnInsertRightInput,
  ColumnOutput,
  ColumnRenameInput,
  ColumnReorderInput,
  ColumnResizeInput,
  SelectOptionAddInput,
  SelectOptionDeleteInput,
  SelectOptionOutput,
  SelectOptionUpdateInput,
} from "~/types/schemas";

export const columnMutationProcedures = {
  addColumn: publicProcedure
    .input(ColumnAddInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({ where: { id: input.tableId } });
      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table with id "${input.tableId}" not found`,
        });
      }

      const maxOrder = await ctx.db.column.aggregate({
        where: { tableId: input.tableId },
        _max: { order: true },
      });

      const column = await ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          order: (maxOrder._max.order ?? -1) + 1,
          tableId: input.tableId,
        },
      });

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        select: { id: true },
      });
      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map((row) => ({
            rowId: row.id,
            columnId: column.id,
            value: null,
          })),
        });
      }

      return column;
    }),

  insertColumnLeft: publicProcedure
    .input(ColumnInsertLeftInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const anchor = await ctx.db.column.findUnique({
        where: { id: input.anchorColumnId },
        select: { id: true, tableId: true, order: true },
      });
      if (anchor?.tableId !== input.tableId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anchor column not found in the target table",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.column.updateMany({
          where: { tableId: input.tableId, order: { gte: anchor.order } },
          data: { order: { increment: 1 } },
        });
      });

      const inserted = await ctx.db.column.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          description: null,
          width: 180,
          order: anchor.order,
        },
        include: { selectOptions: { orderBy: { order: "asc" } } },
      });

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        select: { id: true },
      });
      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map((row) => ({
            rowId: row.id,
            columnId: inserted.id,
            value: null,
          })),
        });
      }

      return inserted;
    }),

  insertColumnRight: publicProcedure
    .input(ColumnInsertRightInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const anchor = await ctx.db.column.findUnique({
        where: { id: input.anchorColumnId },
        select: { tableId: true, order: true },
      });
      if (anchor?.tableId !== input.tableId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anchor column not found in the target table",
        });
      }

      await ctx.db.column.updateMany({
        where: { tableId: input.tableId, order: { gt: anchor.order } },
        data: { order: { increment: 1 } },
      });

      const inserted = await ctx.db.column.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          description: null,
          width: 180,
          order: anchor.order + 1,
        },
        include: { selectOptions: { orderBy: { order: "asc" } } },
      });

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        select: { id: true },
      });
      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map((row) => ({
            rowId: row.id,
            columnId: inserted.id,
            value: null,
          })),
        });
      }

      return inserted;
    }),

  deleteColumn: publicProcedure
    .input(ColumnDeleteInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column with id "${input.columnId}" not found`,
        });
      }
      return ctx.db.column.delete({ where: { id: input.columnId } });
    }),

  renameColumn: publicProcedure
    .input(ColumnRenameInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column with id "${input.columnId}" not found`,
        });
      }
      return ctx.db.column.update({
        where: { id: input.columnId },
        data: { name: input.name },
      });
    }),

  updateColumnDescription: publicProcedure
    .input(ColumnDescriptionInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column with id "${input.columnId}" not found`,
        });
      }
      return ctx.db.column.update({
        where: { id: input.columnId },
        data: { description: input.description },
      });
    }),

  changeColumnType: publicProcedure
    .input(ColumnChangeTypeInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column "${input.columnId}" not found`,
        });
      }
      return ctx.db.column.update({
        where: { id: input.columnId },
        data: { type: input.type },
      });
    }),

  reorderColumns: publicProcedure
    .input(ColumnReorderInput)
    .output(z.array(ColumnOutput))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.orderedIds.map((id, index) =>
          ctx.db.column.update({ where: { id }, data: { order: index } }),
        ),
      );
      return ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
    }),

  resizeColumn: publicProcedure
    .input(ColumnResizeInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.column.update({
        where: { id: input.columnId },
        data: { width: input.width },
      });
    }),

  duplicateColumn: publicProcedure
    .input(ColumnDuplicateInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.column.findUnique({
        where: { id: input.columnId },
        include: { selectOptions: { orderBy: { order: "asc" } } },
      });
      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Column with id "${input.columnId}" not found`,
        });
      }

      const tableColumns = await ctx.db.column.findMany({
        where: { tableId: source.tableId },
        orderBy: { order: "asc" },
      });

      const copiedName = `${source.name} copy`;
      const used = new Set(tableColumns.map((c) => c.name.toLowerCase()));
      let finalName = copiedName;
      let suffix = 2;
      while (used.has(finalName.toLowerCase())) {
        finalName = `${copiedName} ${suffix}`;
        suffix += 1;
      }

      const duplicate = await ctx.db.column.create({
        data: {
          tableId: source.tableId,
          name: finalName,
          type: source.type,
          description: source.description,
          width: source.width,
          order: source.order + 1,
        },
      });

      await Promise.all(
        tableColumns
          .filter((col) => col.order > source.order)
          .map((col) =>
            ctx.db.column.update({
              where: { id: col.id },
              data: { order: col.order + 1 },
            }),
          ),
      );

      if (source.selectOptions.length > 0) {
        await ctx.db.selectOption.createMany({
          data: source.selectOptions.map((opt, idx) => ({
            columnId: duplicate.id,
            label: opt.label,
            color: opt.color,
            order: idx,
          })),
        });
      }

      const rows = await ctx.db.row.findMany({
        where: { tableId: source.tableId },
        orderBy: { order: "asc" },
        include: { cells: true },
      });

      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map((row) => {
            const sourceVal = row.cells.find((cell) => cell.columnId === source.id)?.value ?? null;
            return {
              rowId: row.id,
              columnId: duplicate.id,
              value: input.duplicateCells ? sourceVal : null,
            };
          }),
        });
      }

      return ctx.db.column.findUniqueOrThrow({
        where: { id: duplicate.id },
        include: { selectOptions: { orderBy: { order: "asc" } } },
      });
    }),

  addSelectOption: publicProcedure
    .input(SelectOptionAddInput)
    .output(SelectOptionOutput)
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.selectOption.count({
        where: { columnId: input.columnId },
      });
      return ctx.db.selectOption.create({
        data: {
          columnId: input.columnId,
          label: input.label,
          color: input.color,
          order: count,
        },
      });
    }),

  deleteSelectOption: publicProcedure
    .input(SelectOptionDeleteInput)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.selectOption.delete({ where: { id: input.optionId } });
      return { id: input.optionId };
    }),

  updateSelectOption: publicProcedure
    .input(SelectOptionUpdateInput)
    .output(SelectOptionOutput)
    .mutation(({ ctx, input }) =>
      ctx.db.selectOption.update({
        where: { id: input.optionId },
        data: { label: input.label, color: input.color },
      }),
    ),
};
