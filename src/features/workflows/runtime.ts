import { prisma } from "@/server/db";
import { generateScheduledItemTasks } from "@/features/tasks/generation";

type Cadence = "MANUAL" | "HOURLY" | "DAILY" | "WEEKLY";
type Script = "GENERATE_SCHEDULED_ITEM_TASKS";

export function workflowScriptLabel(script: string) {
  if (script === "GENERATE_SCHEDULED_ITEM_TASKS") return "Generate Scheduled Item Tasks";
  return script;
}

export function workflowCadenceLabel(cadence: string) {
  if (cadence === "HOURLY") return "Hourly";
  if (cadence === "DAILY") return "Daily";
  if (cadence === "WEEKLY") return "Weekly";
  return "Manual";
}

export function nextRunFromCadence(cadence: Cadence, from = new Date()) {
  if (cadence === "MANUAL") return null;
  const next = new Date(from);
  if (cadence === "HOURLY") next.setHours(next.getHours() + 1);
  if (cadence === "DAILY") next.setDate(next.getDate() + 1);
  if (cadence === "WEEKLY") next.setDate(next.getDate() + 7);
  return next;
}

export async function runWorkflow(workflowId: string, householdId: string) {
  const workflow = await prisma.workflow.findFirstOrThrow({ where: { id: workflowId, householdId } });
  const startedAt = new Date();
  const run = await prisma.workflowRun.create({
    data: { householdId, workflowId: workflow.id, status: "RUNNING", startedAt },
  });

  try {
    const summary = await runWorkflowScript(workflow.script, householdId);
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", finishedAt, summary },
      }),
      prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          lastRunAt: finishedAt,
          lastStatus: "COMPLETED",
          lastSummary: summary,
          nextRunAt: nextRunFromCadence(workflow.cadence, finishedAt),
        },
      }),
    ]);
    return { status: "COMPLETED" as const, summary };
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : "Unknown workflow error";
    await prisma.$transaction([
      prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt, error: message },
      }),
      prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          lastRunAt: finishedAt,
          lastStatus: "FAILED",
          lastSummary: message,
          nextRunAt: nextRunFromCadence(workflow.cadence, finishedAt),
        },
      }),
    ]);
    throw error;
  }
}

async function runWorkflowScript(script: Script, householdId: string) {
  if (script === "GENERATE_SCHEDULED_ITEM_TASKS") {
    const result = await generateScheduledItemTasks(householdId);
    return `Evaluated ${result.evaluated} item schedule${result.evaluated === 1 ? "" : "s"}; created ${result.created} task${result.created === 1 ? "" : "s"}; skipped ${result.skippedOpen} with open/existing tasks; ${result.skippedNotDue} not due.`;
  }
  throw new Error(`Unsupported workflow script: ${script}`);
}
