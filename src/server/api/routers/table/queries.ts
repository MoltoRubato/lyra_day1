import { TRPCError } from "@trpc/server";
import type { ColumnType, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { makeGeneratedCellValue } from "~/shared/generatedCellValues";
import {
  PreloadValueBatchOutput,
  RowOutput,
  TableGetByIdInput,
  TableWithDataOutput,
} from "~/types/schemas";
type PreloadValueBatch = z.infer<typeof PreloadValueBatchOutput>;
type GeneratedColumnMeta = {
  id: string;
  name: string;
  type: ColumnType;
  selectOptionLabels: string[];
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
const GENERATED_CELL_STUB_DATE = new Date(0);

function shouldGenerateCellsForRow(rowId: string) {
  return GENERATED_ROW_ID_RE.test(rowId);
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
    name: column.name,
    type: column.type,
    selectOptionLabels: column.selectOptions.map((option) => option.label),
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

      return {
        id: `gc:${row.id}:${column.id}`,
        rowId: row.id,
        columnId: column.id,
        value: makeGeneratedCellValue({
          columnType: column.type,
          columnName: column.name,
          rowId: row.id,
          columnId: column.id,
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
        name: column.name,
        type: column.type,
        selectOptionLabels: column.selectOptions.map((option) => option.label),
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
