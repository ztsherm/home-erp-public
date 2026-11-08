-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "relatedRecordTypeId" TEXT NOT NULL,
    "relatedRecordId" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileRecord_householdId_idx" ON "FileRecord"("householdId");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_active_idx" ON "FileRecord"("householdId", "active");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_relatedRecordTypeId_relatedRecordId_idx" ON "FileRecord"("householdId", "relatedRecordTypeId", "relatedRecordId");

-- CreateIndex
CREATE INDEX "FileRecord_householdId_name_idx" ON "FileRecord"("householdId", "name");

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_relatedRecordTypeId_fkey" FOREIGN KEY ("relatedRecordTypeId") REFERENCES "RecordType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
