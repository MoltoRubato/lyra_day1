// src/server/api/routers/base.ts
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { BaseWithTablesOutput, BaseOutput, BaseCreateInput, BaseRenameInput, BaseDeleteInput, BaseToggleStarInput, BaseMoveInput, BaseUpdateAppearanceInput } from "~/types/schemas";
import {
  loadAvailableColumnTypes,
  resolveSupportedColumnType,
} from "~/server/columnTypeCompat";
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
    .mutation(async ({ ctx, input }) => {
      const availableTypes = await loadAvailableColumnTypes(ctx.db);
      const longTextType = resolveSupportedColumnType("LONG_TEXT", availableTypes);
      const userType = resolveSupportedColumnType("USER", availableTypes);

      return ctx.db.base.create({
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
                  { name: "Notes", type: longTextType, order: 1, width: 179 },
                  { name: "Assignee", type: userType, order: 2, width: 179 },
                  {
                    name: "Status",
                    type: "SINGLE_SELECT",
                    order: 3,
                    width: 179,
                    selectOptions: {
                      create: [
                        { label: "Todo", color: "#f7c6d6", order: 0 },
                        { label: "In progress", color: "#f3dfab", order: 1 },
                        { label: "Done", color: "#bce8c2", order: 2 },
                      ],
                    },
                  },
                  { name: "Attachments", type: "ATTACHMENT", order: 4, width: 179 },
                  {
                    name: "Attachment Summary",
                    type: longTextType,
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
      });
    }),

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

      const ROW_BATCH_SIZE = 5_000;
      const tableIds = (
        await ctx.db.table.findMany({
          where: { baseId: input.id },
          select: { id: true },
        })
      ).map((table) => table.id);

      // Drain rows in batches to keep each statement bounded for very large bases.
      // Row -> Cell is ON DELETE CASCADE, so explicit cell deletes are unnecessary.
      if (tableIds.length > 0) {
        while (true) {
          const rows = await ctx.db.row.findMany({
            where: { tableId: { in: tableIds } },
            select: { id: true },
            orderBy: { id: "asc" },
            take: ROW_BATCH_SIZE,
          });
          if (rows.length === 0) break;
          await ctx.db.row.deleteMany({
            where: { id: { in: rows.map((row) => row.id) } },
          });
        }
      }

      // Let FK cascades clean up remaining table/column/view/select-option records.
      await ctx.db.base.delete({ where: { id: input.id } });

      return { id: input.id };
    }),
});
