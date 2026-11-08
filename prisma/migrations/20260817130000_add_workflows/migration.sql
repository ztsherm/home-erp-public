CREATE TYPE "WorkflowScript" AS ENUM ('GENERATE_SCHEDULED_ITEM_TASKS');
CREATE TYPE "WorkflowCadence" AS ENUM ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY');
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "script" "WorkflowScript" NOT NULL,
    "cadence" "WorkflowCadence" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" "WorkflowRunStatus",
    "lastSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "error" TEXT,
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workflow_householdId_idx" ON "Workflow"("householdId");
CREATE INDEX "Workflow_householdId_active_idx" ON "Workflow"("householdId", "active");
CREATE INDEX "Workflow_householdId_script_idx" ON "Workflow"("householdId", "script");
CREATE INDEX "Workflow_active_nextRunAt_idx" ON "Workflow"("active", "nextRunAt");
CREATE INDEX "WorkflowRun_householdId_idx" ON "WorkflowRun"("householdId");
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");
CREATE INDEX "WorkflowRun_householdId_startedAt_idx" ON "WorkflowRun"("householdId", "startedAt");

ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Workflow" ("id", "householdId", "name", "script", "cadence", "active", "nextRunAt", "updatedAt")
SELECT
  'workflow-generate-scheduled-item-tasks-' || "Household"."id",
  "Household"."id",
  'Generate Scheduled Item Tasks',
  'GENERATE_SCHEDULED_ITEM_TASKS',
  'DAILY',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Household"
WHERE NOT EXISTS (
  SELECT 1 FROM "Workflow"
  WHERE "Workflow"."householdId" = "Household"."id"
    AND "Workflow"."script" = 'GENERATE_SCHEDULED_ITEM_TASKS'
);
