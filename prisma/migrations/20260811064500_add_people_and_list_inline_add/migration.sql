CREATE TABLE IF NOT EXISTS "People" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationshipTypeOptionId" TEXT,
  "friendOfFamilyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "birthday" TIMESTAMP(3),
  "anniversary" TIMESTAMP(3),
  "employer" TEXT,
  "jobTitle" TEXT,
  "interestOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "People_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "People" ADD CONSTRAINT "People_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "People_householdId_idx" ON "People"("householdId");
CREATE INDEX IF NOT EXISTS "People_householdId_active_idx" ON "People"("householdId", "active");
CREATE INDEX IF NOT EXISTS "People_householdId_name_idx" ON "People"("householdId", "name");

ALTER TABLE "AppList" ADD COLUMN IF NOT EXISTS "allowAddOnRecord" BOOLEAN NOT NULL DEFAULT true;
