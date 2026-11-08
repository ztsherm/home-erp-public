import { prisma } from "@/server/db";
import { addDays, startOfDay } from "@/features/tasks/schedule";

export type TaskGenerationResult = {
  evaluated: number;
  created: number;
  skippedOpen: number;
  skippedNotDue: number;
};

function dueDateFromLastCompleted(lastCompletedDate: Date | null | undefined, intervalDays: number) {
  if (!lastCompletedDate || intervalDays <= 0) return null;
  return startOfDay(addDays(lastCompletedDate, intervalDays));
}

export async function generateScheduledItemTasks(householdId: string, today = new Date()): Promise<TaskGenerationResult> {
  const currentDay = startOfDay(today);
  const assignments = await prisma.itemTaskSchedule.findMany({
    where: {
      householdId,
      item: { active: true },
      taskSchedule: { active: true },
    },
    include: {
      item: { select: { id: true, name: true } },
      taskSchedule: { select: { id: true, title: true, intervalDays: true, assignedToId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result: TaskGenerationResult = { evaluated: assignments.length, created: 0, skippedOpen: 0, skippedNotDue: 0 };

  for (const assignment of assignments) {
    const existingOpen = await prisma.task.findFirst({
      where: { householdId, itemId: assignment.itemId, taskScheduleId: assignment.taskScheduleId, status: "OPEN" },
      select: { id: true },
    });
    if (existingOpen) {
      result.skippedOpen += 1;
      continue;
    }

    const latestCompleted = await prisma.task.findFirst({
      where: { householdId, itemId: assignment.itemId, taskScheduleId: assignment.taskScheduleId, status: "COMPLETED", completedDate: { not: null } },
      select: { completedDate: true },
      orderBy: [{ completedDate: "desc" }, { completedAt: "desc" }],
    });
    const dueDate = latestCompleted?.completedDate
      ? dueDateFromLastCompleted(latestCompleted.completedDate, assignment.taskSchedule.intervalDays)
      : startOfDay(assignment.createdAt);

    if (!dueDate || dueDate > currentDay) {
      result.skippedNotDue += 1;
      continue;
    }

    const existingForDueDate = await prisma.task.findFirst({
      where: { householdId, itemId: assignment.itemId, taskScheduleId: assignment.taskScheduleId, dueDate },
      select: { id: true },
    });
    if (existingForDueDate) {
      result.skippedOpen += 1;
      continue;
    }

    await prisma.task.create({
      data: {
        householdId,
        itemId: assignment.itemId,
        taskScheduleId: assignment.taskScheduleId,
        assignedToId: assignment.taskSchedule.assignedToId,
        title: assignment.taskSchedule.title,
        dueDate,
      },
    });
    result.created += 1;
  }

  return result;
}
