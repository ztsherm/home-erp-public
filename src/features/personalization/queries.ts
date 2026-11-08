import { unstable_cache } from "next/cache";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { PERSONALIZATION_DATA_TAG } from "@/server/cache";

const loadFavorites = unstable_cache(
  (householdId: string, userId: string) => prisma.favorite.findMany({ where: { householdId, userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ["favorites-v1"],
  { tags: [PERSONALIZATION_DATA_TAG] },
);

export function getFavorites(householdId: string, userId: string) { return loadFavorites(householdId, userId); }

export async function getRecentRecords() {
  const { householdId, user } = await requireHouseholdContext();
  return prisma.recentRecord.findMany({ where: { householdId, userId: user.id }, orderBy: { viewedAt: "desc" }, take: 8 });
}
