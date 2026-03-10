// src/server/api/root.ts
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { baseRouter } from "~/server/api/routers/base";
import { tableRouter } from "~/server/api/routers/table";

export const appRouter = createTRPCRouter({
  base: baseRouter,
  table: tableRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);