import { ColumnType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLUMN_TYPE_FALLBACK: Partial<Record<ColumnType, ColumnType>> = {
  LONG_TEXT: "TEXT",
  USER: "TEXT",
};

type EnumLabelRow = { enumlabel: string };

async function loadAvailableColumnTypes(): Promise<Set<string> | null> {
  const isSqlite = process.env.DATABASE_URL?.startsWith("file:") ?? false;
  if (isSqlite) return null;

  try {
    const rows = await prisma.$queryRaw<EnumLabelRow[]>`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'ColumnType'
    `;
    return new Set(rows.map((row) => row.enumlabel));
  } catch {
    return null;
  }
}

function resolveSupportedColumnType(
  desired: ColumnType,
  availableTypes: Set<string> | null,
): ColumnType {
  if (!availableTypes || availableTypes.has(desired)) return desired;
  return COLUMN_TYPE_FALLBACK[desired] ?? "TEXT";
}

async function createDefaultTable(params: {
  baseId: string;
  name: string;
  availableTypes: Set<string> | null;
  rowSeed: Array<{
    name: string;
    notes: string;
    assignee: string;
    status: "Todo" | "In progress" | "Done";
    attachmentSummary: string;
    attachmentUrl?: string;
  }>;
}) {
  const longTextType = resolveSupportedColumnType("LONG_TEXT", params.availableTypes);
  const userType = resolveSupportedColumnType("USER", params.availableTypes);

  const table = await prisma.table.create({
    data: { name: params.name, baseId: params.baseId },
  });

  await prisma.view.create({
    data: { name: "Grid view", type: "GRID", order: 0, tableId: table.id },
  });

  const [
    colName,
    colNotes,
    colAssignee,
    colStatus,
    colAttachments,
    colAttachmentSummary,
  ] = await Promise.all([
    prisma.column.create({
      data: { name: "Name", type: "TEXT", order: 0, width: 179, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Notes", type: longTextType, order: 1, width: 179, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Assignee", type: userType, order: 2, width: 179, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Status", type: "SINGLE_SELECT", order: 3, width: 179, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Attachments", type: "ATTACHMENT", order: 4, width: 179, tableId: table.id },
    }),
    prisma.column.create({
      data: {
        name: "Attachment Summary",
        type: longTextType,
        order: 5,
        width: 179,
        tableId: table.id,
        description:
          "An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary.",
      },
    }),
  ]);

  await prisma.selectOption.createMany({
    data: [
      { columnId: colStatus.id, label: "Todo", color: "#f7c6d6", order: 0 },
      { columnId: colStatus.id, label: "In progress", color: "#f3dfab", order: 1 },
      { columnId: colStatus.id, label: "Done", color: "#bce8c2", order: 2 },
    ],
  });

  for (let i = 0; i < params.rowSeed.length; i += 1) {
    const seed = params.rowSeed[i]!;
    const row = await prisma.row.create({
      data: { tableId: table.id, order: i },
    });

    await prisma.cell.createMany({
      data: [
        { rowId: row.id, columnId: colName.id, value: seed.name },
        { rowId: row.id, columnId: colNotes.id, value: seed.notes },
        { rowId: row.id, columnId: colAssignee.id, value: seed.assignee },
        { rowId: row.id, columnId: colStatus.id, value: seed.status },
        { rowId: row.id, columnId: colAttachments.id, value: seed.attachmentUrl ?? null },
        { rowId: row.id, columnId: colAttachmentSummary.id, value: seed.attachmentSummary },
      ],
    });
  }
}

async function createBaseWithDefaultTable(params: {
  workspaceId: string;
  name: string;
  tableName: string;
  daysAgo: number;
  availableTypes: Set<string> | null;
  rowSeed: Array<{
    name: string;
    notes: string;
    assignee: string;
    status: "Todo" | "In progress" | "Done";
    attachmentSummary: string;
    attachmentUrl?: string;
  }>;
}) {
  const base = await prisma.base.create({
    data: {
      name: params.name,
      color: "#dc043b",
      workspaceId: params.workspaceId,
      lastOpenedAt: new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000),
    },
  });

  await createDefaultTable({
    baseId: base.id,
    name: params.tableName,
    availableTypes: params.availableTypes,
    rowSeed: params.rowSeed,
  });
}

async function main() {
  const availableTypes = await loadAvailableColumnTypes();

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

  await createBaseWithDefaultTable({
    workspaceId: workspace.id,
    name: "Lyra Fellow Project Board (fake)",
    tableName: "Tasks",
    daysAgo: 0,
    availableTypes,
    rowSeed: [
      {
        name: "Design onboarding updates",
        notes: "Refresh top-of-funnel copy and run two prototype checks.",
        assignee: "Harvey Graham",
        status: "In progress",
        attachmentSummary: "Prototype notes indicate faster first-action completion.",
      },
      {
        name: "Finalize release checklist",
        notes: "Audit open blockers and align handoff owners.",
        assignee: "Ed Wisoky",
        status: "Todo",
        attachmentSummary: "Checklist draft includes rollback and comms sections.",
      },
      {
        name: "Prepare customer FAQ",
        notes: "Collect support themes and publish concise answers.",
        assignee: "Jasmine Quitzon",
        status: "Todo",
        attachmentSummary: "Draft FAQ covers migration, billing, and permissions.",
      },
    ],
  });

  await createBaseWithDefaultTable({
    workspaceId: workspace.id,
    name: "Client Delivery Tracker",
    tableName: "Deliverables",
    daysAgo: 1,
    availableTypes,
    rowSeed: [
      {
        name: "Q2 reporting package",
        notes: "Compile KPI snapshots and executive summary.",
        assignee: "Ari Singh",
        status: "Todo",
        attachmentSummary: "Waiting on final source workbook from finance.",
      },
      {
        name: "Contract amendment review",
        notes: "Cross-check scope and updated milestones.",
        assignee: "Mina Park",
        status: "Todo",
        attachmentSummary: "Legal requested revised wording for data retention.",
      },
      {
        name: "Customer health readout",
        notes: "Summarize churn risks and expansion opportunities.",
        assignee: "Lucas Chen",
        status: "Done",
        attachmentSummary: "Delivered with action plan for top three accounts.",
      },
    ],
  });

  await createBaseWithDefaultTable({
    workspaceId: workspace.id,
    name: "Content Calendar",
    tableName: "Campaigns",
    daysAgo: 2,
    availableTypes,
    rowSeed: [
      {
        name: "Spring launch social pack",
        notes: "Create copy variants for organic + paid.",
        assignee: "Harvey Graham",
        status: "In progress",
        attachmentSummary: "Creative brief approved with two alternates.",
      },
      {
        name: "Webinar landing updates",
        notes: "Align headline with final speaker abstract.",
        assignee: "Ed Wisoky",
        status: "Todo",
        attachmentSummary: "Needs final CTA wording from growth team.",
      },
      {
        name: "Newsletter issue 32",
        notes: "Collect product highlights and customer story.",
        assignee: "Jasmine Quitzon",
        status: "Todo",
        attachmentSummary: "Draft is in editorial review for tone consistency.",
      },
    ],
  });

  await createBaseWithDefaultTable({
    workspaceId: workspace.id,
    name: "Ops Runbook",
    tableName: "Checklist",
    daysAgo: 4,
    availableTypes,
    rowSeed: [
      {
        name: "Incident triage template",
        notes: "Document severity matrix and escalation contacts.",
        assignee: "Ari Singh",
        status: "Done",
        attachmentSummary: "Template now includes owner rotation schedule.",
      },
      {
        name: "On-call handoff checklist",
        notes: "Capture recurring handoff misses and tighten process.",
        assignee: "Mina Park",
        status: "In progress",
        attachmentSummary: "Added explicit data quality checks before handoff.",
      },
      {
        name: "Quarterly restore drill",
        notes: "Run full backup restore and capture timing metrics.",
        assignee: "Lucas Chen",
        status: "Todo",
        attachmentSummary: "Pending infra window approval for rehearsal.",
      },
    ],
  });

  console.log("Seeded workspace + bases with current default table/column structure.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
