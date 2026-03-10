// prisma/test-query.ts
// gets all rows with their base, ordered by status (TODO, IN_PROGRESS, DONE)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bases = await prisma.base.findMany({
    include: {
      rows: {
        orderBy: { status: "desc" },
      },
    },
  });

  for (const base of bases) {
    console.log(`\nBase: ${base.name}`);
    for (const row of base.rows) {
      console.log(
        `  [${row.status}] ${row.name} — ${row.assignee ?? "Unassigned"}`
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());