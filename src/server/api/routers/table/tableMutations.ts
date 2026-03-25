import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  loadAvailableColumnTypes,
  resolveSupportedColumnType,
} from "~/server/columnTypeCompat";
import {
  makeGeneratedCellValue,
  stableHash,
} from "~/shared/generatedCellValues";
import {
  TableCreateInput,
  TableDeleteInput,
  TableOutput,
  TableRenameInput,
} from "~/types/schemas";
const DEFAULT_STATUS_LABELS = [
  "Todo",
  "In progress",
  "Done",
];
const DEFAULT_STATUS_COLORS = ["#f7c6d6", "#f3dfab", "#bce8c2"];

async function ensureDefaultSelectOptions(params: {
  db: PrismaClient;
  tableId: string;
}) {
  const selectColumns = await params.db.column.findMany({
    where: {
      tableId: params.tableId,
      type: { in: ["SINGLE_SELECT", "MULTI_SELECT"] },
    },
    select: {
      id: true,
      selectOptions: {
        select: { id: true },
        take: 1,
      },
    },
  });

  const emptyColumns = selectColumns.filter((column) => column.selectOptions.length === 0);
  if (!emptyColumns.length) return;

  await Promise.all(
    emptyColumns.map((column) =>
      params.db.selectOption.createMany({
        data: DEFAULT_STATUS_LABELS.map((label, index) => ({
          columnId: column.id,
          label,
          color: DEFAULT_STATUS_COLORS[index] ?? "#f7c6d6",
          order: index,
        })),
      }),
    ),
  );
}

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

      const availableTypes = await loadAvailableColumnTypes(ctx.db);
      const longTextType = resolveSupportedColumnType("LONG_TEXT", availableTypes);
      const userType = resolveSupportedColumnType("USER", availableTypes);

      return ctx.db.table.create({
        data: {
          name: input.name,
          views: {
            create: [{ name: "Grid view", type: "GRID", order: 0 }],
          },
          baseId: input.baseId,
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
                  create: DEFAULT_STATUS_LABELS.map((label, index) => ({
                    label,
                    color: DEFAULT_STATUS_COLORS[index] ?? "#f7c6d6",
                    order: index,
                  })),
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
          rows: {
            create: [{ order: 0 }, { order: 1 }, { order: 2 }],
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
    .output(z.object({ inserted: z.number(), startOrder: z.number().int() }))
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

      await ensureDefaultSelectOptions({ db: ctx.db, tableId: input.tableId });

      const maxOrder = await ctx.db.row.aggregate({
        where: { tableId: input.tableId },
        _max: { order: true },
      });
      const baseOrder = (maxOrder._max.order ?? -1) + 1;
      const isSqlite = process.env.DATABASE_URL?.startsWith("file:") ?? false;

      const rowBatchSize = isSqlite
        ? columnCount
          ? Math.max(100, Math.min(1_000, Math.floor(12_000 / columnCount)))
          : 1_000
        : 100_000;
      const tableHash = input.tableId.slice(-6);

      let inserted = 0;
      try {
        if (isSqlite) {
          await ctx.db.$transaction(
            async (tx) => {
              const columns = await tx.column.findMany({
                where: { tableId: input.tableId },
                select: {
                  id: true,
                  name: true,
                  type: true,
                  selectOptions: {
                    select: { label: true },
                    orderBy: { order: "asc" },
                  },
                },
                orderBy: { order: "asc" },
              });

              for (let offset = 0; offset < input.count; offset += rowBatchSize) {
                const batchCount = Math.min(rowBatchSize, input.count - offset);
                const rowsData: Array<{
                  id: string;
                  tableId: string;
                  order: number;
                  createdAt: Date;
                  updatedAt: Date;
                }> = [];
                const cellsData: Array<{
                  id: string;
                  rowId: string;
                  columnId: string;
                  value: string | null;
                  createdAt: Date;
                  updatedAt: Date;
                }> = [];
                const now = new Date();

                for (let i = 0; i < batchCount; i += 1) {
                  const rowOrder = baseOrder + offset + i;
                  const rowId = `r${tableHash}${rowOrder.toString(16)}`;
                  rowsData.push({
                    id: rowId,
                    tableId: input.tableId,
                    order: rowOrder,
                    createdAt: now,
                    updatedAt: now,
                  });

                  for (const column of columns) {
                    const value = makeGeneratedCellValue({
                      columnType: column.type,
                      columnName: column.name,
                      rowId,
                      columnId: column.id,
                      selectOptionLabels: column.selectOptions.map((option) => option.label),
                    });
                    cellsData.push({
                      id: `c${tableHash}${rowOrder.toString(16)}${stableHash(column.id).toString(16).slice(0, 6)}`,
                      rowId,
                      columnId: column.id,
                      value,
                      createdAt: now,
                      updatedAt: now,
                    });
                  }
                }

                await tx.row.createMany({ data: rowsData });
                if (cellsData.length > 0) {
                  await tx.cell.createMany({ data: cellsData });
                }
                inserted += batchCount;
              }
            },
            { timeout: 15 * 60 * 1000, maxWait: 10 * 1000 },
          );

          return { inserted, startOrder: baseOrder };
        }

        await ctx.db.$transaction(
          async (tx) => {
            await tx.$executeRaw`SET LOCAL synchronous_commit = OFF`;
            await tx.$executeRaw`SET LOCAL jit = OFF`;
            for (let offset = 0; offset < input.count; offset += rowBatchSize) {
              const batchCount = Math.min(rowBatchSize, input.count - offset);
              const startOrder = baseOrder + offset;
              const endOrder = startOrder + batchCount - 1;

              await tx.$executeRaw`
                INSERT INTO "Row" ("id", "tableId", "order", "createdAt", "updatedAt")
                SELECT
                  CONCAT('r', ${tableHash}, TO_HEX(gs.order_value)),
                  ${input.tableId},
                  gs.order_value,
                  NOW(),
                  NOW()
                FROM generate_series(${startOrder}, ${endOrder}) AS gs(order_value)
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

      return { inserted, startOrder: baseOrder };
    }),
};
