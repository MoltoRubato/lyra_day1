// src/server/api/routers/workspace.ts
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { WorkspaceOutput, WorkspaceCreateInput, WorkspaceRenameInput, WorkspaceDescriptionInput, WorkspaceToggleStarInput, WorkspaceDeleteInput } from "~/types/schemas";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const INCLUDE = Prisma.validator<Prisma.WorkspaceInclude>()({
  bases: {
    include: {
      tables: { include: { _count: { select: { rows: true } } } },
    },
    orderBy: [{ lastOpenedAt: "desc" }, { createdAt: "desc" }],
  },
});

export const workspaceRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.array(WorkspaceOutput))
    .query(({ ctx }) => ctx.db.workspace.findMany({ include: INCLUDE, orderBy: { createdAt: "asc" } })),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .output(WorkspaceOutput)
    .query(({ ctx, input }) => ctx.db.workspace.findUniqueOrThrow({
      where: { id: input.id },
      include: INCLUDE,
    })),

  create: publicProcedure
    .input(WorkspaceCreateInput)
    .output(WorkspaceOutput)
    .mutation(({ ctx, input }) => ctx.db.workspace.create({
      data: { name: input.name, description: input.description ?? null },
      include: INCLUDE,
    })),

  rename: publicProcedure
    .input(WorkspaceRenameInput)
    .output(WorkspaceOutput)
    .mutation(({ ctx, input }) => ctx.db.workspace.update({
      where: { id: input.id }, data: { name: input.name }, include: INCLUDE,
    })),

  updateDescription: publicProcedure
    .input(WorkspaceDescriptionInput)
    .output(WorkspaceOutput)
    .mutation(({ ctx, input }) => ctx.db.workspace.update({
      where: { id: input.id }, data: { description: input.description }, include: INCLUDE,
    })),

  toggleStar: publicProcedure
    .input(WorkspaceToggleStarInput)
    .output(WorkspaceOutput)
    .mutation(({ ctx, input }) => ctx.db.workspace.update({
      where: { id: input.id }, data: { starred: input.starred }, include: INCLUDE,
    })),

  delete: publicProcedure
    .input(WorkspaceDeleteInput)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unlink bases first (SetNull via Prisma referential actions, but explicit is safer)
      await ctx.db.base.updateMany({ where: { workspaceId: input.id }, data: { workspaceId: null } });
      await ctx.db.workspace.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});
