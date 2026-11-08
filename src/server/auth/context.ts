import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma, withPrismaRetry } from "@/server/db";

export const requireCurrentUser = cache(async function requireCurrentUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) redirect("/login");
  const user = await withPrismaRetry(() => prisma.user.findFirst({
    where: {
      id: session.user.id,
      householdId: session.user.householdId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      peopleId: true,
      householdId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      household: { select: { name: true } },
      people: { select: { id: true, name: true, profilePhotoUrl: true } },
    },
  }));
  if (!user) redirect("/login");
  let peopleId = user.peopleId;
  let person = user.people;
  if (!peopleId) {
    const immediateFamily = await withPrismaRetry(() => prisma.appListOption.findFirst({
      where: {
        householdId: user.householdId,
        value: "immediate_family",
        active: true,
        list: { key: "people_relationship_type", active: true },
      },
      select: { id: true },
    }));
    const createdPerson = await withPrismaRetry(() => prisma.people.create({
      data: {
        householdId: user.householdId,
        name: user.name,
        email: user.email,
        relationshipTypeOptionId: immediateFamily?.id,
      },
    }));
    await withPrismaRetry(() => prisma.user.update({ where: { id: user.id }, data: { peopleId: createdPerson.id } }));
    person = createdPerson;
    peopleId = createdPerson.id;
  }
  return {
    id: user.id,
    peopleId,
    householdId: user.householdId,
    householdName: user.household.name,
    name: user.name,
    email: user.email,
    personName: person?.name ?? user.name,
    profilePhotoUrl: person?.profilePhotoUrl ?? null,
    role: user.role,
    status: user.status,
  };
});

export async function requireHouseholdContext() {
  const user = await requireCurrentUser();
  return { user, householdId: user.householdId };
}

export async function requireAdministrator() {
  const context = await requireHouseholdContext();
  if (context.user.role !== "ADMINISTRATOR") throw new Error("Administrator access required");
  return context;
}
