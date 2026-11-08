import { prisma } from "@/server/db";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { SHELL_CREATE_DATA_TAG } from "@/server/cache";

const loadEligibleTaskAssignees = unstable_cache(async function loadEligibleTaskAssignees(householdId: string) {
  const immediateFamily = await prisma.appListOption.findFirst({
    where: {
      householdId,
      value: "immediate_family",
      active: true,
      list: { key: "people_relationship_type", active: true },
    },
    select: { id: true },
  });
  if (!immediateFamily) return [];
  return prisma.people.findMany({
    where: { householdId, active: true, relationshipTypeOptionId: immediateFamily.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}, ["eligible-task-assignees-v1"], { tags: [SHELL_CREATE_DATA_TAG] });

export const getEligibleTaskAssignees = cache((householdId: string) => loadEligibleTaskAssignees(householdId));

export async function assertEligibleTaskAssignee(householdId: string, peopleId: string) {
  const people = await getEligibleTaskAssignees(householdId);
  if (!people.some((person) => person.id === peopleId)) throw new Error("Tasks can only be assigned to immediate family.");
}
