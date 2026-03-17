import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  RowOutput,
  TableGetByIdInput,
  TableWithDataOutput,
} from "~/types/schemas";

export const tableQueryProcedures = {
  getById: publicProcedure
    .input(TableGetByIdInput)
    .output(TableWithDataOutput)
    .query(async ({ ctx, input }) => {
      const ROW_LIMIT = 500;

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
        take: z.number().int().min(1).max(5000),
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
};
