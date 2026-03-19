// src/server/api/routers/base.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { BaseWithTablesOutput, BaseOutput, BaseCreateInput, BaseRenameInput, BaseDeleteInput, BaseToggleStarInput, BaseMoveInput, BaseUpdateAppearanceInput } from "~/types/schemas";
import { z } from "zod";

const INCLUDE = {
  workspace: { select: { id: true, name: true } },
  tables: { include: { _count: { select: { rows: true } } } },
} as const;

export const baseRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.array(BaseWithTablesOutput))
    .query(({ ctx }) => ctx.db.base.findMany({
      include: INCLUDE,
      orderBy: [{ lastOpenedAt: "desc" }, { createdAt: "desc" }],
    })),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(BaseWithTablesOutput)
    .query(async ({ ctx, input }) => {
      // Record open time as side effect
      await ctx.db.base.update({
        where: { id: input.id },
        data: { lastOpenedAt: new Date() },
      }).catch(() => null); // silently ignore if not found yet

      const base = await ctx.db.base.findUnique({
        where: { id: input.id },
        include: INCLUDE,
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
        color: "#dc043b",
        workspaceId: input.workspaceId ?? null,
        lastOpenedAt: new Date(),
        tables: {
          create: {
            name: "Tasks",
            columns: {
              create: [
                { name: "Name", type: "TEXT", order: 0, width: 179 },
                { name: "Notes", type: "LONG_TEXT", order: 1, width: 179 },
                { name: "Assignee", type: "USER", order: 2, width: 179 },
                { name: "Status", type: "SINGLE_SELECT", order: 3, width: 179 },
                { name: "Attachments", type: "ATTACHMENT", order: 4, width: 179 },
                {
                  name: "Attachment Summary",
                  type: "LONG_TEXT",
                  order: 5,
                  width: 179,
                  description:
                    "An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary.",
                },
              ],
            },
            views: {
              create: [
                { name: "Grid view", type: "GRID", order: 0 },
              ],
            },
            rows: {
              create: [
                { order: 0 },
                { order: 1 },
                { order: 2 },
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

  moveToWorkspace: publicProcedure
    .input(BaseMoveInput)
    .output(BaseOutput)
    .mutation(({ ctx, input }) => ctx.db.base.update({ where: { id: input.id }, data: { workspaceId: input.workspaceId } })),

  updateAppearance: publicProcedure
    .input(BaseUpdateAppearanceInput)
    .output(BaseOutput)
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.base.update({ where: { id }, data });
    }),

  delete: publicProcedure
    .input(BaseDeleteInput)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!base) return { id: input.id };

      const ROW_BATCH_SIZE = 2_000;

      // Delete very large bases in batches to avoid long single-statement cascades timing out.
      while (true) {
        const rows = await ctx.db.row.findMany({
          where: { table: { baseId: input.id } },
          select: { id: true },
          take: ROW_BATCH_SIZE,
        });
        if (!rows.length) break;

        const rowIds = rows.map((r) => r.id);
        await ctx.db.$transaction(
          [
            ctx.db.cell.deleteMany({ where: { rowId: { in: rowIds } } }),
            ctx.db.row.deleteMany({ where: { id: { in: rowIds } } }),
          ],
        );
      }

      await ctx.db.$transaction([
        ctx.db.selectOption.deleteMany({
          where: { column: { table: { baseId: input.id } } },
        }),
        ctx.db.column.deleteMany({ where: { table: { baseId: input.id } } }),
        ctx.db.view.deleteMany({ where: { table: { baseId: input.id } } }),
        ctx.db.table.deleteMany({ where: { baseId: input.id } }),
        ctx.db.base.delete({ where: { id: input.id } }),
      ]);

      return { id: input.id };
    }),
});
