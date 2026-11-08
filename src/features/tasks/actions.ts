"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { text } from "@/features/shared/form";
import { nextTaskDateFromCompletion, startOfDay } from "@/features/tasks/schedule";
import { assertEligibleTaskAssignee } from "@/features/tasks/assignees";
import { invalidateHomeData } from "@/server/cache";

async function taskNextDate(taskScheduleId: string | null, householdId: string, today = new Date()) {
  if (!taskScheduleId) return null;
  const schedule = await prisma.taskSchedule.findFirst({ where: { id: taskScheduleId, householdId, active: true }, select: { intervalDays: true } });
  return schedule ? nextTaskDateFromCompletion(today, schedule.intervalDays) : null;
}

export async function completeTask(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Task id is required");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id, householdId, status: "OPEN" }, include: { item: true, taskSchedule: true } });
    if (task.taskScheduleId) {
      await tx.itemTaskSchedule.upsert({
        where: { householdId_itemId_taskScheduleId: { householdId, itemId: task.itemId, taskScheduleId: task.taskScheduleId } },
        update: {},
        create: { householdId, itemId: task.itemId, taskScheduleId: task.taskScheduleId, assignedById: user.peopleId },
      });
    }
    const maintenance = await tx.itemMaintenance.create({
      data: {
        householdId,
        itemId: task.itemId,
        maintenanceType: task.title,
        performedById: user.peopleId,
        notes: text(formData, "notes") ?? task.notes,
      },
    });
    await tx.task.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completedDate: startOfDay(now),
        completedById: user.peopleId,
        nextTaskDate: task.taskSchedule ? nextTaskDateFromCompletion(now, task.taskSchedule.intervalDays) : null,
        maintenanceRecordId: maintenance.id,
        assignedToId: task.assignedToId ?? user.peopleId,
      },
    });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "TRANSACTION", recordType: "Task", recordId: task.id, summary: `Completed task ${task.title} for ${task.item.name}` } });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "TRANSACTION", recordType: "ItemMaintenance", recordId: maintenance.id, summary: `Recorded maintenance from task ${task.title}` } });
  });
  invalidateHomeData();
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/assistant");
  revalidatePath("/assistant/tasks");
  revalidatePath("/events");
}

export async function skipTask(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Task id is required");
  const moveNextTaskDate = formData.get("moveNextTaskDate") === "yes";
  const existing = await prisma.task.findFirstOrThrow({ where: { id, householdId, status: "OPEN" }, include: { item: true } });
  const nextDate = moveNextTaskDate ? await taskNextDate(existing.taskScheduleId, householdId) : null;
  const task = await prisma.task.update({ where: { id: existing.id }, data: { status: "SKIPPED", skippedAt: new Date(), nextTaskDate: nextDate, notes: text(formData, "notes") }, include: { item: true } });
  await prisma.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "UPDATE", recordType: "Task", recordId: task.id, summary: `Skipped task ${task.title} for ${task.item.name}` } });
  invalidateHomeData();
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/assistant");
  revalidatePath("/assistant/tasks");
}

export async function assignTask(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Task id is required");
  const assignedToId = text(formData, "assignedToId") ?? null;
  const task = await prisma.task.findFirstOrThrow({ where: { id, householdId, status: "OPEN" }, select: { id: true } });
  if (assignedToId) await assertEligibleTaskAssignee(householdId, assignedToId);
  await prisma.task.update({ where: { id: task.id }, data: { assignedToId } });
  invalidateHomeData();
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/assistant");
  revalidatePath("/assistant/tasks");
}
