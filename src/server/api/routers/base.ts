// src/server/api/routers/base.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  BaseWithTablesOutput,
  BaseOutput,
  BaseCreateInput,
  BaseRenameInput,
  BaseDeleteInput,
} from "~/types/schemas";
import { z } from "zod";

export const baseRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.array(BaseWithTablesOutput))
    .query(async ({ ctx }) => {
      return ctx.db.base.findMany({
        include: {
          tables: {
            include: { _count: { select: { rows: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(BaseWithTablesOutput)
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: { id: input.id },
        include: {
          tables: {
            include: { _count: { select: { rows: true } } },
          },
        },
      });
      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Base with id "${input.id}" not found`,
        });
      }
      return base;
    }),

  create: publicProcedure
    .input(BaseCreateInput)
    .output(BaseOutput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.base.create({
        data: {
          name: input.name,
          tables: {
            create: {
              name: "Tasks",
              columns: {
                create: [
                  { name: "Name",   type: "TEXT", order: 0 },
                  { name: "Notes",  type: "TEXT", order: 1 },
                  { name: "Status", type: "TEXT", order: 2 },
                ],
              },
            },
          },
        },
      });
    }),

  rename: publicProcedure
    .input(BaseRenameInput)
    .output(BaseOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.base.findUnique({ where: { id: input.id } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Base with id "${input.id}" not found`,
        });
      }
      return ctx.db.base.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: publicProcedure
    .input(BaseDeleteInput)
    .output(BaseOutput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.base.findUnique({ where: { id: input.id } });
      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Base with id "${input.id}" not found`,
        });
      }
      return ctx.db.base.delete({ where: { id: input.id } });
    }),
});