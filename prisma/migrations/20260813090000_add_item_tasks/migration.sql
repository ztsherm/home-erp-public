-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'SKIPPED');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "generatesTasks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "taskTemplate" TEXT,
ADD COLUMN "taskIntervalDays" INTEGER,
ADD COLUMN "taskAnchorDate" TIMESTAMP(3),
ADD COLUMN "taskAssignedToId" TEXT;

-- CreateTable
CREATE TABLE "TaskRule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "sourceRuleId" TEXT,
    "maintenanceRecordId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_householdId_generatesTasks_idx" ON "Item"("householdId", "generatesTasks");
CREATE INDEX "Item_householdId_taskAssignedToId_idx" ON "Item"("householdId", "taskAssignedToId");
CREATE INDEX "TaskRule_householdId_idx" ON "TaskRule"("householdId");
CREATE INDEX "TaskRule_householdId_active_idx" ON "TaskRule"("householdId", "active");
CREATE UNIQUE INDEX "Task_maintenanceRecordId_key" ON "Task"("maintenanceRecordId");
CREATE UNIQUE INDEX "Task_householdId_itemId_dueDate_key" ON "Task"("householdId", "itemId", "dueDate");
CREATE INDEX "Task_householdId_idx" ON "Task"("householdId");
CREATE INDEX "Task_householdId_status_idx" ON "Task"("householdId", "status");
CREATE INDEX "Task_householdId_dueDate_idx" ON "Task"("householdId", "dueDate");
CREATE INDEX "Task_householdId_assignedToId_idx" ON "Task"("householdId", "assignedToId");
CREATE INDEX "Task_householdId_sourceRuleId_idx" ON "Task"("householdId", "sourceRuleId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_taskAssignedToId_fkey" FOREIGN KEY ("taskAssignedToId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskRule" ADD CONSTRAINT "TaskRule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceRuleId_fkey" FOREIGN KEY ("sourceRuleId") REFERENCES "TaskRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "ItemMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed one default rule per household.
INSERT INTO "TaskRule" ("id", "householdId", "name", "active", "createdAt", "updatedAt")
SELECT 'default-task-rule-' || "id", "id", 'Item task generation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Household"
ON CONFLICT DO NOTHING;
