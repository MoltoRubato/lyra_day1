-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Base" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f82b60',
    "icon" TEXT NOT NULL DEFAULT 'default',
    "guide" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "lastOpenedAt" DATETIME,
    "workspaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Base_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Base" ("createdAt", "id", "lastOpenedAt", "name", "starred", "updatedAt", "workspaceId") SELECT "createdAt", "id", "lastOpenedAt", "name", "starred", "updatedAt", "workspaceId" FROM "Base";
DROP TABLE "Base";
ALTER TABLE "new_Base" RENAME TO "Base";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
