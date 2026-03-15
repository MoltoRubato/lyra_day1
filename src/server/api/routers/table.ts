// src/server/api/routers/table.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  TableWithDataOutput,
  TableOutput,
  ColumnOutput,
  RowOutput,
  CellOutput,
  TableCreateInput,
  TableRenameInput,
  TableDeleteInput,
  ColumnAddInput,
  ColumnDeleteInput,
  ColumnRenameInput,
  CellUpdateInput,
  RowAddInput,
  RowDeleteInput,
  BulkDeleteRowsInput,
  TableGetByIdInput,
  ColumnChangeTypeInput,
  ColumnReorderInput,
  ColumnResizeInput,
  SelectOptionOutput,
  SelectOptionAddInput,
  SelectOptionDeleteInput,
  SelectOptionUpdateInput,
} from "~/types/schemas";
import { z } from "zod";

export const tableRouter = createTRPCRouter({

  // ── Queries ────────────────────────────────────────────────────────────────

  getById: publicProcedure
    .input(TableGetByIdInput)
    .output(TableWithDataOutput)
    .query(async ({ ctx, input }) => {
      // Cap rows returned to prevent huge payloads at scale.
      // rowCount tells the client how many rows actually exist.
      const ROW_LIMIT = 500;

      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { rows: true } },
          columns: { orderBy: { order: "asc" }, include: { selectOptions: { orderBy: { order: "asc" } } } },
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
          if (col?.type === "NUMBER") return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
          return dir * av.localeCompare(bv);
        });
      }

      return { ...table, rows, rowCount: table._count.rows };
    }),

  // ── Table mutations ────────────────────────────────────────────────────────

  create: publicProcedure
    .input(TableCreateInput)
    .output(TableOutput)
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({ where: { id: input.baseId } });
      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Base with id "${input.baseId}" not found`,
        });
      }
      return ctx.db.table.create({
        data: {
          name: input.name,
          views: {
            create: [
              { name: "Grid view",   type: "GRID",   order: 0 },
              { name: "Kanban view", type: "KANBAN", order: 1 },
            ],
          },
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

  renameTable: publicProcedure
    .input(TableRenameInput)
    .output(TableOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.table.findUnique({ where: { id: input.tableId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table with id "${input.tableId}" not found`,
        });
      }
      return ctx.db.table.update({
        where: { id: input.tableId },
        data: { name: input.name },
      });
    }),

  deleteTable: publicProcedure
    .input(TableDeleteInput)
    .output(TableOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.table.findUnique({ where: { id: input.tableId } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table with id "${input.tableId}" not found`,
        });
      }
      return ctx.db.table.delete({ where: { id: input.tableId } });
    }),

  // ── Column mutations ───────────────────────────────────────────────────────

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
      // Backfill empty cells for all existing rows
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

  // ── Row mutations ──────────────────────────────────────────────────────────

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
      // Re-fetch with cells populated
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

  // Stretch: bulk delete multiple rows at once
  bulkDeleteRows: publicProcedure
    .input(BulkDeleteRowsInput)
    .output(z.object({ deletedCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.row.deleteMany({
        where: { id: { in: input.rowIds } },
      });
      return { deletedCount: result.count };
    }),

  // ── Cell mutations ─────────────────────────────────────────────────────────

  updateCell: publicProcedure
    .input(CellUpdateInput)
    .output(CellOutput)
    .mutation(async ({ ctx, input }) => {
      // Verify the row and column both exist
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
        where: { rowId_columnId: { rowId: input.rowId, columnId: input.columnId } },
        update: { value: input.value },
        create: { rowId: input.rowId, columnId: input.columnId, value: input.value },
      });
    }),

  // Change a column's field type
  changeColumnType: publicProcedure
    .input(ColumnChangeTypeInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!exists) throw new TRPCError({ code: "NOT_FOUND", message: `Column "${input.columnId}" not found` });
      return ctx.db.column.update({ where: { id: input.columnId }, data: { type: input.type } });
    }),

  // Reorder columns — client sends the full ordered array of IDs
  reorderColumns: publicProcedure
    .input(ColumnReorderInput)
    .output(z.array(ColumnOutput))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.orderedIds.map((id, index) =>
          ctx.db.column.update({ where: { id }, data: { order: index } })
        )
      );
      return ctx.db.column.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
    }),

  // Persist column width after user finishes dragging the resize handle
  resizeColumn: publicProcedure
    .input(ColumnResizeInput)
    .output(ColumnOutput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.column.update({ where: { id: input.columnId }, data: { width: input.width } });
    }),

  // ── Select option management ───────────────────────────────────────────────

  addSelectOption: publicProcedure
    .input(SelectOptionAddInput)
    .output(SelectOptionOutput)
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.selectOption.count({ where: { columnId: input.columnId } });
      return ctx.db.selectOption.create({
        data: { columnId: input.columnId, label: input.label, color: input.color, order: count },
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
    .mutation(({ ctx, input }) => ctx.db.selectOption.update({
      where: { id: input.optionId },
      data: { label: input.label, color: input.color },
    })),

  // ── Paginated row fetching ─────────────────────────────────────────────────
  // Used by GridView to progressively load rows beyond the initial 500 cap.
  getRows: publicProcedure
    .input(z.object({ tableId: z.string(), skip: z.number().int().min(0), take: z.number().int().min(1).max(5000) }))
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

  // ── Bulk row insertion (dev/load-test) ─────────────────────────────────────
  // Inserts N empty rows using createMany — no cells are created, getCellValue
  // gracefully returns "" for missing cells, so the grid still renders fine.
  bulkAddRows: publicProcedure
    .input(z.object({ tableId: z.string(), count: z.number().min(1).max(100000) }))
    .output(z.object({ inserted: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({ where: { id: input.tableId } });
      if (!table) throw new TRPCError({ code: "NOT_FOUND", message: `Table "${input.tableId}" not found` });

      const maxOrder = await ctx.db.row.aggregate({
        where: { tableId: input.tableId },
        _max: { order: true },
      });
      const baseOrder = (maxOrder._max.order ?? -1) + 1;

      // Insert in chunks of 10 000 to stay within SQLite variable limits
      const BATCH = 10_000;
      let inserted = 0;
      for (let offset = 0; offset < input.count; offset += BATCH) {
        const batchCount = Math.min(BATCH, input.count - offset);
        await ctx.db.row.createMany({
          data: Array.from({ length: batchCount }, (_, i) => ({
            tableId: input.tableId,
            order:   baseOrder + offset + i,
          })),
        });
        inserted += batchCount;
      }
      return { inserted };
    }),

});
