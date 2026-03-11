// src/server/api/routers/base.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { BaseWithTablesOutput, BaseOutput, BaseCreateInput, BaseRenameInput, BaseDeleteInput, BaseToggleStarInput } from "~/types/schemas";
import { z } from "zod";

export const baseRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.array(BaseWithTablesOutput))
    .query(({ ctx }) => ctx.db.base.findMany({
      include: { tables: { include: { _count: { select: { rows: true } } } } },
      orderBy: { createdAt: "asc" },
    })),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(BaseWithTablesOutput)
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: { id: input.id },
        include: { tables: { include: { _count: { select: { rows: true } } } } },
      });
      if (!base) throw new TRPCError({ code: "NOT_FOUND", message: `Base "${input.id}" not found` });
      return base;
    }),

  create: publicProcedure
    .input(BaseCreateInput)
    .output(BaseOutput)
    .mutation(({ ctx, input }) => ctx.db.base.create({
      data: {
        name: input.name,
        tables: {
          create: {
            name: "Tasks",
            columns: {
              create: [
                { name: "Name",   type: "TEXT",          order: 0, width: 240 },
                { name: "Status", type: "SINGLE_SELECT", order: 1, width: 160 },
                { name: "Notes",  type: "TEXT",          order: 2, width: 200 },
              ],
            },
            views: {
              create: [
                { name: "Grid view",   type: "GRID",   order: 0 },
                { name: "Kanban view", type: "KANBAN", order: 1 },
              ],
            },
          },
        },
      },
    })),

  rename: publicProcedure
    .input(BaseRenameInput)
    .output(BaseOutput)
    .mutation(({ ctx, input }) => ctx.db.base.update({ where: { id: input.id }, data: { name: input.name } })),

  toggleStar: publicProcedure
    .input(BaseToggleStarInput)
    .output(BaseOutput)
    .mutation(({ ctx, input }) => ctx.db.base.update({ where: { id: input.id }, data: { starred: input.starred } })),

  delete: publicProcedure
    .input(BaseDeleteInput)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.base.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});