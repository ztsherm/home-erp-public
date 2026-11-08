import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { notFound } from "next/navigation";

export async function getAssistantHomeData() {
  const { householdId, user } = await requireHouseholdContext();

  const [pendingTasksCount, reports] = await Promise.all([
    prisma.task.count({
      where: { householdId, status: "OPEN" },
    }),
    prisma.report.findMany({
      where: {
        householdId,
        active: true,
        OR: [{ visibility: "PUBLIC" }, { ownerUserId: user.id }],
      },
      select: { id: true, name: true, baseTable: true, visibility: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    user,
    pendingTasksCount,
    reports,
  };
}

export async function getAssistantItemData(itemId: string) {
  const { householdId, user } = await requireHouseholdContext();

  const item = await prisma.item.findFirst({
    where: { id: itemId, householdId, active: true },
    include: {
      multiUpcs: {
        where: { active: true },
        select: { id: true, upc: true },
        orderBy: { createdAt: "asc" },
      },
      itemLocations: {
        where: { quantity: { gt: 0 } },
        include: {
          location: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      loans: {
        where: { actualReturnDate: null },
        include: { borrower: { select: { id: true, name: true } } },
      },
    },
  });

  if (!item) notFound();

  // All available areas in household for "Store in new location" or Transfer
  const allAreas = await prisma.area.findMany({
    where: { householdId, active: true },
    include: {
      location: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const totalQuantity = item.itemLocations.reduce((sum, loc) => sum + Number(loc.quantity), 0);

  return {
    user,
    item,
    totalQuantity,
    allAreas,
  };
}

export async function getAssistantAreaData(areaId: string) {
  const { householdId, user } = await requireHouseholdContext();

  const area = await prisma.area.findFirst({
    where: { id: areaId, householdId, active: true },
    include: {
      location: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      itemLocations: {
        where: { quantity: { gt: 0 }, item: { active: true } },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              upc: true,
              photoUrl: true,
              minQuantity: true,
              targetQuantity: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!area) notFound();

  return {
    user,
    area,
  };
}

export async function searchScanTarget(query: string, targetType: string = "all") {
  const { householdId } = await requireHouseholdContext();
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: [], areas: [] };
  }

  const shouldFetchItems = targetType === "all" || targetType === "item";
  const shouldFetchAreas = targetType === "all" || targetType === "area";

  const [items, areas] = await Promise.all([
    shouldFetchItems
      ? prisma.item.findMany({
          where: {
            householdId,
            active: true,
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { upc: { contains: trimmed, mode: "insensitive" } },
              { multiUpcs: { some: { upc: { contains: trimmed, mode: "insensitive" }, active: true } } },
              { id: trimmed },
              { model: { contains: trimmed, mode: "insensitive" } },
              { serialNumber: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            upc: true,
            photoUrl: true,
            itemLocations: {
              where: { quantity: { gt: 0 } },
              select: { quantity: true },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),
    shouldFetchAreas
      ? prisma.area.findMany({
          where: {
            householdId,
            active: true,
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { id: trimmed },
              { room: { name: { contains: trimmed, mode: "insensitive" } } },
              { location: { name: { contains: trimmed, mode: "insensitive" } } },
            ],
          },
          include: {
            location: { select: { name: true } },
            room: { select: { name: true } },
            itemLocations: {
              where: { quantity: { gt: 0 } },
              select: { id: true },
            },
          },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      totalQuantity: item.itemLocations.reduce((acc, curr) => acc + Number(curr.quantity), 0),
    })),
    areas: areas.map((area) => ({
      id: area.id,
      name: area.name,
      locationName: area.location?.name ?? "",
      roomName: area.room?.name ?? "",
      itemCount: area.itemLocations.length,
    })),
  };
}

export type ScanResolutionResult =
  | { matched: "item"; id: string; item: { id: string; name: string; brand: string | null; upc: string | null; totalQuantity: number; photoUrl: string | null } }
  | { matched: "area"; id: string; area: { id: string; name: string; locationName: string; roomName: string; itemCount: number } }
  | { matched: "unknown"; code: string };

export async function resolveScanCode(code: string, targetType: string = "all"): Promise<ScanResolutionResult> {
  const { householdId } = await requireHouseholdContext();
  let trimmed = code.trim();
  if (!trimmed) {
    return { matched: "unknown", code: "" };
  }

  // Check if scanned code is a URL pointing to an item or area
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      const url = trimmed.startsWith("/") ? new URL(trimmed, "http://localhost") : new URL(trimmed);
      const pathname = url.pathname;
      const areaMatch = pathname.match(/\/(?:assistant\/)?area\/([^/]+)/);
      if (areaMatch && areaMatch[1]) {
        trimmed = areaMatch[1];
        targetType = "area";
      } else {
        const itemMatch = pathname.match(/\/(?:assistant\/)?item\/([^/]+)/);
        if (itemMatch && itemMatch[1]) {
          trimmed = itemMatch[1];
          targetType = "item";
        }
      }
    }
  } catch {
    // Ignore URL parse failures
  }

  const shouldCheckItems = targetType === "all" || targetType === "item";
  const shouldCheckAreas = targetType === "all" || targetType === "area";

  // 1. If target is item or all, check items first by UPC (primary or multiUpcs), exact ID, or serialNumber
  if (shouldCheckItems) {
    const item = await prisma.item.findFirst({
      where: {
        householdId,
        active: true,
        OR: [
          { upc: { equals: trimmed, mode: "insensitive" } },
          { multiUpcs: { some: { upc: { equals: trimmed, mode: "insensitive" }, active: true } } },
          { id: trimmed },
          { serialNumber: { equals: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        upc: true,
        photoUrl: true,
        itemLocations: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
    });

    if (item) {
      return {
        matched: "item",
        id: item.id,
        item: {
          id: item.id,
          name: item.name,
          brand: item.brand,
          upc: item.upc,
          photoUrl: item.photoUrl,
          totalQuantity: item.itemLocations.reduce((acc, curr) => acc + Number(curr.quantity), 0),
        },
      };
    }
  }

  // 2. If target is area or all, check areas by ID or exact name
  if (shouldCheckAreas) {
    const area = await prisma.area.findFirst({
      where: {
        householdId,
        active: true,
        OR: [
          { id: trimmed },
          { name: { equals: trimmed, mode: "insensitive" } },
        ],
      },
      include: {
        location: { select: { name: true } },
        room: { select: { name: true } },
        itemLocations: {
          where: { quantity: { gt: 0 } },
          select: { id: true },
        },
      },
    });

    if (area) {
      return {
        matched: "area",
        id: area.id,
        area: {
          id: area.id,
          name: area.name,
          locationName: area.location?.name ?? "",
          roomName: area.room?.name ?? "",
          itemCount: area.itemLocations.length,
        },
      };
    }
  }

  // Fallback: If not found in primary exact checks, check if name equals trimmed for item
  if (shouldCheckItems) {
    const itemByName = await prisma.item.findFirst({
      where: {
        householdId,
        active: true,
        name: { equals: trimmed, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        upc: true,
        photoUrl: true,
        itemLocations: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
    });

    if (itemByName) {
      return {
        matched: "item",
        id: itemByName.id,
        item: {
          id: itemByName.id,
          name: itemByName.name,
          brand: itemByName.brand,
          upc: itemByName.upc,
          photoUrl: itemByName.photoUrl,
          totalQuantity: itemByName.itemLocations.reduce((acc, curr) => acc + Number(curr.quantity), 0),
        },
      };
    }
  }

  return { matched: "unknown", code: trimmed };
}
