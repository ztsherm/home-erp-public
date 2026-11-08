import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { notFound } from "next/navigation";
import type { EventCardData } from "@/components/event-card";
import { shortDateTime, transactionRecordName } from "@/lib/format";
import { getEligibleTaskAssignees } from "@/features/tasks/assignees";
import { getHomeTasks } from "@/features/tasks/queries";
import { unstable_cache } from "next/cache";
import { HOME_DATA_TAG, SHELL_CREATE_DATA_TAG } from "@/server/cache";
import { paginationResult, parsePagination } from "@/lib/pagination";

async function loadShellCreateData(householdId: string) {
  const itemsPromise = prisma.item.findMany({
    where: { householdId, active: true },
    select: {
      id: true,
      name: true,
      upc: true,
      multiUpcs: { where: { active: true }, select: { upc: true } },
    },
    orderBy: { name: "asc" as const },
  });
  const [items, locations, rooms, areas, itemLocations, creatableRecordTypes, attachableRecordTypes] = await Promise.all([
    itemsPromise,
    prisma.location.findMany({
      where: { householdId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      select: { id: true, name: true, locationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.area.findMany({
      where: { householdId, active: true },
      select: { id: true, name: true, locationId: true, roomId: true },
      orderBy: { name: "asc" },
    }),
    prisma.itemLocation.findMany({
      where: { householdId, quantity: { gt: 0 } },
      select: {
        id: true,
        itemId: true,
        locationId: true,
        roomId: true,
        areaId: true,
        quantity: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.recordType.findMany({
      where: { householdId, active: true },
      select: { id: true, key: true, name: true, description: true, icon: true, editableRecords: true },
    }),
    prisma.recordType.findMany({
      where: { householdId, active: true, key: { not: "file" } },
      select: { id: true, name: true },
      orderBy: [{ systemType: "desc" }, { name: "asc" }],
    }),
  ]);

  const locationById = new Map(locations.map((location) => [location.id, location]));
  const roomById = new Map(rooms.map((room) => [room.id, { ...room, location: { name: locationById.get(room.locationId)?.name ?? "" } }]));
  const areaById = new Map(areas.map((area) => [area.id, { ...area, location: { name: locationById.get(area.locationId)?.name ?? "" }, room: { name: roomById.get(area.roomId)?.name ?? "" } }]));
  const itemById = new Map(items.map((item) => [item.id, item]));

  const [people, taskSchedules, taskAssignees] = await Promise.all([
    prisma.people.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, employer: true, jobTitle: true } }),
    prisma.taskSchedule.findMany({ where: { householdId, active: true }, orderBy: [{ title: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, intervalDays: true, assignedToId: true } }),
    getEligibleTaskAssignees(householdId),
  ]);

  return {
    items,
    people,
    taskSchedules,
    taskAssignees,
    locations,
    rooms: rooms.map((room) => ({ ...room, location: { name: locationById.get(room.locationId)?.name ?? "" } })),
    creatableRecordTypes,
    attachableRecordTypes,
    areas: areas.map((area) => ({ ...area, location: { name: locationById.get(area.locationId)?.name ?? "" }, room: { name: roomById.get(area.roomId)?.name ?? "" } })),
    itemLocations: itemLocations.map((row) => ({
      ...row,
      item: { name: itemById.get(row.itemId)?.name ?? "" },
      location: { name: locationById.get(row.locationId)?.name ?? "" },
      room: { name: roomById.get(row.roomId)?.name ?? "" },
      area: { name: areaById.get(row.areaId)?.name ?? "" },
      quantity: row.quantity.toString(),
    })),
  };
}

const getCachedShellCreateData = unstable_cache(
  loadShellCreateData,
  ["shell-create-data-v1"],
  { tags: [SHELL_CREATE_DATA_TAG] },
);

export async function getShellCreateData(householdId: string) {
  return getCachedShellCreateData(householdId);
}

export async function getAssetsPageData(searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId } = await requireHouseholdContext();
  const { page, pageSize, skip } = parsePagination(searchParams);
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const rawStatus = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const status = rawStatus === "archived" || rawStatus === "all" ? rawStatus : "active";
  const where = {
    householdId,
    ...(status === "active" ? { active: true } : status === "archived" ? { active: false } : {}),
  };
  const [itemRecordType, loadedItems, databaseTotal] = await Promise.all([
    prisma.recordType.findFirst({ where: { householdId, key: "item", active: true }, select: { id: true } }),
    prisma.item.findMany({
      where,
      include: {
        multiUpcs: { where: { active: true }, select: { upc: true } },
        itemLocations: {
          where: { quantity: { gt: 0 } },
          include: { room: { select: { name: true } }, area: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      ...(query ? {} : { skip, take: pageSize }),
    }),
    prisma.item.count({ where }),
  ]);
  const itemIds = loadedItems.map((item) => item.id);
  const transactionWhere = { householdId, itemId: { in: itemIds } };
  const [putaways, transfers, consumptions, maintenance] = itemIds.length ? await Promise.all([
    prisma.itemPutaway.groupBy({ by: ["itemId"], where: transactionWhere, _max: { createdAt: true } }),
    prisma.itemTransfer.groupBy({ by: ["itemId"], where: transactionWhere, _max: { createdAt: true } }),
    prisma.itemConsumption.groupBy({ by: ["itemId"], where: transactionWhere, _max: { createdAt: true } }),
    prisma.itemMaintenance.groupBy({ by: ["itemId"], where: transactionWhere, _max: { createdAt: true } }),
  ]) : [[], [], [], []];
  const lastTransactionDateByItemId = new Map<string, Date>();
  for (const transaction of [...putaways, ...transfers, ...consumptions, ...maintenance]) {
    const createdAt = transaction._max.createdAt;
    const existing = lastTransactionDateByItemId.get(transaction.itemId);
    if (createdAt && (!existing || createdAt > existing)) lastTransactionDateByItemId.set(transaction.itemId, createdAt);
  }
  const needle = query.toLocaleLowerCase();
  const matchingItems = query ? loadedItems.filter((item) => [
    item.name,
    item.description ?? "",
    item.brand ?? "",
    item.model ?? "",
    item.serialNumber ?? "",
    item.upc ?? "",
    ...(item.multiUpcs?.map((m) => m.upc) ?? []),
    `Last Transaction Date: ${lastTransactionDateByItemId.has(item.id) ? shortDateTime(lastTransactionDateByItemId.get(item.id)) : "Not set"}`,
    ...item.itemLocations.flatMap((row) => [row.room?.name ?? "", row.area?.name ?? "", String(row.quantity)]),
  ].some((value) => value.toLocaleLowerCase().includes(needle))) : loadedItems;
  const total = query ? matchingItems.length : databaseTotal;
  const items = query ? matchingItems.slice(skip, skip + pageSize) : matchingItems;
  return { items, itemRecordType, lastTransactionDateByItemId, query, status, pagination: paginationResult(total, page, pageSize) };
}

export async function getReportsPageData() {
  const { householdId } = await requireHouseholdContext();
  const [storedQuantity, locationCount, activeItemLocationCount] = await Promise.all([
    prisma.itemLocation.aggregate({
      where: { householdId },
      _sum: { quantity: true },
    }),
    prisma.location.count({ where: { householdId, active: true } }),
    prisma.itemLocation.count({ where: { householdId, quantity: { gt: 0 } } }),
  ]);
  return {
    totalQuantity: Number(storedQuantity._sum.quantity ?? 0),
    locationCount,
    activeItemLocationCount,
  };
}

type EventType = "ITEM_PUTAWAY" | "ITEM_TRANSFER" | "ITEM_CONSUMPTION" | "ITEM_MAINTENANCE" | "ITEM_LOAN" | "ACTIVITY";

function activityAction(action: string): EventCardData["action"] {
  if (action === "UPDATE") return "Edited";
  if (action === "DELETE") return "Deleted";
  return "Created";
}

function activityDetails(log: { action: string; recordType: string; recordId: string; summary: string }, activity: Array<{ action: string; recordType: string; recordId: string; summary: string; createdAt: Date }>) {
  if (log.action !== "DELETE") return log.summary;
  if (log.summary.includes("Previous details:")) return log.summary;
  const previous = activity
    .filter((event) => event.recordType === log.recordType && event.recordId === log.recordId && event.action !== "DELETE")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return previous ? `${log.summary} - Previous details: ${previous.summary}` : log.summary;
}

function activityHref(log: { id: string; action: string; recordType: string; recordId: string }, recordTypeIdByKey: Map<string, string>, existingActivityTargets: Set<string>) {
  if (log.action === "DELETE") return `/events/activity/${log.id}`;
  if (!existingActivityTargets.has(`${log.recordType}:${log.recordId}`)) return `/events/activity/${log.id}`;
  if (log.recordType === "ItemPutaway") return `/events/putaway/${log.recordId}`;
  if (log.recordType === "ItemTransfer") return `/events/transfer/${log.recordId}`;
  if (log.recordType === "ItemConsumption") return `/events/consumption/${log.recordId}`;
  if (log.recordType === "ItemMaintenance") return `/events/maintenance/${log.recordId}`;
  if (log.recordType === "ItemLoan") return `/events/loan/${log.recordId}`;
  const keyByActivityType: Record<string, string> = { Item: "item", Location: "location", Room: "room", Area: "area", FileRecord: "file", People: "people" };
  const recordTypeId = recordTypeIdByKey.get(keyByActivityType[log.recordType] ?? "");
  return recordTypeId ? `/records/${recordTypeId}/${log.recordId}` : `/events/activity/${log.id}`;
}

async function getEventFeed(householdId: string, types: EventType[], options: { limit?: number; offset?: number; since?: Date } = {}) {
  const include = new Set(types);
  const where = options.since ? { householdId, createdAt: { gte: options.since } } : { householdId };
  const take = options.limit ? (options.offset ?? 0) + options.limit : undefined;
  const [putaways, transfers, consumptions, maintenance, loans, activity, recordTypes] = await Promise.all([
    include.has("ITEM_PUTAWAY") ? prisma.itemPutaway.findMany({ where, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ITEM_TRANSFER") ? prisma.itemTransfer.findMany({ where, include: { item: true, fromItemLocation: { include: { location: true, room: true, area: true } }, toItemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ITEM_CONSUMPTION") ? prisma.itemConsumption.findMany({ where, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ITEM_MAINTENANCE") ? prisma.itemMaintenance.findMany({ where, include: { item: true, performedBy: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ITEM_LOAN") ? prisma.itemLoan.findMany({ where, include: { item: true, borrower: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ACTIVITY") ? prisma.activityLog.findMany({ where, include: { people: true }, orderBy: { createdAt: "desc" }, take }) : [],
    include.has("ACTIVITY") ? prisma.recordType.findMany({ where: { householdId, active: true }, select: { id: true, key: true } }) : [],
  ]);
  const recordTypeIdByKey = new Map(recordTypes.map((recordType) => [recordType.key, recordType.id]));
  const activeActivity = activity.filter((log) => log.action !== "DELETE");
  const activityIds = (recordType: string) => activeActivity.filter((log) => log.recordType === recordType).map((log) => log.recordId);
  const putawayIds = activityIds("ItemPutaway");
  const transferIds = activityIds("ItemTransfer");
  const consumptionIds = activityIds("ItemConsumption");
  const maintenanceIds = activityIds("ItemMaintenance");
  const loanIds = activityIds("ItemLoan");
  const itemIds = activityIds("Item");
  const locationIds = activityIds("Location");
  const roomIds = activityIds("Room");
  const areaIds = activityIds("Area");
  const fileIds = activityIds("FileRecord");
  const peopleIds = activityIds("People");
  const [existingPutaways, existingTransfers, existingConsumptions, existingMaintenance, existingLoans, existingItems, existingLocations, existingRooms, existingAreas, existingFiles, existingPeople] = await Promise.all([
    putawayIds.length ? prisma.itemPutaway.findMany({ where: { householdId, id: { in: putawayIds } }, select: { id: true } }) : [],
    transferIds.length ? prisma.itemTransfer.findMany({ where: { householdId, id: { in: transferIds } }, select: { id: true } }) : [],
    consumptionIds.length ? prisma.itemConsumption.findMany({ where: { householdId, id: { in: consumptionIds } }, select: { id: true } }) : [],
    maintenanceIds.length ? prisma.itemMaintenance.findMany({ where: { householdId, id: { in: maintenanceIds } }, select: { id: true } }) : [],
    loanIds.length ? prisma.itemLoan.findMany({ where: { householdId, id: { in: loanIds } }, select: { id: true } }) : [],
    itemIds.length ? prisma.item.findMany({ where: { householdId, id: { in: itemIds } }, select: { id: true } }) : [],
    locationIds.length ? prisma.location.findMany({ where: { householdId, id: { in: locationIds } }, select: { id: true } }) : [],
    roomIds.length ? prisma.room.findMany({ where: { householdId, id: { in: roomIds } }, select: { id: true } }) : [],
    areaIds.length ? prisma.area.findMany({ where: { householdId, id: { in: areaIds } }, select: { id: true } }) : [],
    fileIds.length ? prisma.fileRecord.findMany({ where: { householdId, id: { in: fileIds } }, select: { id: true } }) : [],
    peopleIds.length ? prisma.people.findMany({ where: { householdId, id: { in: peopleIds } }, select: { id: true } }) : [],
  ]);
  const existingActivityTargets = new Set<string>([
    ...existingPutaways.map((row) => `ItemPutaway:${row.id}`),
    ...existingTransfers.map((row) => `ItemTransfer:${row.id}`),
    ...existingConsumptions.map((row) => `ItemConsumption:${row.id}`),
    ...existingMaintenance.map((row) => `ItemMaintenance:${row.id}`),
    ...existingItems.map((row) => `Item:${row.id}`),
    ...existingLocations.map((row) => `Location:${row.id}`),
    ...existingRooms.map((row) => `Room:${row.id}`),
    ...existingAreas.map((row) => `Area:${row.id}`),
    ...existingFiles.map((row) => `FileRecord:${row.id}`),
    ...existingPeople.map((row) => `People:${row.id}`),
  ]);
  const events: EventCardData[] = [
    ...putaways.map((tx) => ({
      id: `putaway:${tx.id}`,
      href: `/events/putaway/${tx.id}`,
      action: "Created" as const,
      title: `${transactionRecordName("putaway", tx.transactionNo)} ${tx.item.name}`,
      user: tx.performedBy.name,
      timestamp: tx.createdAt,
      details: `${String(tx.quantity)} put away to ${tx.itemLocation.location.name} / ${tx.itemLocation.room.name} / ${tx.itemLocation.area.name}${tx.notes ? ` - ${tx.notes}` : ""}`,
    })),
    ...transfers.map((tx) => ({
      id: `transfer:${tx.id}`,
      href: `/events/transfer/${tx.id}`,
      action: "Created" as const,
      title: `${transactionRecordName("transfer", tx.transactionNo)} ${tx.item.name}`,
      user: tx.performedBy.name,
      timestamp: tx.createdAt,
      details: `${String(tx.quantity)} moved from ${tx.fromItemLocation.location.name} / ${tx.fromItemLocation.room.name} / ${tx.fromItemLocation.area.name} to ${tx.toItemLocation.location.name} / ${tx.toItemLocation.room.name} / ${tx.toItemLocation.area.name}${tx.notes ? ` - ${tx.notes}` : ""}`,
    })),
    ...consumptions.map((tx) => ({
      id: `consumption:${tx.id}`,
      href: `/events/consumption/${tx.id}`,
      action: "Created" as const,
      title: `${transactionRecordName("consumption", tx.transactionNo)} ${tx.item.name}`,
      user: tx.performedBy.name,
      timestamp: tx.createdAt,
      details: `${String(tx.quantity)} consumed from ${tx.itemLocation.location.name} / ${tx.itemLocation.room.name} / ${tx.itemLocation.area.name}${tx.notes ? ` - ${tx.notes}` : ""}`,
    })),
    ...maintenance.map((tx) => ({
      id: `maintenance:${tx.id}`,
      href: `/events/maintenance/${tx.id}`,
      action: "Created" as const,
      title: `${transactionRecordName("maintenance", tx.transactionNo)} ${tx.item.name}`,
      user: tx.performedBy.name,
      timestamp: tx.createdAt,
      details: `${tx.maintenanceType}${tx.notes ? ` - ${tx.notes}` : ""}`,
    })),
    ...loans.map((tx) => ({
      id: `loan:${tx.id}`,
      href: `/events/loan/${tx.id}`,
      action: "Created" as const,
      title: `${transactionRecordName("loan", tx.transactionNo)} ${tx.item.name}`,
      user: tx.borrower.name,
      timestamp: tx.createdAt,
      details: `Loaned to ${tx.borrower.name}${tx.expectedReturnDate ? ` (Expected: ${shortDateTime(tx.expectedReturnDate)})` : ""}${tx.actualReturnDate ? ` - Returned: ${shortDateTime(tx.actualReturnDate)}` : ""}${tx.conditionNotes ? ` - Condition: ${tx.conditionNotes}` : ""}${tx.notes ? ` - ${tx.notes}` : ""}`,
    })),
    ...activity.map((log) => ({
      id: `activity:${log.id}`,
      href: activityHref(log, recordTypeIdByKey, existingActivityTargets),
      action: activityAction(log.action),
      title: log.recordType,
      user: log.people?.name ?? "System",
      timestamp: log.createdAt,
      details: activityDetails(log, activity),
    })),
  ];
  const sorted = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const start = options.offset ?? 0;
  return sorted.slice(start, options.limit ? start + options.limit : undefined);
}

export async function getEventsPageData(types?: string[], searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId } = await requireHouseholdContext();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const selected: EventType[] = types?.length ? types.filter((type): type is EventType => ["ITEM_PUTAWAY", "ITEM_TRANSFER", "ITEM_CONSUMPTION", "ITEM_MAINTENANCE", "ITEM_LOAN", "ACTIVITY"].includes(type)) : ["ITEM_PUTAWAY", "ITEM_TRANSFER", "ITEM_CONSUMPTION", "ITEM_MAINTENANCE", "ITEM_LOAN"];
  const { page, pageSize, skip } = parsePagination(searchParams);
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const where = { householdId, createdAt: { gte: since } };
  const [loadedEvents, ...counts] = await Promise.all([
    getEventFeed(householdId, selected, query ? { since } : { since, offset: skip, limit: pageSize }),
    selected.includes("ITEM_PUTAWAY") ? prisma.itemPutaway.count({ where }) : 0,
    selected.includes("ITEM_TRANSFER") ? prisma.itemTransfer.count({ where }) : 0,
    selected.includes("ITEM_CONSUMPTION") ? prisma.itemConsumption.count({ where }) : 0,
    selected.includes("ITEM_MAINTENANCE") ? prisma.itemMaintenance.count({ where }) : 0,
    selected.includes("ITEM_LOAN") ? prisma.itemLoan.count({ where }) : 0,
    selected.includes("ACTIVITY") ? prisma.activityLog.count({ where }) : 0,
  ]);
  const needle = query.toLocaleLowerCase();
  const matchingEvents = query ? loadedEvents.filter((event) => [event.action, event.title, event.user, shortDateTime(event.timestamp), event.details].some((value) => value.toLocaleLowerCase().includes(needle))) : loadedEvents;
  const total = query ? matchingEvents.length : counts.reduce((sum, count) => sum + count, 0);
  const events = query ? matchingEvents.slice(skip, skip + pageSize) : matchingEvents;
  return { events, query, pagination: paginationResult(total, page, pageSize) };
}

export async function getEventRecord(kind: string, id: string, includeOptions = false) {
  const { householdId, user } = await requireHouseholdContext();
  if (kind === "activity") {
    const record = await prisma.activityLog.findFirst({
      where: { id, householdId },
      include: { people: true },
    });
    if (!record) notFound();
    const relatedActivity = await prisma.activityLog.findMany({
      where: { householdId, recordType: record.recordType, recordId: record.recordId },
      include: { people: true },
      orderBy: { createdAt: "desc" },
    });
    return { kind: "activity" as const, record: { ...record, details: activityDetails(record, relatedActivity) }, relatedActivity, user };
  }
  const [items, areas, people, itemLocations] = includeOptions
    ? await Promise.all([
        prisma.item.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }),
        prisma.area.findMany({ where: { householdId, active: true }, include: { location: true, room: true }, orderBy: { name: "asc" } }),
        prisma.people.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }),
        prisma.itemLocation.findMany({ where: { householdId, quantity: { gt: 0 } }, include: { item: true, location: true, room: true, area: true }, orderBy: { updatedAt: "desc" } }),
      ])
    : [[], [], [], []];
  const options = { items, areas, people, itemLocations };
  const recordTypeByKind = { putaway: "ItemPutaway", transfer: "ItemTransfer", consumption: "ItemConsumption", maintenance: "ItemMaintenance", loan: "ItemLoan" } as const;
  const recordTypeKeyByKind = { putaway: "item_putaway", transfer: "item_transfer", consumption: "item_consumption", maintenance: "item_maintenance", loan: "item_loan" } as const;
  const recordType = recordTypeByKind[kind as keyof typeof recordTypeByKind];
  const metadataRecordType = await prisma.recordType.findFirst({
    where: { householdId, key: recordTypeKeyByKind[kind as keyof typeof recordTypeKeyByKind] ?? "", active: true },
    select: { id: true },
  });
  const [fileRecordType, taskRecordType, itemRecordType, peopleRecordType, locationRecordType, roomRecordType, areaRecordType] = await Promise.all([
    prisma.recordType.findFirst({ where: { householdId, key: "file", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "task", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "item", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "people", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "location", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "room", active: true }, select: { id: true } }),
    prisma.recordType.findFirst({ where: { householdId, key: "area", active: true }, select: { id: true } }),
  ]);
  const linkedRecordTypes = { item: itemRecordType, people: peopleRecordType, location: locationRecordType, room: roomRecordType, area: areaRecordType, task: taskRecordType };
  const attachedFiles = metadataRecordType
    ? await prisma.fileRecord.findMany({ where: { householdId, active: true, relatedRecordTypeId: metadataRecordType.id, relatedRecordId: id }, orderBy: { updatedAt: "desc" } })
    : [];
  const activity = recordType
    ? await prisma.activityLog.findMany({ where: { householdId, recordType, recordId: id }, include: { people: true }, orderBy: { createdAt: "desc" } })
    : [];
  if (kind === "putaway") {
    const record = await prisma.itemPutaway.findFirst({
      where: { id, householdId },
      include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true },
    });
    if (!record) notFound();
    return { kind: "putaway" as const, record, user, options, activity, metadataRecordType, fileRecordType, linkedRecordTypes, attachedFiles };
  }
  if (kind === "transfer") {
    const record = await prisma.itemTransfer.findFirst({
      where: { id, householdId },
      include: {
        item: true,
        fromItemLocation: { include: { location: true, room: true, area: true } },
        toItemLocation: { include: { location: true, room: true, area: true } },
        performedBy: true,
      },
    });
    if (!record) notFound();
    return { kind: "transfer" as const, record, user, options, activity, metadataRecordType, fileRecordType, linkedRecordTypes, attachedFiles };
  }
  if (kind === "consumption") {
    const record = await prisma.itemConsumption.findFirst({
      where: { id, householdId },
      include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true },
    });
    if (!record) notFound();
    return { kind: "consumption" as const, record, user, options, activity, metadataRecordType, fileRecordType, linkedRecordTypes, attachedFiles };
  }
  if (kind === "maintenance") {
    const record = await prisma.itemMaintenance.findFirst({
      where: { id, householdId },
      include: { item: true, performedBy: true, completedTask: true },
    });
    if (!record) notFound();
    return { kind: "maintenance" as const, record, user, options, activity, metadataRecordType, fileRecordType, taskRecordType, linkedRecordTypes, attachedFiles };
  }
  if (kind === "loan") {
    const record = await prisma.itemLoan.findFirst({
      where: { id, householdId },
      include: { item: true, borrower: true },
    });
    if (!record) notFound();
    return { kind: "loan" as const, record, user, options, activity, metadataRecordType, fileRecordType, linkedRecordTypes, attachedFiles };
  }
  notFound();
}

const loadHomeData = unstable_cache(async function loadHomeData(householdId: string) {
  const [itemCount, itemLocationCount, locationCount, recentEvents, tasks, people, taskRecordType] = await Promise.all([
    prisma.item.count({ where: { householdId, active: true } }),
    prisma.itemLocation.count({ where: { householdId, quantity: { gt: 0 } } }),
    prisma.area.count({ where: { householdId, active: true } }),
    getEventFeed(householdId, ["ITEM_PUTAWAY", "ITEM_TRANSFER", "ITEM_CONSUMPTION", "ITEM_MAINTENANCE", "ITEM_LOAN", "ACTIVITY"], { limit: 10 }),
    getHomeTasks(householdId),
    getEligibleTaskAssignees(householdId),
    prisma.recordType.findFirst({ where: { householdId, key: "task", active: true }, select: { id: true } }),
  ]);
  return { itemCount, itemLocationCount, locationCount, recentEvents, tasks, people, taskRecordType };
}, ["home-data-v1"], { tags: [HOME_DATA_TAG] });

export async function getHomeData() {
  const { householdId } = await requireHouseholdContext();
  return loadHomeData(householdId);
}

export async function getSettingsPageData() {
  const { householdId, user } = await requireHouseholdContext();
  const person = await prisma.people.findUniqueOrThrow({ where: { id: user.peopleId } });
  const household = await prisma.household.findUniqueOrThrow({ where: { id: householdId } });
  return { person, household, user };
}

export async function searchApp(query: string) {
  const { householdId } = await requireHouseholdContext();
  const q = query.trim();
  if (!q) return { records: [], transactions: [] };
  const contains = { contains: q, mode: "insensitive" as const };
  const recordTypes = await prisma.recordType.findMany({ where: { householdId, active: true }, select: { id: true, key: true, name: true } });
  const recordTypeIdByKey = new Map(recordTypes.map((recordType) => [recordType.key, recordType.id]));
  const recordTypeNameByKey = new Map(recordTypes.map((recordType) => [recordType.key, recordType.name]));
  const href = (key: string, id: string) => `/records/${recordTypeIdByKey.get(key)}/${id}`;
  const recordResult = (key: string, id: string, title: string, subtitle: string) => recordTypeIdByKey.has(key) ? { id: `${key}:${id}`, href: href(key, id), title, subtitle, type: recordTypeNameByKey.get(key) ?? key } : null;
  const textMatches = (values: Array<unknown>) => values.some((value) => String(value ?? "").toLowerCase().includes(q.toLowerCase()));

  const [locations, rooms, areas, items, multiUpcs, files, people, putaways, transfers, consumptions, maintenance, loans] = await Promise.all([
    prisma.location.findMany({ where: { householdId, active: true, OR: [{ name: contains }, { notes: contains }] }, orderBy: { name: "asc" }, take: 20 }),
    prisma.room.findMany({ where: { householdId, active: true, OR: [{ name: contains }, { notes: contains }, { location: { name: contains } }] }, include: { location: true }, orderBy: { name: "asc" }, take: 20 }),
    prisma.area.findMany({ where: { householdId, active: true, OR: [{ name: contains }, { notes: contains }, { room: { name: contains } }, { location: { name: contains } }] }, include: { location: true, room: true }, orderBy: { name: "asc" }, take: 20 }),
    prisma.item.findMany({
      where: {
        householdId,
        active: true,
        OR: [
          { name: contains },
          { description: contains },
          { brand: contains },
          { model: contains },
          { serialNumber: contains },
          { upc: contains },
          { multiUpcs: { some: { upc: contains, active: true } } },
          { notes: contains },
        ],
      },
      include: {
        multiUpcs: { where: { active: true }, select: { upc: true } },
        itemLocations: { include: { location: true, room: true, area: true } },
      },
      orderBy: { name: "asc" },
      take: 20,
    }),
    prisma.itemMultiUpc.findMany({
      where: {
        householdId,
        active: true,
        OR: [{ upc: contains }, { item: { name: contains } }],
      },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.fileRecord.findMany({ where: { householdId, active: true, OR: [{ name: contains }, { fileName: contains }, { mimeType: contains }, { notes: contains }, { relatedRecordType: { name: contains } }] }, include: { relatedRecordType: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.people.findMany({ where: { householdId, active: true, OR: [{ name: contains }, { email: contains }, { phone: contains }, { employer: contains }, { jobTitle: contains }, { notes: contains }] }, orderBy: { name: "asc" }, take: 20 }),
    prisma.itemPutaway.findMany({ where: { householdId }, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemTransfer.findMany({ where: { householdId }, include: { item: true, fromItemLocation: { include: { location: true, room: true, area: true } }, toItemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemConsumption.findMany({ where: { householdId }, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemMaintenance.findMany({ where: { householdId }, include: { item: true, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemLoan.findMany({ where: { householdId }, include: { item: true, borrower: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const records = [
    ...locations.map((row) => recordResult("location", row.id, row.name, row.notes ?? "Location record")),
    ...rooms.map((row) => recordResult("room", row.id, row.name, `${row.location.name}${row.notes ? ` - ${row.notes}` : ""}`)),
    ...areas.map((row) => recordResult("area", row.id, row.name, `${row.location.name} / ${row.room.name}${row.notes ? ` - ${row.notes}` : ""}`)),
    ...items.map((row) => recordResult("item", row.id, row.name, [row.upc, ...row.multiUpcs.map((m) => m.upc), row.brand, row.model, row.serialNumber, row.notes, row.itemLocations.map((x) => `${x.location.name}/${x.room.name}/${x.area.name}`).join(", ")].filter(Boolean).join(" - ") || "Item record")),
    ...multiUpcs.map((row) => recordResult("item_multi_upc", row.id, row.upc, `Item: ${row.item.name}`)),
    ...files.map((row) => recordResult("file", row.id, row.name, `${row.fileName} - ${row.relatedRecordType.name}${row.notes ? ` - ${row.notes}` : ""}`)),
    ...people.map((row) => recordResult("people", row.id, row.name, [row.email, row.phone, row.employer, row.jobTitle, row.notes].filter(Boolean).join(" - ") || "People record")),
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  const transactionResults = [
    ...putaways.map((row) => ({
      id: `putaway:${row.id}`,
      href: `/events/putaway/${row.id}`,
      title: `${transactionRecordName("putaway", row.transactionNo)} ${row.item.name}`,
      type: "Item Putaway",
      subtitle: `${String(row.quantity)} to ${row.itemLocation.location.name} / ${row.itemLocation.room.name} / ${row.itemLocation.area.name}${row.notes ? ` - ${row.notes}` : ""}`,
      values: [transactionRecordName("putaway", row.transactionNo), row.item.name, row.quantity, row.itemLocation.location.name, row.itemLocation.room.name, row.itemLocation.area.name, row.performedBy.name, row.notes],
      timestamp: row.createdAt,
    })),
    ...transfers.map((row) => ({
      id: `transfer:${row.id}`,
      href: `/events/transfer/${row.id}`,
      title: `${transactionRecordName("transfer", row.transactionNo)} ${row.item.name}`,
      type: "Item Transfer",
      subtitle: `${String(row.quantity)} from ${row.fromItemLocation.location.name} / ${row.fromItemLocation.room.name} / ${row.fromItemLocation.area.name} to ${row.toItemLocation.location.name} / ${row.toItemLocation.room.name} / ${row.toItemLocation.area.name}${row.notes ? ` - ${row.notes}` : ""}`,
      values: [transactionRecordName("transfer", row.transactionNo), row.item.name, row.quantity, row.fromItemLocation.location.name, row.fromItemLocation.room.name, row.fromItemLocation.area.name, row.toItemLocation.location.name, row.toItemLocation.room.name, row.toItemLocation.area.name, row.performedBy.name, row.notes],
      timestamp: row.createdAt,
    })),
    ...consumptions.map((row) => ({
      id: `consumption:${row.id}`,
      href: `/events/consumption/${row.id}`,
      title: `${transactionRecordName("consumption", row.transactionNo)} ${row.item.name}`,
      type: "Item Consumption",
      subtitle: `${String(row.quantity)} consumed from ${row.itemLocation.location.name} / ${row.itemLocation.room.name} / ${row.itemLocation.area.name}${row.notes ? ` - ${row.notes}` : ""}`,
      values: [transactionRecordName("consumption", row.transactionNo), row.item.name, row.quantity, row.itemLocation.location.name, row.itemLocation.room.name, row.itemLocation.area.name, row.performedBy.name, row.notes],
      timestamp: row.createdAt,
    })),
    ...maintenance.map((row) => ({
      id: `maintenance:${row.id}`,
      href: `/events/maintenance/${row.id}`,
      title: `${transactionRecordName("maintenance", row.transactionNo)} ${row.item.name}`,
      type: "Item Maintenance",
      subtitle: `${row.maintenanceType}${row.vendor ? ` - ${row.vendor}` : ""}${row.notes ? ` - ${row.notes}` : ""}`,
      values: [transactionRecordName("maintenance", row.transactionNo), row.item.name, row.maintenanceType, row.vendor, row.cost, row.nextDueDate, row.performedBy.name, row.notes],
      timestamp: row.createdAt,
    })),
    ...loans.map((row) => ({
      id: `loan:${row.id}`,
      href: `/events/loan/${row.id}`,
      title: `${transactionRecordName("loan", row.transactionNo)} ${row.item.name}`,
      type: "Item Loan",
      subtitle: `Loaned to ${row.borrower.name}${row.actualReturnDate ? " (Returned)" : " (Active)"}${row.notes ? ` - ${row.notes}` : ""}`,
      values: [transactionRecordName("loan", row.transactionNo), row.item.name, row.borrower.name, row.conditionNotes, row.notes],
      timestamp: row.createdAt,
    })),
  ];
  const transactions = transactionResults
    .filter((row) => textMatches([...row.values, row.subtitle, row.title]))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((row) => ({ id: row.id, href: row.href, title: row.title, type: row.type, subtitle: row.subtitle }));

  return { records, transactions };
}
