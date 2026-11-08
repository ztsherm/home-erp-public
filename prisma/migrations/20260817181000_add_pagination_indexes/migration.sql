CREATE INDEX IF NOT EXISTS "Item_householdId_active_updatedAt_idx" ON "Item"("householdId", "active", "updatedAt");
CREATE INDEX IF NOT EXISTS "Report_householdId_active_name_idx" ON "Report"("householdId", "active", "name");
