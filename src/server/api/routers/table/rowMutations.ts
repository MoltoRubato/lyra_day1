import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { publicProcedure } from "~/server/api/trpc";
import {
  loadAvailableColumnTypes,
  resolveSupportedColumnType,
} from "~/server/columnTypeCompat";
import { isPrimaryFieldSupportedType } from "~/shared/primaryField";
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

async function insertEmptyRowAt(
  db: PrismaClient,
  tableId: string,
  insertOrder: number,
) {
  return db.$transaction(async (tx) => {
    await tx.row.updateMany({
      where: { tableId, order: { gte: insertOrder } },
      data: { order: { increment: 1 } },
    });
    const row = await tx.row.create({
      data: { tableId, order: insertOrder },
      include: { cells: true },
    });
    const columns = await tx.column.findMany({
      where: { tableId },
      select: { id: true },
    });
    if (columns.length > 0) {
      await tx.cell.createMany({
        data: columns.map((col) => ({
          rowId: row.id,
          columnId: col.id,
          value: null,
        })),
      });
    }
    const result = await tx.row.findUnique({
      where: { id: row.id },
      include: { cells: true },
    });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return result;
  });
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
      const columnIds = [...new Set(input.columnUpdates.map((update) => update.columnId))];
      const availableTypes =
        input.columnUpdates.some((update) => update.type != null)
          ? await loadAvailableColumnTypes(ctx.db)
          : null;

      await ctx.db.$transaction(async (tx) => {
        const existingColumns =
          columnIds.length > 0
            ? await tx.column.findMany({
                where: { id: { in: columnIds } },
                select: {
                  id: true,
                  order: true,
                  type: true,
                  selectOptions: {
                    select: {
                      label: true,
                      color: true,
                    },
                    orderBy: { order: "asc" },
                  },
                },
              })
            : [];

        const columnById = new Map(
          existingColumns.map((column) => [column.id, column]),
        );

        for (const columnUpdate of input.columnUpdates) {
          const existingColumn = columnById.get(columnUpdate.columnId);
          if (!existingColumn) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Column "${columnUpdate.columnId}" not found`,
            });
          }

          const nextType = columnUpdate.type
            ? resolveSupportedColumnType(columnUpdate.type, availableTypes)
            : existingColumn.type;

          if (
            columnUpdate.type &&
            existingColumn.order === 0 &&
            !isPrimaryFieldSupportedType(nextType)
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Primary field cannot be changed to that type.",
            });
          }

          if (columnUpdate.type && existingColumn.type !== nextType) {
            await tx.column.update({
              where: { id: existingColumn.id },
              data: { type: nextType },
            });
            existingColumn.type = nextType;
          }

          if (
            columnUpdate.ensureOptions.length > 0 &&
            (existingColumn.type === "SINGLE_SELECT" ||
              existingColumn.type === "MULTI_SELECT")
          ) {
            const existingLabels = new Set(
              existingColumn.selectOptions.map((option) => option.label),
            );
            let nextOrder = existingColumn.selectOptions.length;

            for (const option of columnUpdate.ensureOptions) {
              if (existingLabels.has(option.label)) continue;
              await tx.selectOption.create({
                data: {
                  columnId: existingColumn.id,
                  label: option.label,
                  color: option.color ?? "#166254",
                  order: nextOrder,
                },
              });
              existingLabels.add(option.label);
              existingColumn.selectOptions.push({
                label: option.label,
                color: option.color ?? "#166254",
              });
              nextOrder += 1;
            }
          }
        }

        await Promise.all(
          input.updates.map((u) =>
            tx.cell.upsert({
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
      });
      return { count: input.updates.length };
    }),
};
