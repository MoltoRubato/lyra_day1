// src/server/api/routers/base.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.base.findMany({
      include: {
        tables: {
          include: {
            _count: { select: { rows: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.base.findUnique({
        where: { id: input.id },
        include: {
          tables: {
            include: {
              _count: { select: { rows: true } },
            },
          },
        },
      });
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
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
        include: { tables: true },
      });
    }),

  rename: publicProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.base.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.base.delete({ where: { id: input.id } });
    }),
});