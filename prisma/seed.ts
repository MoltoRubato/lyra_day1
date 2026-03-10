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

  const [colName, colAssignee, colStatus, colPriority, colEstimate, colNotes, colDue, colDone] =
    await Promise.all([
      prisma.column.create({ data: { name: "Name",           type: ColumnType.TEXT,          order: 0, width: 220, tableId: table.id } }),
      prisma.column.create({ data: { name: "Assignee",       type: ColumnType.TEXT,          order: 1, width: 160, tableId: table.id } }),
      prisma.column.create({ data: { name: "Status",         type: ColumnType.SINGLE_SELECT, order: 2, width: 140, tableId: table.id } }),
      prisma.column.create({ data: { name: "Priority",       type: ColumnType.SINGLE_SELECT, order: 3, width: 130, tableId: table.id } }),
      prisma.column.create({ data: { name: "Estimate (hrs)", type: ColumnType.NUMBER,        order: 4, width: 130, tableId: table.id } }),
      prisma.column.create({ data: { name: "Notes",          type: ColumnType.TEXT,          order: 5, width: 280, tableId: table.id } }),
      prisma.column.create({ data: { name: "Due date",       type: ColumnType.DATE,          order: 6, width: 140, tableId: table.id } }),
      prisma.column.create({ data: { name: "Done",           type: ColumnType.CHECKBOX,      order: 7, width: 80,  tableId: table.id } }),
    ]);

  async function createRow(order: number, values: {
    name: string;
    assignee?: string;
    status: string;
    priority: string;
    estimate?: number;
    notes?: string;
    due?: string;   // ISO date string e.g. "2025-04-01"
    done?: boolean;
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
        { rowId: row.id, columnId: colDue.id,      value: values.due ?? null },
        { rowId: row.id, columnId: colDone.id,     value: values.done ? "true" : "false" },
      ],
    });
    return row;
  }

  await createRow(1, { name: "Design new onboarding flow",     assignee: "John Doe",   status: "In Progress", priority: "High",       estimate: 8,  notes: "Figma mockups in #design",                              due: "2025-04-10", done: false });
  await createRow(2, { name: "Fix login crash on mobile",      assignee: "Ryan Huang", status: "Todo",        priority: "Ultra High", estimate: 3,  notes: "Reproducible on iOS 17, Safari only",                   due: "2025-03-28", done: false });
  await createRow(3, { name: "Write API documentation",                                status: "Todo",        priority: "Low",        estimate: 5,                                                                  due: "2025-04-20", done: false });
  await createRow(4, { name: "Set up CI/CD pipeline",          assignee: "John Smith", status: "Done",        priority: "High",       estimate: 6,  notes: "GitHub Actions → Vercel on merge to main",              due: "2025-03-15", done: true  });
  await createRow(5, { name: "User interview synthesis",       assignee: "Jona Smith", status: "In Progress", priority: "Medium",     estimate: 4,  notes: "Consolidate notes from 8 interviews into themes",        due: "2025-04-05", done: false });
  await createRow(6, { name: "Accessibility audit",            assignee: "John Doe",   status: "Todo",        priority: "Medium",     estimate: 6,  notes: "Use axe-core, target WCAG 2.1 AA",                      due: "2025-04-18", done: false });
  await createRow(7, { name: "Migrate to new auth provider",   assignee: "Ryan Huang", status: "Todo",        priority: "High",       estimate: 10, notes: "Switching from Clerk to Auth.js",                        due: "2025-04-30", done: false });
  await createRow(8, { name: "Performance profiling",                                  status: "Done",        priority: "Low",        estimate: 3,  notes: "Lighthouse score now 94",                                due: "2025-03-10", done: true  });

  console.log("Seeded: 1 base · 1 table · 8 columns · 8 rows · 64 cells");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());