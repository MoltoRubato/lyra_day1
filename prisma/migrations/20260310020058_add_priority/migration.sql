-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Row" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignee" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "baseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Row_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Row" ("assignee", "baseId", "createdAt", "id", "name", "notes", "order", "status", "updatedAt") SELECT "assignee", "baseId", "createdAt", "id", "name", "notes", "order", "status", "updatedAt" FROM "Row";
DROP TABLE "Row";
ALTER TABLE "new_Row" RENAME TO "Row";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
