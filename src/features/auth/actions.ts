"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/server/db";
import { requireAdministrator, requireHouseholdContext } from "@/server/auth/context";
import { assertValidPin, isValidPin } from "./pin";

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(_: { error?: string; success?: boolean } | null, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formText(formData, "email"),
      password: formText(formData, "password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
  return { success: true };
}

export async function pinLoginAction(_: { error?: string; success?: boolean } | null, formData: FormData) {
  const pin = formText(formData, "pin");
  const email = formText(formData, "email");
  if (!pin) return { error: "4-digit PIN is required." };
  if (!isValidPin(pin)) return { error: "PIN must be exactly 4 digits." };
  try {
    await signIn("credentials", {
      ...(email ? { email } : {}),
      pin,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Incorrect PIN." };
    throw error;
  }
  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

function passwordValue(formData: FormData, key: string) {
  return formText(formData, key);
}

function assertPasswordPair(formData: FormData) {
  const password = passwordValue(formData, "password");
  const confirmPassword = passwordValue(formData, "confirmPassword");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");
  return password;
}

export async function changeCurrentPassword(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const currentPassword = passwordValue(formData, "currentPassword");
  const nextPassword = assertPasswordPair(formData);
  const existing = await prisma.user.findFirstOrThrow({ where: { id: user.id, householdId } });
  const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");
  await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(nextPassword, 12) } });
  revalidatePath("/settings");
  redirect("/settings?password=updated");
}

export async function updateCurrentPin(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const pin = formText(formData, "pin");
  const action = formText(formData, "action");

  if (action === "remove") {
    if (user.peopleId) {
      await prisma.people.update({ where: { id: user.peopleId }, data: { pin: null } });
    }
    revalidatePath("/settings");
    redirect("/settings?pin=removed");
  }

  const validPin = assertValidPin(pin);
  const confirmPin = formText(formData, "confirmPin");
  if (validPin !== confirmPin) throw new Error("PINs do not match.");

  if (!user.peopleId) throw new Error("No person profile linked to this user.");
  const existingPin = await prisma.people.findFirst({
    where: { householdId, pin: validPin, id: { not: user.peopleId }, active: true },
  });
  if (existingPin) throw new Error("This PIN is already in use by someone else. Please choose a different PIN.");

  await prisma.people.update({
    where: { id: user.peopleId, householdId },
    data: { pin: validPin },
  });

  revalidatePath("/settings");
  redirect("/settings?pin=updated");
}

async function immediateFamilyOptionId(householdId: string) {
  const list = await prisma.appList.findFirst({ where: { householdId, key: "people_relationship_type", active: true } });
  if (!list) return null;
  return (await prisma.appListOption.findFirst({ where: { listId: list.id, value: "immediate_family", active: true }, select: { id: true } }))?.id ?? null;
}

export async function adminSetPeoplePassword(formData: FormData) {
  const { householdId, user } = await requireAdministrator();
  const peopleId = formText(formData, "peopleId");
  const returnTo = formText(formData, "returnTo") || "/records";
  if (!peopleId) throw new Error("People record is required.");
  const password = assertPasswordPair(formData);
  const immediateFamilyId = await immediateFamilyOptionId(householdId);
  const person = await prisma.people.findFirstOrThrow({ where: { id: peopleId, householdId, active: true } });
  if (!immediateFamilyId || person.relationshipTypeOptionId !== immediateFamilyId) throw new Error("Only immediate family passwords can be set here.");
  if (!person.email) throw new Error("This person needs an email before a password can be set.");
  const existing = await prisma.user.findFirst({ where: { householdId, peopleId: person.id } });
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, status: "ACTIVE" } });
  } else {
    const email = person.email.toLowerCase();
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.peopleId !== person.id) throw new Error("That email is already used by another login.");
    await prisma.user.create({
      data: {
        householdId,
        peopleId: person.id,
        name: person.name,
        email,
        passwordHash,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
  }
  await prisma.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "UPDATE", recordType: "People", recordId: person.id, summary: `Set password for ${person.name}` } });
  revalidatePath(returnTo);
  redirect(`${returnTo}?password=updated`);
}

export async function adminSetPeoplePin(formData: FormData) {
  const { householdId, user } = await requireAdministrator();
  const peopleId = formText(formData, "peopleId");
  const returnTo = formText(formData, "returnTo") || "/records";
  const pin = formText(formData, "pin");
  const action = formText(formData, "action");

  if (!peopleId) throw new Error("People record is required.");
  const immediateFamilyId = await immediateFamilyOptionId(householdId);
  const person = await prisma.people.findFirstOrThrow({ where: { id: peopleId, householdId, active: true } });
  if (!immediateFamilyId || person.relationshipTypeOptionId !== immediateFamilyId) {
    throw new Error("Only immediate family PINs can be set here.");
  }

  if (action === "remove") {
    await prisma.people.update({ where: { id: person.id }, data: { pin: null } });
    await prisma.activityLog.create({
      data: {
        householdId,
        peopleId: user.peopleId,
        action: "UPDATE",
        recordType: "People",
        recordId: person.id,
        summary: `Removed PIN for ${person.name}`,
      },
    });
    revalidatePath(returnTo);
    redirect(`${returnTo}?pin=removed`);
  }

  const validPin = assertValidPin(pin);
  const existingPin = await prisma.people.findFirst({
    where: { householdId, pin: validPin, id: { not: person.id }, active: true },
  });
  if (existingPin) throw new Error("This PIN is already in use by someone else. Please choose a different PIN.");

  await prisma.people.update({
    where: { id: person.id },
    data: { pin: validPin },
  });

  await prisma.activityLog.create({
    data: {
      householdId,
      peopleId: user.peopleId,
      action: "UPDATE",
      recordType: "People",
      recordId: person.id,
      summary: `Set PIN for ${person.name}`,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?pin=updated`);
}
