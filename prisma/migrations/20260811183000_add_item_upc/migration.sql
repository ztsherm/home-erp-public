ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "upc" TEXT;

CREATE INDEX IF NOT EXISTS "Item_householdId_upc_idx" ON "Item"("householdId", "upc");
