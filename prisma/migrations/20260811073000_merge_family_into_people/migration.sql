ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "peopleId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'People' AND column_name = 'friendOfFamilyIds'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'People' AND column_name = 'friendOfPeopleIds'
  ) THEN
    ALTER TABLE "People" RENAME COLUMN "friendOfFamilyIds" TO "friendOfPeopleIds";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'ActivityLog' AND column_name = 'familyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'ActivityLog' AND column_name = 'peopleId'
  ) THEN
    ALTER TABLE "ActivityLog" RENAME COLUMN "familyId" TO "peopleId";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_peopleId_key" ON "User"("peopleId");

UPDATE "AppListOption" option
SET "label" = 'Immediate Family',
    "value" = 'immediate_family',
    "position" = 0,
    "active" = true,
    "updatedAt" = NOW()
FROM "AppList" list
WHERE option."listId" = list."id"
  AND list."key" = 'people_relationship_type'
  AND option."value" = 'family'
  AND NOT EXISTS (
    SELECT 1
    FROM "AppListOption" existing
    WHERE existing."listId" = option."listId"
      AND existing."value" = 'immediate_family'
  );

INSERT INTO "AppListOption" ("id", "householdId", "listId", "label", "value", "position", "active", "createdAt", "updatedAt")
SELECT concat('people-immediate-family-', list."householdId"), list."householdId", list."id", 'Immediate Family', 'immediate_family', 0, true, NOW(), NOW()
FROM "AppList" list
WHERE list."key" = 'people_relationship_type'
  AND NOT EXISTS (
    SELECT 1 FROM "AppListOption" option
    WHERE option."listId" = list."id" AND option."value" = 'immediate_family'
  );

INSERT INTO "People" (
  "id",
  "householdId",
  "name",
  "relationshipTypeOptionId",
  "email",
  "phone",
  "profilePhotoUrl",
  "friendOfPeopleIds",
  "interestOptionIds",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  family."id",
  family."householdId",
  family."displayName",
  immediate."id",
  family."email",
  family."phone",
  family."profilePhotoUrl",
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  family."active",
  family."createdAt",
  NOW()
FROM "Family" family
JOIN "AppList" list ON list."householdId" = family."householdId" AND list."key" = 'people_relationship_type'
JOIN "AppListOption" immediate ON immediate."listId" = list."id" AND immediate."value" = 'immediate_family'
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "relationshipTypeOptionId" = COALESCE("People"."relationshipTypeOptionId", EXCLUDED."relationshipTypeOptionId"),
  "email" = COALESCE("People"."email", EXCLUDED."email"),
  "phone" = COALESCE("People"."phone", EXCLUDED."phone"),
  "profilePhotoUrl" = COALESCE("People"."profilePhotoUrl", EXCLUDED."profilePhotoUrl"),
  "active" = EXCLUDED."active",
  "updatedAt" = NOW();

UPDATE "User"
SET "peopleId" = "familyId"
WHERE "peopleId" IS NULL
  AND "familyId" IS NOT NULL;

UPDATE "FileRecord" file_record
SET "relatedRecordTypeId" = people_type."id"
FROM "RecordType" family_type
JOIN "RecordType" people_type ON people_type."householdId" = family_type."householdId" AND people_type."key" = 'people'
WHERE family_type."key" = 'family'
  AND file_record."relatedRecordTypeId" = family_type."id";

UPDATE "RecordField" field
SET "relatedRecordTypeId" = people_type."id",
    "key" = 'friend_of_people',
    "label" = 'Friend Of',
    "updatedAt" = NOW()
FROM "RecordType" people_type
WHERE field."key" = 'friend_of'
  AND people_type."householdId" = field."householdId"
  AND people_type."key" = 'people';

UPDATE "RecordType"
SET "active" = false,
    "updatedAt" = NOW()
WHERE "key" = 'family';

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_familyId_fkey";
ALTER TABLE "ItemPutaway" DROP CONSTRAINT IF EXISTS "ItemPutaway_performedById_fkey";
ALTER TABLE "ItemTransfer" DROP CONSTRAINT IF EXISTS "ItemTransfer_performedById_fkey";
ALTER TABLE "ItemMaintenance" DROP CONSTRAINT IF EXISTS "ItemMaintenance_performedById_fkey";
ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_familyId_fkey";
ALTER TABLE "Family" DROP CONSTRAINT IF EXISTS "Family_householdId_fkey";

DROP INDEX IF EXISTS "User_familyId_key";
DROP INDEX IF EXISTS "Family_householdId_idx";
DROP INDEX IF EXISTS "Family_householdId_active_idx";
DROP INDEX IF EXISTS "Family_householdId_displayName_idx";

ALTER TABLE "User" DROP COLUMN IF EXISTS "familyId";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_peopleId_fkey') THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_peopleId_fkey"
    FOREIGN KEY ("peopleId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ItemPutaway_performedById_fkey') THEN
    ALTER TABLE "ItemPutaway"
    ADD CONSTRAINT "ItemPutaway_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ItemTransfer_performedById_fkey') THEN
    ALTER TABLE "ItemTransfer"
    ADD CONSTRAINT "ItemTransfer_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ItemMaintenance_performedById_fkey') THEN
    ALTER TABLE "ItemMaintenance"
    ADD CONSTRAINT "ItemMaintenance_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_peopleId_fkey') THEN
    ALTER TABLE "ActivityLog"
    ADD CONSTRAINT "ActivityLog_peopleId_fkey"
    FOREIGN KEY ("peopleId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS "Family";
