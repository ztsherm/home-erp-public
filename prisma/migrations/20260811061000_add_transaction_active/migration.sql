ALTER TABLE "ItemPutaway" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ItemTransfer" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ItemMaintenance" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "ItemPutaway_householdId_active_idx" ON "ItemPutaway"("householdId", "active");
CREATE INDEX IF NOT EXISTS "ItemTransfer_householdId_active_idx" ON "ItemTransfer"("householdId", "active");
CREATE INDEX IF NOT EXISTS "ItemMaintenance_householdId_active_idx" ON "ItemMaintenance"("householdId", "active");
