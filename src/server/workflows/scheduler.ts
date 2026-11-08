import { prisma } from "@/server/db";
import { runWorkflow } from "@/features/workflows/runtime";

const INTERVAL_MS = 60 * 1000;

declare global {
  var homeErpWorkflowSchedulerStarted: boolean | undefined;
  var homeErpWorkflowSchedulerRunning: boolean | undefined;
}

export function startWorkflowScheduler() {
  if (globalThis.homeErpWorkflowSchedulerStarted) return;
  globalThis.homeErpWorkflowSchedulerStarted = true;

  async function runDueWorkflows() {
    if (globalThis.homeErpWorkflowSchedulerRunning) return;
    globalThis.homeErpWorkflowSchedulerRunning = true;
    try {
      const workflows = await prisma.workflow.findMany({
        where: { active: true, nextRunAt: { lte: new Date() } },
        select: { id: true, householdId: true },
        orderBy: { nextRunAt: "asc" },
        take: 20,
      });
      for (const workflow of workflows) {
        try {
          await runWorkflow(workflow.id, workflow.householdId);
        } catch (error) {
          console.error("Workflow failed", error);
        }
      }
    } finally {
      globalThis.homeErpWorkflowSchedulerRunning = false;
    }
  }

  setTimeout(() => void runDueWorkflows().catch((error) => console.error("Workflow scheduler failed", error)), 15_000);
  setInterval(() => void runDueWorkflows().catch((error) => console.error("Workflow scheduler failed", error)), INTERVAL_MS);
}
