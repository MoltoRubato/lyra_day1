-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Base" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "lastOpenedAt" DATETIME,
    "workspaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Base_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Base" ("createdAt", "id", "name", "starred", "updatedAt") SELECT "createdAt", "id", "name", "starred", "updatedAt" FROM "Base";
DROP TABLE "Base";
ALTER TABLE "new_Base" RENAME TO "Base";
CREATE TABLE "new_SelectOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#166254',
    "order" INTEGER NOT NULL DEFAULT 0,
    "columnId" TEXT NOT NULL,
    CONSTRAINT "SelectOption_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SelectOption" ("color", "columnId", "id", "label", "order") SELECT "color", "columnId", "id", "label", "order" FROM "SelectOption";
DROP TABLE "SelectOption";
ALTER TABLE "new_SelectOption" RENAME TO "SelectOption";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
