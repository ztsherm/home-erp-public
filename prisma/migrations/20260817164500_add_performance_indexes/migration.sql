CREATE INDEX IF NOT EXISTS "ItemLocation_householdId_itemId_updatedAt_idx"
ON "ItemLocation"("householdId", "itemId", "updatedAt");

CREATE INDEX IF NOT EXISTS "ItemPutaway_householdId_itemId_createdAt_idx"
ON "ItemPutaway"("householdId", "itemId", "createdAt");

CREATE INDEX IF NOT EXISTS "ItemTransfer_householdId_itemId_createdAt_idx"
ON "ItemTransfer"("householdId", "itemId", "createdAt");

CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_itemId_createdAt_idx"
ON "ItemConsumption"("householdId", "itemId", "createdAt");

CREATE INDEX IF NOT EXISTS "ItemMaintenance_householdId_itemId_createdAt_idx"
ON "ItemMaintenance"("householdId", "itemId", "createdAt");

CREATE INDEX IF NOT EXISTS "Task_householdId_status_assignedToId_dueDate_idx"
ON "Task"("householdId", "status", "assignedToId", "dueDate");

CREATE INDEX IF NOT EXISTS "ActivityLog_householdId_recordType_recordId_createdAt_idx"
ON "ActivityLog"("householdId", "recordType", "recordId", "createdAt");
