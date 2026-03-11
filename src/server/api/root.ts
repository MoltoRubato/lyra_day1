// src/server/api/root.ts
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { baseRouter }      from "~/server/api/routers/base";
import { tableRouter }     from "~/server/api/routers/table";
import { viewRouter }      from "~/server/api/routers/view";
import { workspaceRouter } from "~/server/api/routers/workspace";

export const appRouter = createTRPCRouter({
  base:      baseRouter,
  table:     tableRouter,
  view:      viewRouter,
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);