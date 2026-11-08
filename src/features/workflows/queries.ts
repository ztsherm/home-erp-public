import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { runOnce } from "@/server/run-once";

export async function ensureDefaultWorkflows(householdId: string) {
  return runOnce(`default-workflows:${householdId}`, async () => {
    const existing = await prisma.workflow.findFirst({
      where: { householdId, script: "GENERATE_SCHEDULED_ITEM_TASKS" },
      select: { id: true },
    });
    if (existing) return existing;
    return prisma.workflow.create({
      data: {
        householdId,
        name: "Generate Scheduled Item Tasks",
        script: "GENERATE_SCHEDULED_ITEM_TASKS",
        cadence: "DAILY",
        active: true,
        nextRunAt: new Date(),
      },
      select: { id: true },
    });
  });
}

export async function getWorkflowsPageData() {
  const { householdId, user } = await requireHouseholdContext();
  await ensureDefaultWorkflows(householdId);
  const workflows = await prisma.workflow.findMany({
    where: { householdId },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return { workflows, user };
}
