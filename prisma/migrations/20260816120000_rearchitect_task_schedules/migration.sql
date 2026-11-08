ALTER TYPE "TaskStatus" RENAME VALUE 'DONE' TO 'COMPLETED';

ALTER TABLE "TaskRule" RENAME TO "TaskSchedule";
ALTER TABLE "TaskSchedule" RENAME COLUMN "name" TO "title";
ALTER TABLE "TaskSchedule" ADD COLUMN "intervalDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TaskSchedule" ADD COLUMN "assignedToId" TEXT;

ALTER INDEX "TaskRule_householdId_idx" RENAME TO "TaskSchedule_householdId_idx";
ALTER INDEX "TaskRule_householdId_active_idx" RENAME TO "TaskSchedule_householdId_active_idx";
ALTER TABLE "TaskSchedule" RENAME CONSTRAINT "TaskRule_pkey" TO "TaskSchedule_pkey";
ALTER TABLE "TaskSchedule" RENAME CONSTRAINT "TaskRule_householdId_fkey" TO "TaskSchedule_householdId_fkey";

INSERT INTO "TaskSchedule" ("id", "householdId", "title", "intervalDays", "assignedToId", "active", "createdAt", "updatedAt")
SELECT
  'item-task-schedule-' || "id",
  "householdId",
  COALESCE(NULLIF(TRIM("taskTemplate"), ''), "name"),
  COALESCE("taskIntervalDays", 1),
  "taskAssignedToId",
  "generatesTasks",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Item"
WHERE "generatesTasks" = true
  AND "taskIntervalDays" IS NOT NULL
  AND "taskIntervalDays" > 0
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Task" RENAME COLUMN "sourceRuleId" TO "taskScheduleId";
ALTER INDEX "Task_householdId_sourceRuleId_idx" RENAME TO "Task_householdId_taskScheduleId_idx";
ALTER TABLE "Task" RENAME CONSTRAINT "Task_sourceRuleId_fkey" TO "Task_taskScheduleId_fkey";

UPDATE "Task"
SET "taskScheduleId" = 'item-task-schedule-' || "itemId"
WHERE "taskScheduleId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "TaskSchedule"
    WHERE "TaskSchedule"."id" = 'item-task-schedule-' || "Task"."itemId"
  );

ALTER TABLE "Task" ADD COLUMN "nextTaskDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "completedDate" TIMESTAMP(3);

UPDATE "Task"
SET "completedDate" = date_trunc('day', "completedAt")
WHERE "completedAt" IS NOT NULL;

UPDATE "Task"
SET "nextTaskDate" = "Item"."taskNextDate"
FROM "Item"
WHERE "Task"."itemId" = "Item"."id"
  AND "Task"."status" = 'COMPLETED'
  AND "Item"."taskNextDate" IS NOT NULL;

CREATE INDEX "Task_householdId_nextTaskDate_idx" ON "Task"("householdId", "nextTaskDate");
CREATE INDEX "TaskSchedule_householdId_assignedToId_idx" ON "TaskSchedule"("householdId", "assignedToId");

ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Item" DROP COLUMN "generatesTasks";
ALTER TABLE "Item" DROP COLUMN "taskTemplate";
ALTER TABLE "Item" DROP COLUMN "taskIntervalDays";
ALTER TABLE "Item" DROP COLUMN "taskNextDate";
ALTER TABLE "Item" DROP COLUMN "taskAssignedToId";
