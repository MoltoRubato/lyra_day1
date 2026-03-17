import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  TableCreateInput,
  TableDeleteInput,
  TableOutput,
  TableRenameInput,
} from "~/types/schemas";

export const tableMutationProcedures = {
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
              { name: "Grid view", type: "GRID", order: 0 },
              { name: "Kanban view", type: "KANBAN", order: 1 },
            ],
          },
          baseId: input.baseId,
          columns: {
            create: [
              { name: "Name", type: "TEXT", order: 0 },
              { name: "Notes", type: "TEXT", order: 1 },
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

  bulkAddRows: publicProcedure
    .input(z.object({ tableId: z.string(), count: z.number().min(1).max(100000) }))
    .output(z.object({ inserted: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({ where: { id: input.tableId } });
      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table "${input.tableId}" not found`,
        });
      }

      const maxOrder = await ctx.db.row.aggregate({
        where: { tableId: input.tableId },
        _max: { order: true },
      });
      const baseOrder = (maxOrder._max.order ?? -1) + 1;

      const BATCH = 10_000;
      let inserted = 0;
      for (let offset = 0; offset < input.count; offset += BATCH) {
        const batchCount = Math.min(BATCH, input.count - offset);
        await ctx.db.row.createMany({
          data: Array.from({ length: batchCount }, (_, i) => ({
            tableId: input.tableId,
            order: baseOrder + offset + i,
          })),
        });
        inserted += batchCount;
      }

      return { inserted };
    }),
};
