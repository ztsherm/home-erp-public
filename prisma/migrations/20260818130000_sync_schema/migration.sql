-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'ITEM_LOAN';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "minQuantity" DECIMAL(12,2),
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchasePrice" DECIMAL(12,2),
ADD COLUMN     "targetQuantity" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "People" ADD COLUMN     "pin" TEXT;

-- AlterTable
ALTER TABLE "TaskSchedule" ALTER COLUMN "intervalDays" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ItemLoan" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "transactionNo" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "conditionNotes" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_idx" ON "ItemLoan"("householdId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_active_idx" ON "ItemLoan"("householdId", "active");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_itemId_idx" ON "ItemLoan"("householdId", "itemId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_borrowerId_idx" ON "ItemLoan"("householdId", "borrowerId");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_actualReturnDate_idx" ON "ItemLoan"("householdId", "actualReturnDate");

-- CreateIndex
CREATE INDEX "ItemLoan_householdId_createdAt_idx" ON "ItemLoan"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLoan_householdId_transactionNo_key" ON "ItemLoan"("householdId", "transactionNo");

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLoan" ADD CONSTRAINT "ItemLoan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "People"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
