// src/server/api/routers/table.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ColumnType } from "@prisma/client";

export const tableRouter = createTRPCRouter({
  // Fetch a full table: its columns + rows with cells
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          columns: { orderBy: { order: "asc" } },
          rows: {
            orderBy: { order: "asc" },
            include: { cells: true },
          },
        },
      });
    }),

  // Create a new table inside a base (with default columns)
  create: publicProcedure
    .input(z.object({ baseId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
          columns: {
            create: [
              { name: "Name",   type: "TEXT", order: 0 },
              { name: "Notes",  type: "TEXT", order: 1 },
              { name: "Status", type: "TEXT", order: 2 },
            ],
          },
        },
      });
    }),

  // Rename a table
  renameTable: publicProcedure
    .input(z.object({ tableId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.update({
        where: { id: input.tableId },
        data: { name: input.name },
      });
    }),

  // Delete a table (cascades to columns, rows, cells via schema)
  deleteTable: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.table.delete({ where: { id: input.tableId } });
    }),

  // Add a new column to a table
  addColumn: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        type: z.nativeEnum(ColumnType).default("TEXT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

  // Delete a column (cascades to cells via schema)
  deleteColumn: publicProcedure
    .input(z.object({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.column.delete({ where: { id: input.columnId } });
    }),

  // Rename a column
  renameColumn: publicProcedure
    .input(z.object({ columnId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.column.update({
        where: { id: input.columnId },
        data: { name: input.name },
      });
    }),

  // Add a new row (creates empty cells for every existing column)
  addRow: publicProcedure
    .input(z.object({ tableId: z.string() }))
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
      return row;
    }),

  // Delete a row (cascades to cells via schema)
  deleteRow: publicProcedure
    .input(z.object({ rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.row.delete({ where: { id: input.rowId } });
    }),

  // Update a single cell value
  updateCell: publicProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cell.upsert({
        where: {
          rowId_columnId: {
            rowId: input.rowId,
            columnId: input.columnId,
          },
        },
        update: { value: input.value },
        create: {
          rowId: input.rowId,
          columnId: input.columnId,
          value: input.value,
        },
      });
    }),
});