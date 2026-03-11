// prisma/seed.ts
import { PrismaClient, ColumnType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete in FK-safe order: cells → rows → selectOptions → columns → views → tables → bases
  await prisma.cell.deleteMany();
  await prisma.row.deleteMany();
  await prisma.selectOption.deleteMany();
  await prisma.column.deleteMany();
  await prisma.view.deleteMany();
  await prisma.table.deleteMany();
  await prisma.base.deleteMany();
  await prisma.workspace.deleteMany();

  // ── Workspace ─────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      name: "Lyra Fellowship",
      description: "Workshop projects and assignments",
      starred: true,
    },
  });

  // ── Base ───────────────────────────────────────────────────────────────────
  const base = await prisma.base.create({
    data: {
      name: "Lyra Fellow Project Board (fake)",
      workspaceId: workspace.id,
      lastOpenedAt: new Date(),
    },
  });

  // ── Table ──────────────────────────────────────────────────────────────────
  const table = await prisma.table.create({
    data: { name: "Tasks", baseId: base.id },
  });

  // ── Views (created before columns so they exist from the start) ────────────
  const [gridView, kanbanView] = await Promise.all([
    prisma.view.create({ data: { name: "Grid view",   type: "GRID",   order: 0, tableId: table.id } }),
    prisma.view.create({ data: { name: "Kanban view", type: "KANBAN", order: 1, tableId: table.id, groupByColumnId: null } }),
  ]);
  void gridView; void kanbanView; // referenced later if needed

  // ── Columns ────────────────────────────────────────────────────────────────
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

  // ── Select options ─────────────────────────────────────────────────────────
  // Status options — labels must exactly match the cell values seeded below
  await prisma.selectOption.createMany({
    data: [
      { columnId: colStatus.id, label: "Todo",        color: "#64748b", order: 0 },
      { columnId: colStatus.id, label: "In Progress", color: "#5b6af7", order: 1 },
      { columnId: colStatus.id, label: "Done",        color: "#22c55e", order: 2 },
    ],
  });

  // Priority options
  await prisma.selectOption.createMany({
    data: [
      { columnId: colPriority.id, label: "Low",        color: "#64748b", order: 0 },
      { columnId: colPriority.id, label: "Medium",     color: "#eab308", order: 1 },
      { columnId: colPriority.id, label: "High",       color: "#f97316", order: 2 },
      { columnId: colPriority.id, label: "Ultra High", color: "#ef4444", order: 3 },
    ],
  });

  // ── Rows + cells ───────────────────────────────────────────────────────────
  async function createRow(order: number, values: {
    name: string;
    assignee?: string;
    status: string;
    priority: string;
    estimate?: number;
    notes?: string;
    due?: string;
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

  await createRow(1, { name: "Design new onboarding flow",   assignee: "John Doe",   status: "In Progress", priority: "High",       estimate: 8,  notes: "Figma mockups in #design",                       due: "2025-04-10", done: false });
  await createRow(2, { name: "Fix login crash on mobile",    assignee: "Ryan Huang", status: "Todo",        priority: "Ultra High", estimate: 3,  notes: "Reproducible on iOS 17, Safari only",            due: "2025-03-28", done: false });
  await createRow(3, { name: "Write API documentation",                              status: "Todo",        priority: "Low",        estimate: 5,                                                            due: "2025-04-20", done: false });
  await createRow(4, { name: "Set up CI/CD pipeline",        assignee: "John Smith", status: "Done",        priority: "High",       estimate: 6,  notes: "GitHub Actions → Vercel on merge to main",       due: "2025-03-15", done: true  });
  await createRow(5, { name: "User interview synthesis",     assignee: "Jona Smith", status: "In Progress", priority: "Medium",     estimate: 4,  notes: "Consolidate notes from 8 interviews into themes", due: "2025-04-05", done: false });
  await createRow(6, { name: "Accessibility audit",          assignee: "John Doe",   status: "Todo",        priority: "Medium",     estimate: 6,  notes: "Use axe-core, target WCAG 2.1 AA",               due: "2025-04-18", done: false });
  await createRow(7, { name: "Migrate to new auth provider", assignee: "Ryan Huang", status: "Todo",        priority: "High",       estimate: 10, notes: "Switching from Clerk to Auth.js",                 due: "2025-04-30", done: false });
  await createRow(8, { name: "Performance profiling",                                status: "Done",        priority: "Low",        estimate: 3,  notes: "Lighthouse score now 94",                         due: "2025-03-10", done: true  });

  console.log("✅ Seeded:");
  console.log("   1 workspace");
  console.log("   1 base · 1 table · 2 views");
  console.log("   8 columns · 6 status options · 4 priority options");
  console.log("   8 rows · 64 cells");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());