/*
  Warnings:

  - You are about to drop the `VerificationCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VerificationCode";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "centroCusto" TEXT NOT NULL,
    "tipoDespesa" TEXT,
    "setorDespesa" TEXT,
    "numFrota" TEXT,
    "tipoFrota" TEXT,
    "descricaoFrota" TEXT,
    "fornecedor" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "importadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "Despesa_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportacaoDespesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "totalLinhas" INTEGER NOT NULL,
    "totalValor" REAL NOT NULL,
    "importadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "ImportacaoDespesa_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'nao_visualizada',
    "maintenanceStatus" TEXT NOT NULL DEFAULT 'solicitacao_aberta',
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
INSERT INTO "new_Task" ("category", "createdAt", "description", "dueDate", "fromId", "id", "priority", "status", "title", "updatedAt") SELECT "category", "createdAt", "description", "dueDate", "fromId", "id", "priority", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
