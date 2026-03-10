// prisma/seed.ts
import { PrismaClient, ColumnType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.cell.deleteMany();
  await prisma.row.deleteMany();
  await prisma.column.deleteMany();
  await prisma.table.deleteMany();
  await prisma.base.deleteMany();

  const base = await prisma.base.create({
    data: { name: "Lyra Fellow Project Board (fake)" },
  });

  const table = await prisma.table.create({
    data: { name: "Tasks", baseId: base.id },
  });

  const [colName, colAssignee, colStatus, colPriority, colEstimate, colNotes] =
    await Promise.all([
      prisma.column.create({ data: { name: "Name",           type: ColumnType.TEXT,   order: 0, tableId: table.id } }),
      prisma.column.create({ data: { name: "Assignee",       type: ColumnType.TEXT,   order: 1, tableId: table.id } }),
      prisma.column.create({ data: { name: "Status",         type: ColumnType.TEXT,   order: 2, tableId: table.id } }),
      prisma.column.create({ data: { name: "Priority",       type: ColumnType.TEXT,   order: 3, tableId: table.id } }),
      prisma.column.create({ data: { name: "Estimate (hrs)", type: ColumnType.NUMBER, order: 4, tableId: table.id } }),
      prisma.column.create({ data: { name: "Notes",          type: ColumnType.TEXT,   order: 5, tableId: table.id } }),
    ]);

  async function createRow(order: number, values: {
    name: string; assignee?: string; status: string;
    priority: string; estimate?: number; notes?: string;
  }) {
    const row = await prisma.row.create({ data: { tableId: table.id, order } });
    await prisma.cell.createMany({
      data: [
        { rowId: row.id, columnId: colName.id,     value: values.name },
        { rowId: row.id, columnId: colAssignee.id, value: values.assignee ?? null },
        { rowId: row.id, columnId: colStatus.id,   value: values.status },
        { rowId: row.id, columnId: colPriority.id, value: values.priority },
        { rowId: row.id, columnId: colEstimate.id, value: values.estimate != null ? String(values.estimate) : null },
        { rowId: row.id, columnId: colNotes.id,    value: values.notes ?? null },
      ],
    });
    return row;
  }

  await createRow(1, { name: "Design new onboarding flow",      assignee: "John Doe",   status: "In Progress", priority: "High",       estimate: 8, notes: "Figma mockups available in the #design channel" });
  await createRow(2, { name: "Fix login page crash on mobile",  assignee: "Ryan Huang", status: "Todo",        priority: "Ultra High", estimate: 3, notes: "Reproducible on iOS 17, Safari only" });
  await createRow(3, { name: "Write API documentation",                                 status: "Todo",        priority: "Low",        estimate: 5 });
  await createRow(4, { name: "Set up CI/CD pipeline",           assignee: "John Smith", status: "Done",        priority: "High",       estimate: 6, notes: "Use GitHub Actions, deploy to Vercel on merge to main" });
  await createRow(5, { name: "User interview synthesis",        assignee: "Jona Smith", status: "In Progress", priority: "Medium",     estimate: 4, notes: "Consolidate notes from 8 interviews into themes" });

  console.log("✅ Seeded: 1 base · 1 table · 6 columns · 5 rows · 30 cells");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());