/*
  Warnings:

  - You are about to drop the column `baseId` on the `Row` table. All the data in the column will be lost.
  - Added the required column `tableId` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Table_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "tableId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Row_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Row" ("assignee", "createdAt", "id", "name", "notes", "order", "priority", "status", "updatedAt") SELECT "assignee", "createdAt", "id", "name", "notes", "order", "priority", "status", "updatedAt" FROM "Row";
DROP TABLE "Row";
ALTER TABLE "new_Row" RENAME TO "Row";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
