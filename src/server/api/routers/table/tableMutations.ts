import { Prisma } from "@prisma/client";
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
            ],
          },
          baseId: input.baseId,
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
          rows: {
            create: [
              { order: 0 },
              { order: 1 },
              { order: 2 },
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
      const [table, columnCount] = await Promise.all([
        ctx.db.table.findUnique({ where: { id: input.tableId }, select: { id: true } }),
        ctx.db.column.count({ where: { tableId: input.tableId } }),
      ]);

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

      const targetCellsPerBatch = 120_000;
      const rowBatchSize = columnCount
        ? Math.max(500, Math.min(10_000, Math.floor(targetCellsPerBatch / columnCount)))
        : 10_000;
      const tableHash = input.tableId.slice(-6);

      let inserted = 0;
      try {
        await ctx.db.$transaction(
          async (tx) => {
            for (let offset = 0; offset < input.count; offset += rowBatchSize) {
              const batchCount = Math.min(rowBatchSize, input.count - offset);
              const startOrder = baseOrder + offset;
              const endOrder = startOrder + batchCount - 1;

              await tx.$executeRaw`
                WITH inserted_rows AS (
                  INSERT INTO "Row" ("id", "tableId", "order", "createdAt", "updatedAt")
                  SELECT
                    CONCAT('r', ${tableHash}, TO_HEX(gs.order_value)),
                    ${input.tableId},
                    gs.order_value,
                    NOW(),
                    NOW()
                  FROM generate_series(${startOrder}, ${endOrder}) AS gs(order_value)
                  RETURNING id, "order"
                )
                INSERT INTO "Cell" ("id", "rowId", "columnId", "value", "createdAt", "updatedAt")
                SELECT
                  CONCAT('c', ${tableHash}, TO_HEX(r."order"), SUBSTRING(MD5(c.id), 1, 6)),
                  r.id,
                  c.id,
                  CASE
                    WHEN c."type" = 'CHECKBOX' THEN 'true'
                    WHEN c."type" = 'NUMBER' THEN '1'
                    WHEN c."type" = 'CURRENCY' THEN '1'
                    WHEN c."type" = 'PERCENT' THEN '1'
                    WHEN c."type" = 'RATING' THEN '1'
                    WHEN c."type" = 'DATE' THEN '2026-01-01'
                    WHEN c."type" = 'EMAIL' THEN 'a@b.co'
                    WHEN c."type" = 'URL' THEN 'https://x.co'
                    WHEN c."type" = 'PHONE' THEN '0'
                    WHEN c."type" = 'DURATION' THEN '1m'
                    WHEN c."type" = 'USER' THEN 'u'
                    WHEN c."type" = 'ATTACHMENT' THEN 'f'
                    WHEN c."type" = 'SINGLE_SELECT' THEN 'o1'
                    WHEN c."type" = 'MULTI_SELECT' THEN 'o1,o2'
                    ELSE 'x'
                  END,
                  NOW(),
                  NOW()
                FROM inserted_rows r
                CROSS JOIN "Column" c
                WHERE c."tableId" = ${input.tableId}
              `;

              inserted += batchCount;
            }
          },
          { timeout: 15 * 60 * 1000, maxWait: 10 * 1000 },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          const message = error.message ?? "";
          if (message.includes("53100")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Database storage limit reached while adding rows. Increase DB storage or reduce the stress-test size.",
            });
          }
        }
        throw error;
      }

      return { inserted };
    }),
};
