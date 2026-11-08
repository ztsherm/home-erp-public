"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { text } from "@/features/shared/form";
import { invalidatePersonalizationData } from "@/server/cache";

function internalPath(value: string | undefined, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function toggleFavorite(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const href = internalPath(text(formData, "href"), "");
  const label = text(formData, "label")?.slice(0, 160);
  if (!href || !label) throw new Error("Favorite target is required");
  const existing = await prisma.favorite.findUnique({ where: { userId_href: { userId: user.id, href } }, select: { id: true } });
  if (existing) await prisma.favorite.delete({ where: { id: existing.id } });
  else await prisma.favorite.create({ data: { householdId, userId: user.id, href, label } });
  invalidatePersonalizationData();
  revalidatePath(href);
}

export async function recordRecentView(href: string, label: string) {
  const { householdId, user } = await requireHouseholdContext();
  const safeHref = internalPath(href, "");
  if (!safeHref || !label.trim()) return;
  await prisma.recentRecord.upsert({
    where: { userId_href: { userId: user.id, href: safeHref } },
    update: { label: label.slice(0, 160), viewedAt: new Date() },
    create: { householdId, userId: user.id, href: safeHref, label: label.slice(0, 160) },
  });
  invalidatePersonalizationData();
}
