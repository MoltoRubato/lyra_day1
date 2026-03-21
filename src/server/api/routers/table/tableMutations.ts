import { Prisma } from "@prisma/client";
import type { ColumnType, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  loadAvailableColumnTypes,
  resolveSupportedColumnType,
} from "~/server/columnTypeCompat";
import {
  TableCreateInput,
  TableDeleteInput,
  TableOutput,
  TableRenameInput,
} from "~/types/schemas";

const FAKE_POOL_SIZE = 96;
const DEFAULT_STATUS_LABELS = [
  "Todo",
  "In progress",
  "Done",
];
const DEFAULT_STATUS_COLORS = ["#f7c6d6", "#f3dfab", "#bce8c2"];

function buildFakePools() {
  const taskTitles = Array.from({ length: FAKE_POOL_SIZE }, () => {
    const verb = faker.helpers.arrayElement([
      "Plan",
      "Review",
      "Draft",
      "Audit",
      "Finalize",
      "Coordinate",
      "Ship",
      "Refine",
    ]);
    return `${verb} ${faker.company.buzzPhrase()}`;
  });

  const people = Array.from({ length: FAKE_POOL_SIZE }, () => faker.person.fullName());
  const companies = Array.from({ length: FAKE_POOL_SIZE }, () => faker.company.name());
  const emailDomains = Array.from(
    { length: Math.max(24, Math.floor(FAKE_POOL_SIZE / 2)) },
    () => faker.internet.domainName().toLowerCase(),
  );
  const hosts = Array.from({ length: Math.max(24, Math.floor(FAKE_POOL_SIZE / 2)) }, () =>
    faker.internet.domainName().toLowerCase(),
  );
  const summarySnippets = Array.from({ length: Math.max(48, Math.floor(FAKE_POOL_SIZE / 2)) }, () =>
    faker.lorem.sentences({ min: 1, max: 2 }),
  );
  const noteSnippets = Array.from({ length: FAKE_POOL_SIZE }, () =>
    faker.lorem.sentence({ min: 8, max: 16 }),
  );
  const emailAddresses = Array.from({ length: FAKE_POOL_SIZE }, (_, index) => {
    const personSlug = people[index]!
      .toLowerCase()
      .replaceAll(/[^a-z0-9 ]/g, "")
      .trim()
      .replaceAll(/\s+/g, ".");
    return `${personSlug || `person${index + 1}`}${index % 100}@${emailDomains[index % emailDomains.length]!}`;
  });
  const websiteUrls = Array.from({ length: FAKE_POOL_SIZE }, (_, index) => {
    const titleSlug = taskTitles[index]!
      .toLowerCase()
      .replaceAll(/[^a-z0-9 ]/g, "")
      .trim()
      .replaceAll(/\s+/g, "-");
    return `https://${hosts[index % hosts.length]!}/${titleSlug || `task-${index + 1}`}`;
  });
  const phoneNumbers = Array.from({ length: FAKE_POOL_SIZE }, (_, index) => {
    return `+1 ${200 + (index % 700)}-${String(100 + ((index * 13) % 900)).padStart(3, "0")}-${String(1000 + ((index * 97) % 9000)).padStart(4, "0")}`;
  });
  const attachmentUrls = Array.from({ length: FAKE_POOL_SIZE }, (_, index) => {
    const companySlug = companies[index]!
      .toLowerCase()
      .replaceAll(/[^a-z0-9 ]/g, "")
      .trim()
      .replaceAll(/\s+/g, "-");
    return `https://files.example.com/${companySlug || `company-${index + 1}`}/brief-${(index % 500) + 1}.pdf`;
  });
  const durationLabels = Array.from({ length: FAKE_POOL_SIZE }, (_, index) => {
    return `${15 * (1 + (index % 24))}m`;
  });

  return {
    taskTitles,
    noteSnippets,
    people,
    companies,
    emailDomains,
    hosts,
    summarySnippets,
    emailAddresses,
    websiteUrls,
    phoneNumbers,
    attachmentUrls,
    durationLabels,
    plainLabels: DEFAULT_STATUS_LABELS,
  } as const;
}

function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function pickValue(values: readonly string[], hash: number) {
  return values[hash % values.length]!;
}

function makeSqliteCellValue(params: {
  columnType: ColumnType;
  columnName: string;
  primaryHash: number;
  secondaryHash: number;
  selectOptionLabels: string[];
  pools: ReturnType<typeof buildFakePools>;
}) {
  const {
    columnType,
    columnName,
    primaryHash,
    secondaryHash,
    selectOptionLabels,
    pools,
  } = params;
  const lowerName = columnName.toLowerCase();

  switch (columnType) {
    case "CHECKBOX":
      return primaryHash % 2 === 0 ? "true" : "false";
    case "NUMBER":
      return String(10 + (primaryHash % 4990));
    case "CURRENCY":
      return ((500 + (primaryHash % 125000)) / 100).toFixed(2);
    case "PERCENT":
      return String(primaryHash % 100);
    case "RATING":
      return String(1 + (primaryHash % 5));
    case "DATE": {
      const date = new Date(Date.UTC(2026, 0, 1) + (primaryHash % 365) * 86_400_000);
      return date.toISOString().slice(0, 10);
    }
    case "EMAIL":
      return `${pickValue(pools.people, primaryHash).toLowerCase().replaceAll(" ", ".")}${secondaryHash % 100}@${pickValue(pools.emailDomains, secondaryHash)}`;
    case "URL":
      return `https://${pickValue(pools.hosts, primaryHash)}/${pickValue(pools.taskTitles, secondaryHash).toLowerCase().replaceAll(" ", "-")}`;
    case "PHONE":
      return `+1 ${200 + (primaryHash % 700)}-${String(100 + (secondaryHash % 900)).padStart(3, "0")}-${String(1000 + (primaryHash % 9000)).padStart(4, "0")}`;
    case "DURATION":
      return `${15 * (1 + (primaryHash % 24))}m`;
    case "USER":
      return pickValue(pools.people, primaryHash);
    case "ATTACHMENT":
      return `https://files.example.com/${pickValue(pools.companies, primaryHash).toLowerCase().replaceAll(" ", "-")}/brief-${secondaryHash % 500}.pdf`;
    case "SINGLE_SELECT":
      if (selectOptionLabels.length > 0) {
        return pickValue(selectOptionLabels, primaryHash);
      }
      return pickValue(pools.plainLabels, primaryHash);
    case "MULTI_SELECT":
      if (selectOptionLabels.length >= 2) {
        return `${pickValue(selectOptionLabels, primaryHash)},${pickValue(selectOptionLabels, secondaryHash)}`;
      }
      if (selectOptionLabels.length === 1) return selectOptionLabels[0]!;
      return `${pickValue(pools.plainLabels, primaryHash)},${pickValue(pools.plainLabels, secondaryHash)}`;
    case "LONG_TEXT":
      if (lowerName.includes("summary")) {
        return pickValue(pools.summarySnippets, primaryHash);
      }
      return `${pickValue(pools.noteSnippets, primaryHash)} ${pickValue(pools.noteSnippets, secondaryHash)}`;
    default:
      if (lowerName.includes("name")) return pickValue(pools.taskTitles, primaryHash);
      if (lowerName.includes("assignee") || lowerName.includes("owner")) {
        return pickValue(pools.people, primaryHash);
      }
      if (lowerName.includes("company") || lowerName.includes("account")) {
        return pickValue(pools.companies, primaryHash);
      }
      return pickValue(pools.noteSnippets, primaryHash);
  }
}

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
      const fakePools = buildFakePools();

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
                    const primaryHash = stableHash(`${rowId}:${column.id}:primary`);
                    const secondaryHash = stableHash(`${rowId}:${column.id}:secondary`);
                    const value = makeSqliteCellValue({
                      columnType: column.type,
                      columnName: column.name,
                      primaryHash,
                      secondaryHash,
                      selectOptionLabels: column.selectOptions.map((option) => option.label),
                      pools: fakePools,
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

          return { inserted };
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

      return { inserted };
    }),
};
