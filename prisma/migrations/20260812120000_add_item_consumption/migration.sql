ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ITEM_CONSUMPTION';

CREATE TABLE IF NOT EXISTS "ItemConsumption" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemLocationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "performedById" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemConsumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemConsumption_householdId_transactionNo_key" ON "ItemConsumption"("householdId", "transactionNo");
CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_idx" ON "ItemConsumption"("householdId");
CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_active_idx" ON "ItemConsumption"("householdId", "active");
CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_itemId_idx" ON "ItemConsumption"("householdId", "itemId");
CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_itemLocationId_idx" ON "ItemConsumption"("householdId", "itemLocationId");
CREATE INDEX IF NOT EXISTS "ItemConsumption_householdId_createdAt_idx" ON "ItemConsumption"("householdId", "createdAt");

ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_itemLocationId_fkey" FOREIGN KEY ("itemLocationId") REFERENCES "ItemLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemConsumption" ADD CONSTRAINT "ItemConsumption_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
