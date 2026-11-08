"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireAdministrator } from "@/server/auth/context";
import { text } from "@/features/shared/form";
import { nextRunFromCadence, runWorkflow } from "@/features/workflows/runtime";
import { invalidateHomeData } from "@/server/cache";

function cadenceValue(value?: string): "MANUAL" | "HOURLY" | "DAILY" | "WEEKLY" {
  if (value === "HOURLY" || value === "DAILY" || value === "WEEKLY") return value;
  return "MANUAL";
}

export async function updateWorkflow(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Workflow id is required");
  const workflow = await prisma.workflow.findFirstOrThrow({ where: { id, householdId } });
  const cadence = cadenceValue(text(formData, "cadence"));
  const active = formData.get("active") === "on";
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      name: text(formData, "name") ?? workflow.name,
      cadence,
      active,
      nextRunAt: active ? nextRunFromCadence(cadence, new Date()) : null,
    },
  });
  revalidatePath("/workflows");
}

export async function runWorkflowNow(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Workflow id is required");
  await runWorkflow(id, householdId);
  invalidateHomeData();
  revalidatePath("/workflows");
  revalidatePath("/tasks");
  revalidatePath("/");
}
