DROP INDEX IF EXISTS "ItemMaintenance_householdId_status_idx";

ALTER TABLE "ItemMaintenance"
DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "MaintenanceStatus";

UPDATE "RecordField"
SET "active" = false
WHERE "key" = 'status'
  AND "recordTypeId" IN (
    SELECT "id"
    FROM "RecordType"
    WHERE "key" = 'item_maintenance'
  );

UPDATE "ReportColumn"
SET "active" = false
WHERE "columnKey" = 'status'
  AND "reportId" IN (
    SELECT "id"
    FROM "Report"
    WHERE "baseTable" = 'item_maintenance'
  );

UPDATE "ReportFilter"
SET "active" = false
WHERE "columnKey" = 'status'
  AND "reportId" IN (
    SELECT "id"
    FROM "Report"
    WHERE "baseTable" = 'item_maintenance'
  );
