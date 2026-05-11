-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "requestType" TEXT NOT NULL DEFAULT 'Manutenção',
    "status" TEXT NOT NULL DEFAULT 'nao_visualizada',
    "maintenanceStatus" TEXT,
    "category" TEXT NOT NULL DEFAULT 'manutencao',
    "dueDate" DATETIME,
    "budgetRequestedAt" DATETIME,
    "budgetApprovedAt" DATETIME,
    "partsRequestedAt" DATETIME,
    "partsPurchasedAt" DATETIME,
    "partsDeliveredAt" DATETIME,
    "maintenanceStartedAt" DATETIME,
    "maintenanceFinishedAt" DATETIME,
    "deliveryForecast" DATETIME,
    "deliveryDate" DATETIME,
    "delayReason" TEXT,
    "supplierName" TEXT,
    "totalStoppedDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fromId" INTEGER NOT NULL,
    CONSTRAINT "Task_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("budgetApprovedAt", "budgetRequestedAt", "category", "createdAt", "delayReason", "deliveryDate", "deliveryForecast", "description", "dueDate", "fromId", "id", "maintenanceFinishedAt", "maintenanceStartedAt", "maintenanceStatus", "partsDeliveredAt", "partsPurchasedAt", "partsRequestedAt", "priority", "status", "supplierName", "title", "totalStoppedDays", "updatedAt") SELECT "budgetApprovedAt", "budgetRequestedAt", "category", "createdAt", "delayReason", "deliveryDate", "deliveryForecast", "description", "dueDate", "fromId", "id", "maintenanceFinishedAt", "maintenanceStartedAt", "maintenanceStatus", "partsDeliveredAt", "partsPurchasedAt", "partsRequestedAt", "priority", "status", "supplierName", "title", "totalStoppedDays", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
