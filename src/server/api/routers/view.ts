// src/server/api/routers/view.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import {
  ViewOutput, ViewCreateInput, ViewRenameInput,
  ViewDeleteInput, ViewUpdateConfigInput, ViewReorderInput,
} from "~/types/schemas";

export const viewRouter = createTRPCRouter({

  // All views for a table, ordered
  getByTableId: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .output(z.array(ViewOutput))
    .query(({ ctx, input }) =>
      ctx.db.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      })
    ),

  create: publicProcedure
    .input(ViewCreateInput)
    .output(ViewOutput)
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.view.count({ where: { tableId: input.tableId } });
      return ctx.db.view.create({
        data: { tableId: input.tableId, name: input.name, type: input.type, order: count },
      });
    }),

  rename: publicProcedure
    .input(ViewRenameInput)
    .output(ViewOutput)
    .mutation(({ ctx, input }) =>
      ctx.db.view.update({ where: { id: input.viewId }, data: { name: input.name } })
    ),

  // Persists the group-by column for a view — called when the user changes the toolbar picker
  updateConfig: publicProcedure
    .input(ViewUpdateConfigInput)
    .output(ViewOutput)
    .mutation(({ ctx, input }) =>
      ctx.db.view.update({
        where: { id: input.viewId },
        data: { groupByColumnId: input.groupByColumnId },
      })
    ),

  delete: publicProcedure
    .input(ViewDeleteInput)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.view.count({ where: { tableId: (await ctx.db.view.findUnique({ where: { id: input.viewId }, select: { tableId: true } }))!.tableId } });
      if (count <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last view." });
      await ctx.db.view.delete({ where: { id: input.viewId } });
      return { id: input.viewId };
    }),

  reorder: publicProcedure
    .input(ViewReorderInput)
    .output(z.array(ViewOutput))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.orderedIds.map((id, index) => ctx.db.view.update({ where: { id }, data: { order: index } }))
      );
      return ctx.db.view.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
    }),
});