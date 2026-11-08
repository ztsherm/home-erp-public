DROP INDEX IF EXISTS "Task_householdId_itemId_dueDate_key";

CREATE INDEX IF NOT EXISTS "Task_householdId_itemId_dueDate_idx" ON "Task"("householdId", "itemId", "dueDate");
