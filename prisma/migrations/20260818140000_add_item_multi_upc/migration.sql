-- CreateTable
CREATE TABLE "ItemMultiUpc" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMultiUpc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemMultiUpc_householdId_itemId_upc_key" ON "ItemMultiUpc"("householdId", "itemId", "upc");

-- CreateIndex
CREATE INDEX "ItemMultiUpc_householdId_idx" ON "ItemMultiUpc"("householdId");

-- CreateIndex
CREATE INDEX "ItemMultiUpc_householdId_active_idx" ON "ItemMultiUpc"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemMultiUpc_householdId_upc_idx" ON "ItemMultiUpc"("householdId", "upc");

-- CreateIndex
CREATE INDEX "ItemMultiUpc_householdId_itemId_idx" ON "ItemMultiUpc"("householdId", "itemId");

-- AddForeignKey
ALTER TABLE "ItemMultiUpc" ADD CONSTRAINT "ItemMultiUpc_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMultiUpc" ADD CONSTRAINT "ItemMultiUpc_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing Item UPC values
INSERT INTO "ItemMultiUpc" ("id", "householdId", "itemId", "upc", "active", "createdAt", "updatedAt")
SELECT
  'multi-upc-' || "Item"."id" || '-' || md5("Item"."upc"),
  "Item"."householdId",
  "Item"."id",
  "Item"."upc",
  true,
  "Item"."createdAt",
  "Item"."updatedAt"
FROM "Item"
WHERE "Item"."upc" IS NOT NULL AND "Item"."upc" != ''
ON CONFLICT ("householdId", "itemId", "upc") DO NOTHING;
