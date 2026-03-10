// prisma/seed.ts
import { PrismaClient, Status, Priority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up first
  await prisma.row.deleteMany();
  await prisma.base.deleteMany();

  // Create a Base
  const base = await prisma.base.create({
    data: {
      name: "Lyra Fellow Project Board (fake)",
    },
  });

  // Seed rows with realistic data
  await prisma.row.createMany({
    data: [
      {
        name: "Design new onboarding flow",
        notes: "Figma mockups available in the #design channel",
        assignee: "John Doe",
        priority: Priority.HIGH,
        status: Status.IN_PROGRESS,
        order: 1,
        baseId: base.id,
      },
      {
        name: "Fix login page crash on mobile",
        notes: "Reproducible on iOS 17, Safari only",
        assignee: "Ryan Huang",
        priority: Priority.ULTRA_HIGH,
        status: Status.TODO,
        order: 2,
        baseId: base.id,
      },
      {
        name: "Write API documentation",
        notes: null,
        assignee: null, // unassigned, to tests optional assignee
        priority: Priority.LOW,
        status: Status.TODO,
        order: 3,
        baseId: base.id,
      },
      {
        name: "Set up CI/CD pipeline",
        notes: "Use GitHub Actions, deploy to Vercel on merge to main",
        assignee: "John Smith",
        status: Status.DONE,
        priority: Priority.HIGH,
        order: 4,
        baseId: base.id,
      },
      {
        name: "User interview synthesis",
        notes: "Consolidate notes from 8 interviews into themes",
        assignee: "Jona Smith",
        priority: Priority.MEDIUM,
        status: Status.IN_PROGRESS,
        order: 5,
        baseId: base.id,
      },
    ],
  });

  console.log("Seeded database with 1 base and 5 rows");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());