import { PrismaClient, ColumnType } from "@prisma/client";

const prisma = new PrismaClient();

async function createDefaultViews(tableId: string) {
  await Promise.all([
    prisma.view.create({ data: { name: "Grid view", type: "GRID", order: 0, tableId } }),
    prisma.view.create({ data: { name: "Kanban view", type: "KANBAN", order: 1, tableId, groupByColumnId: null } }),
  ]);
}

async function createSimpleBase(workspaceId: string, name: string, tableName: string, daysAgo: number) {
  const base = await prisma.base.create({
    data: {
      name,
      workspaceId,
      lastOpenedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    },
  });

  const table = await prisma.table.create({ data: { name: tableName, baseId: base.id } });
  await createDefaultViews(table.id);

  await prisma.column.createMany({
    data: [
      { name: "Name", type: ColumnType.TEXT, order: 0, width: 220, tableId: table.id },
      { name: "Status", type: ColumnType.SINGLE_SELECT, order: 1, width: 140, tableId: table.id },
      { name: "Notes", type: ColumnType.TEXT, order: 2, width: 260, tableId: table.id },
    ],
  });
}

async function main() {
  await prisma.cell.deleteMany();
  await prisma.row.deleteMany();
  await prisma.selectOption.deleteMany();
  await prisma.column.deleteMany();
  await prisma.view.deleteMany();
  await prisma.table.deleteMany();
  await prisma.base.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: {
      name: "Lyra Fellowship",
      description: "Workshop projects and assignments",
      starred: true,
    },
  });

  const base = await prisma.base.create({
    data: {
      name: "Lyra Fellow Project Board (fake)",
      workspaceId: workspace.id,
      lastOpenedAt: new Date(),
    },
  });

  const table = await prisma.table.create({ data: { name: "Tasks", baseId: base.id } });
  await createDefaultViews(table.id);

  const [colName, colAssignee, colStatus, colPriority, colEstimate, colNotes, colDue, colDone] =
    await Promise.all([
      prisma.column.create({ data: { name: "Name", type: ColumnType.TEXT, order: 0, width: 220, tableId: table.id } }),
      prisma.column.create({ data: { name: "Assignee", type: ColumnType.TEXT, order: 1, width: 160, tableId: table.id } }),
      prisma.column.create({ data: { name: "Status", type: ColumnType.SINGLE_SELECT, order: 2, width: 140, tableId: table.id } }),
      prisma.column.create({ data: { name: "Priority", type: ColumnType.SINGLE_SELECT, order: 3, width: 130, tableId: table.id } }),
      prisma.column.create({ data: { name: "Estimate (hrs)", type: ColumnType.NUMBER, order: 4, width: 130, tableId: table.id } }),
      prisma.column.create({ data: { name: "Notes", type: ColumnType.TEXT, order: 5, width: 280, tableId: table.id } }),
      prisma.column.create({ data: { name: "Due date", type: ColumnType.DATE, order: 6, width: 140, tableId: table.id } }),
      prisma.column.create({ data: { name: "Done", type: ColumnType.CHECKBOX, order: 7, width: 80, tableId: table.id } }),
    ]);

  await prisma.selectOption.createMany({
    data: [
      { columnId: colStatus.id, label: "Todo", color: "#64748b", order: 0 },
      { columnId: colStatus.id, label: "In Progress", color: "#5b6af7", order: 1 },
      { columnId: colStatus.id, label: "Done", color: "#22c55e", order: 2 },
    ],
  });

  await prisma.selectOption.createMany({
    data: [
      { columnId: colPriority.id, label: "Low", color: "#64748b", order: 0 },
      { columnId: colPriority.id, label: "Medium", color: "#eab308", order: 1 },
      { columnId: colPriority.id, label: "High", color: "#f97316", order: 2 },
      { columnId: colPriority.id, label: "Ultra High", color: "#ef4444", order: 3 },
    ],
  });

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
        { rowId: row.id, columnId: colName.id, value: values.name },
        { rowId: row.id, columnId: colAssignee.id, value: values.assignee ?? null },
        { rowId: row.id, columnId: colStatus.id, value: values.status },
        { rowId: row.id, columnId: colPriority.id, value: values.priority },
        { rowId: row.id, columnId: colEstimate.id, value: values.estimate != null ? String(values.estimate) : null },
        { rowId: row.id, columnId: colNotes.id, value: values.notes ?? null },
        { rowId: row.id, columnId: colDue.id, value: values.due ?? null },
        { rowId: row.id, columnId: colDone.id, value: values.done ? "true" : "false" },
      ],
    });
  }

  await createRow(1, { name: "Design new onboarding flow", assignee: "John Doe", status: "In Progress", priority: "High", estimate: 8, notes: "Figma mockups in #design", due: "2025-04-10", done: false });
  await createRow(2, { name: "Fix login crash on mobile", assignee: "Ryan Huang", status: "Todo", priority: "Ultra High", estimate: 3, notes: "Reproducible on iOS 17, Safari only", due: "2025-03-28", done: false });
  await createRow(3, { name: "Write API documentation", status: "Todo", priority: "Low", estimate: 5, due: "2025-04-20", done: false });
  await createRow(4, { name: "Set up CI/CD pipeline", assignee: "John Smith", status: "Done", priority: "High", estimate: 6, notes: "GitHub Actions to Vercel on merge to main", due: "2025-03-15", done: true });
  await createRow(5, { name: "User interview synthesis", assignee: "Jona Smith", status: "In Progress", priority: "Medium", estimate: 4, notes: "Consolidate notes from 8 interviews into themes", due: "2025-04-05", done: false });

  await createSimpleBase(workspace.id, "Client Delivery Tracker", "Deliverables", 1);
  await createSimpleBase(workspace.id, "Content Calendar", "Campaigns", 2);
  await createSimpleBase(workspace.id, "Ops Runbook", "Checklist", 4);

  console.log("Seeded: 1 workspace, 4 bases, and starter tables/views");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
