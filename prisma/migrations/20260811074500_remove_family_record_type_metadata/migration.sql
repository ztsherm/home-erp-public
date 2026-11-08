DELETE FROM "RecordField"
WHERE "recordTypeId" IN (
  SELECT "id" FROM "RecordType" WHERE "key" = 'family'
);

DELETE FROM "RecordType"
WHERE "key" = 'family';
