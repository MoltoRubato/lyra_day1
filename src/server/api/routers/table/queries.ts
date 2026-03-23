import { TRPCError } from "@trpc/server";
import type { ColumnType, PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import {
  PreloadValueBatchOutput,
  RowOutput,
  TableGetByIdInput,
  TableWithDataOutput,
} from "~/types/schemas";
type PreloadValueBatch = z.infer<typeof PreloadValueBatchOutput>;
type GeneratedColumnMeta = {
  id: string;
  type: ColumnType;
  selectOptionLabels: string[];
  hash: number;
  isSummary: boolean;
  isNameLike: boolean;
  isAssigneeLike: boolean;
  isCompanyLike: boolean;
};
type TableRowWithCells = {
  id: string;
  tableId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  cells: Array<{
    id: string;
    value: string | null;
    rowId: string;
    columnId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

const GENERATED_ROW_ID_RE = /^r[a-z0-9]{6}[0-9a-f]+$/i;
const GENERATED_POOL_SIZE = 96;
const GENERATED_STATUS_LABELS = ["Todo", "In progress", "Done"];

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

function buildGeneratedPools() {
  const taskTitles = Array.from({ length: GENERATED_POOL_SIZE }, () =>
    faker.word.words({ count: { min: 2, max: 4 } }),
  );
  const people = Array.from({ length: GENERATED_POOL_SIZE }, () =>
    faker.person.fullName(),
  );
  const companies = Array.from({ length: GENERATED_POOL_SIZE }, () =>
    faker.company.name(),
  );
  const emailDomains = Array.from(
    { length: Math.max(24, Math.floor(GENERATED_POOL_SIZE / 2)) },
    () => faker.internet.domainName().toLowerCase(),
  );
  const hosts = Array.from(
    { length: Math.max(24, Math.floor(GENERATED_POOL_SIZE / 2)) },
    () => faker.internet.domainName().toLowerCase(),
  );
  const noteSnippets = Array.from({ length: GENERATED_POOL_SIZE }, () =>
    faker.word.words({ count: { min: 4, max: 8 } }),
  );
  const summarySnippets = Array.from(
    { length: Math.max(48, Math.floor(GENERATED_POOL_SIZE / 2)) },
    () => faker.word.words({ count: { min: 8, max: 12 } }),
  );
  const emailAddresses = Array.from(
    { length: GENERATED_POOL_SIZE },
    (_, index) => {
      const personSlug = people[index]!.toLowerCase()
        .replaceAll(/[^a-z0-9 ]/g, "")
        .trim()
        .replaceAll(/\s+/g, ".");
      return `${personSlug || `person${index + 1}`}${index % 100}@${emailDomains[index % emailDomains.length]!}`;
    },
  );
  const websiteUrls = Array.from(
    { length: GENERATED_POOL_SIZE },
    (_, index) => {
      const titleSlug = taskTitles[index]!.toLowerCase()
        .replaceAll(/[^a-z0-9 ]/g, "")
        .trim()
        .replaceAll(/\s+/g, "-");
      return `https://${hosts[index % hosts.length]!}/${titleSlug || `task-${index + 1}`}`;
    },
  );
  const phoneNumbers = Array.from(
    { length: GENERATED_POOL_SIZE },
    (_, index) => {
      return `+1 ${200 + (index % 700)}-${String(100 + ((index * 13) % 900)).padStart(3, "0")}-${String(1000 + ((index * 97) % 9000)).padStart(4, "0")}`;
    },
  );
  const attachmentUrls = Array.from(
    { length: GENERATED_POOL_SIZE },
    (_, index) => {
      const companySlug = companies[index]!.toLowerCase()
        .replaceAll(/[^a-z0-9 ]/g, "")
        .trim()
        .replaceAll(/\s+/g, "-");
      return `https://files.example.com/${companySlug || `company-${index + 1}`}/brief-${(index % 500) + 1}.pdf`;
    },
  );
  const durationLabels = Array.from(
    { length: GENERATED_POOL_SIZE },
    (_, index) => {
      return `${15 * (1 + (index % 24))}m`;
    },
  );

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
    plainLabels: GENERATED_STATUS_LABELS,
  } as const;
}

const generatedPools = buildGeneratedPools();
const GENERATED_CELL_STUB_DATE = new Date(0);

function shouldGenerateCellsForRow(rowId: string) {
  return GENERATED_ROW_ID_RE.test(rowId);
}

function makeGeneratedCellValue(params: {
  columnType: ColumnType;
  isSummary: boolean;
  isNameLike: boolean;
  isAssigneeLike: boolean;
  isCompanyLike: boolean;
  primaryHash: number;
  secondaryHash: number;
  selectOptionLabels: string[];
}) {
  const {
    columnType,
    isSummary,
    isNameLike,
    isAssigneeLike,
    isCompanyLike,
    primaryHash,
    secondaryHash,
    selectOptionLabels,
  } = params;

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
      const date = new Date(
        Date.UTC(2026, 0, 1) + (primaryHash % 365) * 86_400_000,
      );
      return date.toISOString().slice(0, 10);
    }
    case "EMAIL":
      return pickValue(generatedPools.emailAddresses, primaryHash);
    case "URL":
      return pickValue(generatedPools.websiteUrls, primaryHash);
    case "PHONE":
      return pickValue(generatedPools.phoneNumbers, primaryHash);
    case "DURATION":
      return pickValue(generatedPools.durationLabels, primaryHash);
    case "USER":
      return pickValue(generatedPools.people, primaryHash);
    case "ATTACHMENT":
      return pickValue(generatedPools.attachmentUrls, primaryHash);
    case "SINGLE_SELECT":
      if (selectOptionLabels.length > 0) {
        return pickValue(selectOptionLabels, primaryHash);
      }
      return pickValue(generatedPools.plainLabels, primaryHash);
    case "MULTI_SELECT":
      if (selectOptionLabels.length >= 2) {
        return `${pickValue(selectOptionLabels, primaryHash)},${pickValue(selectOptionLabels, secondaryHash)}`;
      }
      if (selectOptionLabels.length === 1) return selectOptionLabels[0]!;
      return `${pickValue(generatedPools.plainLabels, primaryHash)},${pickValue(generatedPools.plainLabels, secondaryHash)}`;
    case "LONG_TEXT":
      if (isSummary) {
        return pickValue(generatedPools.summarySnippets, primaryHash);
      }
      return pickValue(generatedPools.noteSnippets, primaryHash);
    default:
      if (isNameLike) return pickValue(generatedPools.taskTitles, primaryHash);
      if (isAssigneeLike) {
        return pickValue(generatedPools.people, primaryHash);
      }
      if (isCompanyLike) {
        return pickValue(generatedPools.companies, primaryHash);
      }
      return pickValue(generatedPools.noteSnippets, primaryHash);
  }
}

function makeSeeds(rowOrder: number, columnHash: number) {
  const primary = (rowOrder * 1_315_423_911 + columnHash * 2_654_435_761) >>> 0;
  const secondary =
    (rowOrder * 2_246_822_519 + columnHash * 3_266_489_917) >>> 0;
  return { primary, secondary };
}

async function loadColumnMeta(params: {
  ctx: { db: PrismaClient };
  tableId: string;
}) {
  const columns = await params.ctx.db.column.findMany({
    where: { tableId: params.tableId },
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

  return columns.map<GeneratedColumnMeta>((column) => ({
    id: column.id,
    type: column.type,
    selectOptionLabels: column.selectOptions.map((option) => option.label),
    hash: stableHash(column.id),
    isSummary: column.name.toLowerCase().includes("summary"),
    isNameLike: column.name.toLowerCase().includes("name"),
    isAssigneeLike:
      column.name.toLowerCase().includes("assignee") ||
      column.name.toLowerCase().includes("owner"),
    isCompanyLike:
      column.name.toLowerCase().includes("company") ||
      column.name.toLowerCase().includes("account"),
  }));
}

function hydrateGeneratedTableRows(
  rows: TableRowWithCells[],
  columns: GeneratedColumnMeta[],
): TableRowWithCells[] {
  if (columns.length === 0) return rows;

  return rows.map((row) => {
    if (!shouldGenerateCellsForRow(row.id)) return row;

    const byColumnId = new Map<string, TableRowWithCells["cells"][number]>();
    for (const cell of row.cells) {
      byColumnId.set(cell.columnId, cell);
    }

    const cells = columns.map((column) => {
      const existing = byColumnId.get(column.id);
      if (existing) return existing;

      const seeds = makeSeeds(row.order, column.hash);
      return {
        id: `gc:${row.id}:${column.id}`,
        rowId: row.id,
        columnId: column.id,
        value: makeGeneratedCellValue({
          columnType: column.type,
          isSummary: column.isSummary,
          isNameLike: column.isNameLike,
          isAssigneeLike: column.isAssigneeLike,
          isCompanyLike: column.isCompanyLike,
          primaryHash: seeds.primary,
          secondaryHash: seeds.secondary,
          selectOptionLabels: column.selectOptionLabels,
        }),
        createdAt: GENERATED_CELL_STUB_DATE,
        updatedAt: GENERATED_CELL_STUB_DATE,
      };
    });

    return {
      ...row,
      cells,
    };
  });
}

async function fetchRowsAfterOrderRaw(params: {
  ctx: { db: PrismaClient };
  tableId: string;
  afterOrder?: number;
  take: number;
}): Promise<PreloadValueBatch> {
  const afterOrder = params.afterOrder ?? null;
  const isSqlite = process.env.DATABASE_URL?.startsWith("file:") ?? false;

  if (isSqlite) {
    const where =
      afterOrder == null
        ? { tableId: params.tableId }
        : { tableId: params.tableId, order: { gt: afterOrder } };
    const rows = await params.ctx.db.row.findMany({
      where,
      orderBy: { order: "asc" },
      take: params.take,
      select: {
        id: true,
        order: true,
      },
    });

    return {
      columnId: "",
      rows: rows.map((row) => ({
        id: row.id,
        order: row.order,
        value: null,
      })),
    };
  }

  const rows = await params.ctx.db.$queryRaw<
    Array<{ row_id: string; row_order: number }>
  >`
    SELECT
      r.id AS row_id,
      r."order" AS row_order
    FROM "Row" r
    WHERE r."tableId" = ${params.tableId}
      AND (${afterOrder}::double precision IS NULL OR r."order" > ${afterOrder})
    ORDER BY r."order" ASC
    LIMIT ${params.take}
  `;

  return {
    columnId: "",
    rows: rows.map((row) => ({
      id: row.row_id,
      order: row.row_order,
      value: null,
    })),
  };
}

export const tableQueryProcedures = {
  getById: publicProcedure
    .input(TableGetByIdInput)
    .output(TableWithDataOutput)
    .query(async ({ ctx, input }) => {
      const ROW_LIMIT = 1000;

      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { rows: true } },
          columns: {
            orderBy: { order: "asc" },
            include: { selectOptions: { orderBy: { order: "asc" } } },
          },
          rows: {
            take: ROW_LIMIT,
            orderBy: { order: "asc" },
            include: { cells: true },
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Table with id "${input.id}" not found`,
        });
      }

      const columnMeta = table.columns.map<GeneratedColumnMeta>((column) => ({
        id: column.id,
        type: column.type,
        selectOptionLabels: column.selectOptions.map((option) => option.label),
        hash: stableHash(column.id),
        isSummary: column.name.toLowerCase().includes("summary"),
        isNameLike: column.name.toLowerCase().includes("name"),
        isAssigneeLike:
          column.name.toLowerCase().includes("assignee") ||
          column.name.toLowerCase().includes("owner"),
        isCompanyLike:
          column.name.toLowerCase().includes("company") ||
          column.name.toLowerCase().includes("account"),
      }));

      let rows = hydrateGeneratedTableRows(
        table.rows as TableRowWithCells[],
        columnMeta,
      );

      if (input.filterColumnId && input.filterValue) {
        const needle = input.filterValue.toLowerCase();
        rows = rows.filter((row) => {
          const cell = row.cells.find(
            (c) => c.columnId === input.filterColumnId,
          );
          return cell?.value?.toLowerCase().includes(needle) ?? false;
        });
      }

      if (input.sortByColumnId) {
        const col = table.columns.find((c) => c.id === input.sortByColumnId);
        rows = [...rows].sort((a, b) => {
          const av =
            a.cells.find((c) => c.columnId === input.sortByColumnId)?.value ??
            "";
          const bv =
            b.cells.find((c) => c.columnId === input.sortByColumnId)?.value ??
            "";
          const dir = input.sortDir === "asc" ? 1 : -1;
          if (col?.type === "NUMBER") {
            return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
          }
          return dir * av.localeCompare(bv);
        });
      }

      return { ...table, rows, rowCount: table._count.rows };
    }),

  getRows: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        skip: z.number().int().min(0),
        take: z.number().int().min(1).max(20000),
      }),
    )
    .output(z.array(RowOutput))
    .query(async ({ ctx, input }) => {
      const [rows, columns] = await Promise.all([
        ctx.db.row.findMany({
          where: { tableId: input.tableId },
          orderBy: { order: "asc" },
          skip: input.skip,
          take: input.take,
          include: { cells: true },
        }),
        loadColumnMeta({ ctx, tableId: input.tableId }),
      ]);

      return hydrateGeneratedTableRows(rows as TableRowWithCells[], columns);
    }),

  getRowsAfterOrder: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        afterOrder: z.number().int().optional(),
        take: z.number().int().min(1).max(100000),
      }),
    )
    .output(PreloadValueBatchOutput)
    .query(async ({ ctx, input }) => {
      return fetchRowsAfterOrderRaw({
        ctx,
        tableId: input.tableId,
        afterOrder: input.afterOrder,
        take: input.take,
      });
    }),

  loadRowsAfterOrder: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        afterOrder: z.number().int().optional(),
        take: z.number().int().min(1).max(100000),
      }),
    )
    .output(PreloadValueBatchOutput)
    .mutation(async ({ ctx, input }) => {
      return fetchRowsAfterOrderRaw({
        ctx,
        tableId: input.tableId,
        afterOrder: input.afterOrder,
        take: input.take,
      });
    }),
};
