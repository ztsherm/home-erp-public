ALTER TABLE "Task" ADD COLUMN "completedById" TEXT;

CREATE INDEX "Task_householdId_completedById_idx" ON "Task"("householdId", "completedById");

ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
