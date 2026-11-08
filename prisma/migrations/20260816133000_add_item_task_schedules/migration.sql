CREATE TABLE "ItemTaskSchedule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "taskScheduleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTaskSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemTaskSchedule_householdId_itemId_taskScheduleId_key" ON "ItemTaskSchedule"("householdId", "itemId", "taskScheduleId");
CREATE INDEX "ItemTaskSchedule_householdId_idx" ON "ItemTaskSchedule"("householdId");
CREATE INDEX "ItemTaskSchedule_householdId_itemId_idx" ON "ItemTaskSchedule"("householdId", "itemId");
CREATE INDEX "ItemTaskSchedule_householdId_taskScheduleId_idx" ON "ItemTaskSchedule"("householdId", "taskScheduleId");

ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_taskScheduleId_fkey" FOREIGN KEY ("taskScheduleId") REFERENCES "TaskSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemTaskSchedule" ADD CONSTRAINT "ItemTaskSchedule_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ItemTaskSchedule" ("id", "householdId", "itemId", "taskScheduleId", "createdAt")
SELECT
  'item-task-schedule-link-' || "Task"."itemId" || '-' || "Task"."taskScheduleId",
  "Task"."householdId",
  "Task"."itemId",
  "Task"."taskScheduleId",
  CURRENT_TIMESTAMP
FROM "Task"
WHERE "Task"."taskScheduleId" IS NOT NULL
GROUP BY "Task"."householdId", "Task"."itemId", "Task"."taskScheduleId"
ON CONFLICT ("householdId", "itemId", "taskScheduleId") DO NOTHING;
