import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { transactionRecordName } from "@/lib/format";
import { paginationResult, parsePagination } from "@/lib/pagination";
import { getEligibleTaskAssignees } from "@/features/tasks/assignees";
import { calculateTco, formatCurrency } from "@/features/inventory/tco";
import { runOnce } from "@/server/run-once";
import { unstable_cache } from "next/cache";

function keyFromLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function bootstrapPeopleRecordType(householdId: string) {
  const loginRoleList = await prisma.appList.upsert({
    where: { householdId_key: { householdId, key: "immediate_family_login_role" } },
    update: { name: "Immediate Family Login Role", selectionMode: "SINGLE" },
    create: { householdId, name: "Immediate Family Login Role", key: "immediate_family_login_role", selectionMode: "SINGLE" },
  });
  for (const [position, label] of ["user", "admin"].entries()) {
    await prisma.appListOption.upsert({
      where: { listId_value: { listId: loginRoleList.id, value: keyFromLabel(label) } },
      update: { label, active: true, position },
      create: { householdId, listId: loginRoleList.id, label, value: keyFromLabel(label), position },
    });
  }
  const peopleInterestsList = await prisma.appList.upsert({
    where: { householdId_key: { householdId, key: "people_interests" } },
    update: { name: "People Interests", selectionMode: "MULTI" },
    create: { householdId, name: "People Interests", key: "people_interests", selectionMode: "MULTI" },
  });
  for (const [position, label] of ["Sports", "Outdoors", "Technology", "Reading", "Cooking", "Art", "Music", "Travel", "Gaming", "Volunteering"].entries()) {
    await prisma.appListOption.upsert({
      where: { listId_value: { listId: peopleInterestsList.id, value: keyFromLabel(label) } },
      update: { label, active: true, position },
      create: { householdId, listId: peopleInterestsList.id, label, value: keyFromLabel(label), position },
    });
  }
  const relationshipList = await prisma.appList.upsert({
    where: { householdId_key: { householdId, key: "people_relationship_type" } },
    update: { name: "People Relationship Type", selectionMode: "SINGLE" },
    create: { householdId, name: "People Relationship Type", key: "people_relationship_type", selectionMode: "SINGLE" },
  });
  for (const [position, label] of ["Immediate Family", "Extended Family", "Friend", "Neighbor", "Colleague", "Service Provider", "Other"].entries()) {
    await prisma.appListOption.upsert({
      where: { listId_value: { listId: relationshipList.id, value: keyFromLabel(label) } },
      update: { label, active: true, position },
      create: { householdId, listId: relationshipList.id, label, value: keyFromLabel(label), position },
    });
  }
  const recordType = await prisma.recordType.upsert({
    where: { householdId_key: { householdId, key: "people" } },
    update: { name: "People", icon: "users", description: "Household members and personal contacts.", systemType: true, active: true },
    create: { householdId, key: "people", icon: "users", name: "People", description: "Household members and personal contacts.", systemType: true, editableRecords: true },
  });
  const fields = [
    { key: "name", label: "Name", kind: "FREE_TEXT" as const, required: true, position: 0 },
    { key: "relationship", label: "Relationship", kind: "LIST" as const, listId: relationshipList.id, position: 1 },
    { key: "login_role", label: "Immediate Family Login Role", kind: "LIST" as const, listId: loginRoleList.id, position: 2 },
    { key: "phone", label: "Phone", kind: "FREE_TEXT" as const, position: 3 },
    { key: "email", label: "Email", kind: "FREE_TEXT" as const, position: 4 },
    { key: "birthday", label: "Birthday", kind: "DATE" as const, position: 5 },
    { key: "employer", label: "Employer", kind: "FREE_TEXT" as const, position: 6 },
    { key: "job_title", label: "Job Title", kind: "FREE_TEXT" as const, position: 7 },
    { key: "interests", label: "Interests", kind: "LIST" as const, listId: peopleInterestsList.id, position: 8 },
    { key: "notes", label: "Notes", kind: "FREE_TEXT" as const, position: 9 },
  ];
  for (const field of fields) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: recordType.id, key: field.key } },
      update: { label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, listId: field.listId ?? null, relatedRecordTypeId: null, active: true },
      create: { householdId, recordTypeId: recordType.id, key: field.key, label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, listId: field.listId },
    });
  }
}

async function bootstrapItemFields(householdId: string) {
  const recordType = await prisma.recordType.findFirst({ where: { householdId, key: "item", active: true }, select: { id: true } });
  if (!recordType) return;
  const fields = [
    { key: "upc", label: "UPC", kind: "FREE_TEXT" as const, position: 4 },
    { key: "min_quantity", label: "Reorder Threshold (Min Quantity)", kind: "INTEGER" as const, position: 5 },
    { key: "target_quantity", label: "Max Quantity (Target Quantity)", kind: "INTEGER" as const, position: 6 },
    { key: "purchase_price", label: "Purchase Price", kind: "FREE_TEXT" as const, position: 7 },
    { key: "purchase_date", label: "Purchase Date", kind: "DATE" as const, position: 8 },
  ];
  for (const field of fields) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: recordType.id, key: field.key } },
      update: { label: field.label, kind: field.kind, required: false, active: true, listId: null, relatedRecordTypeId: null },
      create: { householdId, recordTypeId: recordType.id, key: field.key, label: field.label, kind: field.kind, required: false, position: field.position },
    });
  }
}

async function bootstrapTaskRecordType(householdId: string) {
  const itemRecordType = await prisma.recordType.findFirst({ where: { householdId, key: "item", active: true }, select: { id: true } });
  const peopleRecordType = await prisma.recordType.findFirst({ where: { householdId, key: "people", active: true }, select: { id: true } });
  const scheduleRecordType = await prisma.recordType.upsert({
    where: { householdId_key: { householdId, key: "task_schedule" } },
    update: { name: "Task Generation Schedule", icon: "calendar-days", description: "Reusable task generation schedules.", systemType: true, active: true },
    create: { householdId, key: "task_schedule", icon: "calendar-days", name: "Task Generation Schedule", description: "Reusable task generation schedules.", systemType: true, editableRecords: true },
  });
  const scheduleFields = [
    { key: "title", label: "Task Title", kind: "FREE_TEXT" as const, required: true, position: 0 },
    { key: "interval_days", label: "Interval Days", kind: "INTEGER" as const, required: true, position: 1 },
    { key: "assigned_to", label: "Assigned To", kind: "RECORD" as const, relatedRecordTypeId: peopleRecordType?.id, position: 2 },
  ];
  for (const field of scheduleFields) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: scheduleRecordType.id, key: field.key } },
      update: { label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, listId: null, relatedRecordTypeId: field.relatedRecordTypeId ?? null, active: true },
      create: { householdId, recordTypeId: scheduleRecordType.id, key: field.key, label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, relatedRecordTypeId: field.relatedRecordTypeId },
    });
  }
  const recordType = await prisma.recordType.upsert({
    where: { householdId_key: { householdId, key: "task" } },
    update: { name: "Task", icon: "check-square", description: "Manual and generated household tasks.", systemType: true, active: true },
    create: { householdId, key: "task", icon: "check-square", name: "Task", description: "Manual and generated household tasks.", systemType: true, editableRecords: true },
  });
  const fields = [
    { key: "title", label: "Title", kind: "FREE_TEXT" as const, required: true, position: 0 },
    { key: "item", label: "Item", kind: "RECORD" as const, required: true, relatedRecordTypeId: itemRecordType?.id, position: 1 },
    { key: "task_schedule", label: "Task Generation Schedule", kind: "RECORD" as const, relatedRecordTypeId: scheduleRecordType.id, position: 2 },
    { key: "assigned_to", label: "Assigned To", kind: "RECORD" as const, relatedRecordTypeId: peopleRecordType?.id, position: 3 },
    { key: "due_date", label: "Due Date", kind: "DATE" as const, required: true, position: 4 },
    { key: "status", label: "Status", kind: "FREE_TEXT" as const, position: 5 },
    { key: "completed_by", label: "Completed By", kind: "RECORD" as const, relatedRecordTypeId: peopleRecordType?.id, position: 6 },
    { key: "completed_date", label: "Completed Date", kind: "DATE" as const, position: 7 },
    { key: "next_task_date", label: "Next Task Date", kind: "DATE" as const, position: 8 },
    { key: "notes", label: "Notes", kind: "FREE_TEXT" as const, position: 9 },
  ];
  for (const field of fields) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: recordType.id, key: field.key } },
      update: { label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, listId: null, relatedRecordTypeId: field.relatedRecordTypeId ?? null, active: true },
      create: { householdId, recordTypeId: recordType.id, key: field.key, label: field.label, kind: field.kind, required: field.required ?? false, position: field.position, relatedRecordTypeId: field.relatedRecordTypeId },
    });
  }
}

async function bootstrapItemMultiUpcTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ItemMultiUpc" (
        "id" TEXT NOT NULL,
        "householdId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "upc" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ItemMultiUpc_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ItemMultiUpc_householdId_itemId_upc_key" ON "ItemMultiUpc"("householdId", "itemId", "upc");
      CREATE INDEX IF NOT EXISTS "ItemMultiUpc_householdId_idx" ON "ItemMultiUpc"("householdId");
      CREATE INDEX IF NOT EXISTS "ItemMultiUpc_householdId_active_idx" ON "ItemMultiUpc"("householdId", "active");
      CREATE INDEX IF NOT EXISTS "ItemMultiUpc_householdId_upc_idx" ON "ItemMultiUpc"("householdId", "upc");
      CREATE INDEX IF NOT EXISTS "ItemMultiUpc_householdId_itemId_idx" ON "ItemMultiUpc"("householdId", "itemId");
    `);
  } catch {
    // ignore
  }
}

async function bootstrapItemMultiUpcRecordType(householdId: string) {
  await bootstrapItemMultiUpcTable();
  const itemRecordType = await prisma.recordType.findFirst({ where: { householdId, key: "item", active: true }, select: { id: true } });
  const recordType = await prisma.recordType.upsert({
    where: { householdId_key: { householdId, key: "item_multi_upc" } },
    update: { name: "Item Multi-UPC", icon: "barcode", description: "Secondary and additional UPC barcodes linked to an item.", systemType: true, active: true },
    create: { householdId, key: "item_multi_upc", icon: "barcode", name: "Item Multi-UPC", description: "Secondary and additional UPC barcodes linked to an item.", systemType: true, editableRecords: true },
  });
  const fields = [
    { key: "name", label: "UPC", kind: "FREE_TEXT" as const, required: true, position: 0 },
    { key: "upc", label: "UPC", kind: "FREE_TEXT" as const, required: true, position: 1 },
    { key: "item", label: "Item", kind: "RECORD" as const, required: true, relatedRecordTypeId: itemRecordType?.id, position: 2 },
  ];
  for (const field of fields) {
    await prisma.recordField.upsert({
      where: { recordTypeId_key: { recordTypeId: recordType.id, key: field.key } },
      update: { label: field.label, kind: field.kind, required: field.required, position: field.position, listId: null, relatedRecordTypeId: field.relatedRecordTypeId ?? null, active: true },
      create: { householdId, recordTypeId: recordType.id, key: field.key, label: field.label, kind: field.kind, required: field.required, position: field.position, relatedRecordTypeId: field.relatedRecordTypeId },
    });
  }
}

export async function ensureSystemMetadata(householdId: string) {
  return runOnce(`system-metadata:${householdId}`, async () => {
    await Promise.all([
      bootstrapPeopleRecordType(householdId),
      bootstrapItemFields(householdId),
      bootstrapItemMultiUpcRecordType(householdId),
    ]);
    await bootstrapTaskRecordType(householdId);
    return true;
  });
}

export function ensureTaskRecordType(householdId: string) {
  return ensureSystemMetadata(householdId);
}

export async function getRecordTypesPageData(searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSystemMetadata(householdId);
  const allRecordTypes = await prisma.recordType.findMany({
    where: { householdId, active: true },
    include: { fields: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
    orderBy: [{ systemType: "desc" }, { name: "asc" }],
  });
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const needle = query.toLocaleLowerCase();
  const recordTypes = query ? allRecordTypes.filter((recordType) => [recordType.name, recordType.description ?? "Manage records in this table."].some((value) => value.toLocaleLowerCase().includes(needle))) : allRecordTypes;
  return { recordTypes, user, query };
}

export async function getRecordTypePageData(id: string) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSystemMetadata(householdId);
  const [recordType, lists, recordTypes] = await Promise.all([
    prisma.recordType.findFirstOrThrow({
      where: { id, householdId },
      include: {
        fields: { orderBy: [{ position: "asc" }, { label: "asc" }], include: { list: true, relatedRecordType: true } },
      },
    }),
    prisma.appList.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }),
    prisma.recordType.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }),
  ]);
  return { recordType, lists, recordTypes, user };
}

export async function getRecordFieldPageData(recordTypeId: string, fieldId?: string) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSystemMetadata(householdId);
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  const field = fieldId
    ? await prisma.recordField.findFirstOrThrow({ where: { id: fieldId, recordTypeId, householdId, key: { not: "name" } } })
    : null;
  const lists = await prisma.appList.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } });
  const recordTypes = await prisma.recordType.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } });
  return { recordType, field, lists, recordTypes, user };
}

export async function getRecordListPageData(id: string, searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSystemMetadata(householdId);
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id, householdId } });
  const { page, pageSize, skip } = parsePagination(searchParams);
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const databasePagination: { skip?: number; take?: number } = query ? {} : { skip, take: pageSize };
  let records: Array<{ id: string; title: string; subtitle: string; href?: string }> = [];
  let total = 0;
  if (recordType.key === "location") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.location.findMany({ where, orderBy: { name: "asc" }, ...databasePagination }), prisma.location.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.notes ?? "Location record" }));
  } else if (recordType.key === "room") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.room.findMany({ where, include: { location: true }, orderBy: { name: "asc" }, ...databasePagination }), prisma.room.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.location.name }));
  } else if (recordType.key === "area") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.area.findMany({ where, include: { location: true, room: true }, orderBy: { name: "asc" }, ...databasePagination }), prisma.area.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: `${row.location.name} / ${row.room.name}` }));
  } else if (recordType.key === "item") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.item.findMany({ where, include: { multiUpcs: { where: { active: true }, select: { upc: true } } }, orderBy: { name: "asc" }, ...databasePagination }), prisma.item.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: [row.upc, ...row.multiUpcs.map((m) => m.upc), row.brand, row.model, row.serialNumber].filter(Boolean).join(" - ") || "Item record" }));
  } else if (recordType.key === "item_multi_upc") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.itemMultiUpc.findMany({ where, include: { item: true }, orderBy: { createdAt: "desc" }, ...databasePagination }), prisma.itemMultiUpc.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.upc, subtitle: row.item.name }));
  } else if (recordType.key === "file") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.fileRecord.findMany({ where, include: { relatedRecordType: true }, orderBy: { updatedAt: "desc" }, ...databasePagination }), prisma.fileRecord.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: `${row.fileName} - ${row.relatedRecordType.name}` }));
  } else if (recordType.key === "people") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.people.findMany({ where, orderBy: { name: "asc" }, ...databasePagination }), prisma.people.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.name, subtitle: [row.employer, row.jobTitle].filter(Boolean).join(" - ") || "People record" }));
  } else if (recordType.key === "task") {
    const where = { householdId };
    const [rows, count] = await Promise.all([prisma.task.findMany({ where, include: { item: true, assignedTo: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }], ...databasePagination }), prisma.task.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: row.title, subtitle: [row.item.name, row.assignedTo?.name ?? "Unassigned", row.dueDate.toLocaleDateString(), row.status].join(" - ") }));
  } else if (recordType.key === "task_schedule") {
    const where = { householdId, active: true };
    const [rows, count] = await Promise.all([prisma.taskSchedule.findMany({ where, include: { assignedTo: true, _count: { select: { itemSchedules: true, tasks: true } } }, orderBy: [{ title: "asc" }, { createdAt: "desc" }], ...databasePagination }), prisma.taskSchedule.count({ where })]); total = count;
    records = rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: [`Every ${row.intervalDays} days`, row.assignedTo?.name ?? "Unassigned", `${row._count.itemSchedules} item${row._count.itemSchedules === 1 ? "" : "s"}`].join(" - "),
    }));
  } else if (recordType.key === "item_putaway") {
    const where = { householdId };
    const [rows, count] = await Promise.all([prisma.itemPutaway.findMany({ where, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, ...databasePagination }), prisma.itemPutaway.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: transactionRecordName(recordType.key, row.transactionNo), subtitle: `${row.item.name} - ${String(row.quantity)} to ${row.itemLocation.location.name} / ${row.itemLocation.room.name} / ${row.itemLocation.area.name}`, href: `/events/putaway/${row.id}` }));
  } else if (recordType.key === "item_transfer") {
    const where = { householdId };
    const [rows, count] = await Promise.all([prisma.itemTransfer.findMany({ where, include: { item: true, fromItemLocation: { include: { area: true } }, toItemLocation: { include: { area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, ...databasePagination }), prisma.itemTransfer.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: transactionRecordName(recordType.key, row.transactionNo), subtitle: `${row.item.name} - ${String(row.quantity)} from ${row.fromItemLocation.area.name} to ${row.toItemLocation.area.name}`, href: `/events/transfer/${row.id}` }));
  } else if (recordType.key === "item_consumption") {
    const where = { householdId };
    const [rows, count] = await Promise.all([prisma.itemConsumption.findMany({ where, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" }, ...databasePagination }), prisma.itemConsumption.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: transactionRecordName(recordType.key, row.transactionNo), subtitle: `${row.item.name} - ${String(row.quantity)} consumed from ${row.itemLocation.location.name} / ${row.itemLocation.room.name} / ${row.itemLocation.area.name}`, href: `/events/consumption/${row.id}` }));
  } else if (recordType.key === "item_maintenance") {
    const where = { householdId };
    const [rows, count] = await Promise.all([prisma.itemMaintenance.findMany({ where, include: { item: true, performedBy: true }, orderBy: { createdAt: "desc" }, ...databasePagination }), prisma.itemMaintenance.count({ where })]); total = count;
    records = rows.map((row) => ({ id: row.id, title: transactionRecordName(recordType.key, row.transactionNo), subtitle: `${row.item.name} - ${row.maintenanceType}`, href: `/events/maintenance/${row.id}` }));
  }
  if (query) {
    const needle = query.toLocaleLowerCase();
    records = records.filter((record) => `${record.title} ${record.subtitle}`.toLocaleLowerCase().includes(needle));
    total = records.length;
    records = records.slice(skip, skip + pageSize);
  }
  return { recordType, records, user, query, pagination: paginationResult(total, page, pageSize) };
}

async function getAttachableRecordTypes(householdId: string) {
  return prisma.recordType.findMany({
    where: { householdId, active: true, key: { not: "file" } },
    select: { id: true, key: true, name: true },
    orderBy: [{ systemType: "desc" }, { name: "asc" }],
  });
}

async function getRecordLabel(householdId: string, recordTypeKey: string, recordId: string) {
  if (recordTypeKey === "location") return (await prisma.location.findFirst({ where: { id: recordId, householdId }, select: { name: true } }))?.name;
  if (recordTypeKey === "room") return (await prisma.room.findFirst({ where: { id: recordId, householdId }, select: { name: true } }))?.name;
  if (recordTypeKey === "area") return (await prisma.area.findFirst({ where: { id: recordId, householdId }, select: { name: true } }))?.name;
  if (recordTypeKey === "item") return (await prisma.item.findFirst({ where: { id: recordId, householdId }, select: { name: true } }))?.name;
  if (recordTypeKey === "item_multi_upc") return (await prisma.itemMultiUpc.findFirst({ where: { id: recordId, householdId }, select: { upc: true } }))?.upc;
  if (recordTypeKey === "people") return (await prisma.people.findFirst({ where: { id: recordId, householdId }, select: { name: true } }))?.name;
  if (recordTypeKey === "task") return (await prisma.task.findFirst({ where: { id: recordId, householdId }, select: { title: true } }))?.title;
  if (recordTypeKey === "task_schedule") return (await prisma.taskSchedule.findFirst({ where: { id: recordId, householdId }, select: { title: true } }))?.title;
  if (recordTypeKey === "item_putaway") {
    const row = await prisma.itemPutaway.findFirst({ where: { id: recordId, householdId }, select: { transactionNo: true } });
    return row ? transactionRecordName("item_putaway", row.transactionNo) : undefined;
  }
  if (recordTypeKey === "item_transfer") {
    const row = await prisma.itemTransfer.findFirst({ where: { id: recordId, householdId }, select: { transactionNo: true } });
    return row ? transactionRecordName("item_transfer", row.transactionNo) : undefined;
  }
  if (recordTypeKey === "item_consumption") {
    const row = await prisma.itemConsumption.findFirst({ where: { id: recordId, householdId }, select: { transactionNo: true } });
    return row ? transactionRecordName("item_consumption", row.transactionNo) : undefined;
  }
  if (recordTypeKey === "item_maintenance") {
    const row = await prisma.itemMaintenance.findFirst({ where: { id: recordId, householdId }, select: { transactionNo: true } });
    return row ? transactionRecordName("item_maintenance", row.transactionNo) : undefined;
  }
  return undefined;
}

type ConcreteRecordQueryOptions = {
  mode?: "new" | "edit" | "view";
  tab?: string;
  taskTab?: string;
};

function defaultRecordTab(recordTypeKey: string) {
  if (recordTypeKey === "task_schedule") return "items";
  if (recordTypeKey === "task") return "transactions";
  return "activity";
}

async function getConcreteRecord(householdId: string, recordTypeKey: string, recordId: string | undefined, includeItemLocations: boolean) {
  if (!recordId) return null;
  if (recordTypeKey === "location") return prisma.location.findFirstOrThrow({ where: { id: recordId, householdId } });
  if (recordTypeKey === "room") return prisma.room.findFirstOrThrow({ where: { id: recordId, householdId } });
  if (recordTypeKey === "area") return prisma.area.findFirstOrThrow({ where: { id: recordId, householdId } });
  if (recordTypeKey === "item_multi_upc") return prisma.itemMultiUpc.findFirstOrThrow({ where: { id: recordId, householdId }, include: { item: true } });
  if (recordTypeKey === "people") return prisma.people.findFirstOrThrow({ where: { id: recordId, householdId }, include: { user: true } });
  if (recordTypeKey === "task") return prisma.task.findFirstOrThrow({ where: { id: recordId, householdId }, include: { item: true, taskSchedule: true, assignedTo: true, completedBy: true, maintenanceRecord: true } });
  if (recordTypeKey === "task_schedule") return prisma.taskSchedule.findFirstOrThrow({ where: { id: recordId, householdId }, include: { assignedTo: true } });
  if (recordTypeKey === "item") {
    return prisma.item.findFirstOrThrow({
      where: { id: recordId, householdId },
      include: {
        multiUpcs: { where: { active: true }, select: { id: true, upc: true }, orderBy: { createdAt: "asc" } },
        ...(includeItemLocations ? {
          itemLocations: {
            where: { quantity: { gt: 0 } },
            include: { location: true, room: true, area: true },
            orderBy: [{ location: { name: "asc" as const } }, { room: { name: "asc" as const } }, { area: { name: "asc" as const } }],
          },
        } : {}),
      },
    });
  }
  if (recordTypeKey === "file") return prisma.fileRecord.findFirstOrThrow({ where: { id: recordId, householdId }, include: { relatedRecordType: true } });
  return null;
}

async function getItemTransactions(householdId: string, itemId: string) {
  const [putaways, transfers, consumptions, maintenance, loans] = await Promise.all([
    prisma.itemPutaway.findMany({ where: { householdId, itemId }, include: { itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemTransfer.findMany({ where: { householdId, itemId }, include: { fromItemLocation: { include: { location: true, room: true, area: true } }, toItemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemConsumption.findMany({ where: { householdId, itemId }, include: { itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemMaintenance.findMany({ where: { householdId, itemId }, include: { performedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.itemLoan.findMany({ where: { householdId, itemId }, include: { borrower: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return [
    ...putaways.map((row) => ({
      id: `putaway:${row.id}`,
      href: `/events/putaway/${row.id}`,
      type: "Putaway",
      transaction: transactionRecordName("putaway", row.transactionNo),
      timestamp: row.createdAt,
      summary: `${String(row.quantity)} to ${row.itemLocation?.location?.name ?? "Location"} / ${row.itemLocation?.room?.name ?? "Room"} / ${row.itemLocation?.area?.name ?? "Area"}`,
    })),
    ...transfers.map((row) => ({
      id: `transfer:${row.id}`,
      href: `/events/transfer/${row.id}`,
      type: "Transfer",
      transaction: transactionRecordName("transfer", row.transactionNo),
      timestamp: row.createdAt,
      summary: `${String(row.quantity)} from ${row.fromItemLocation?.location?.name ?? "Location"} / ${row.fromItemLocation?.room?.name ?? "Room"} / ${row.fromItemLocation?.area?.name ?? "Area"} to ${row.toItemLocation?.location?.name ?? "Location"} / ${row.toItemLocation?.room?.name ?? "Room"} / ${row.toItemLocation?.area?.name ?? "Area"}`,
    })),
    ...consumptions.map((row) => ({
      id: `consumption:${row.id}`,
      href: `/events/consumption/${row.id}`,
      type: "Consumption",
      transaction: transactionRecordName("consumption", row.transactionNo),
      timestamp: row.createdAt,
      summary: `${String(row.quantity)} consumed from ${row.itemLocation?.location?.name ?? "Location"} / ${row.itemLocation?.room?.name ?? "Room"} / ${row.itemLocation?.area?.name ?? "Area"}`,
    })),
    ...maintenance.map((row) => ({
      id: `maintenance:${row.id}`,
      href: `/events/maintenance/${row.id}`,
      type: "Maintenance",
      transaction: transactionRecordName("maintenance", row.transactionNo),
      timestamp: row.createdAt,
      summary: `${row.maintenanceType}${row.nextDueDate ? ` - next due ${row.nextDueDate.toLocaleDateString()}` : ""}`,
    })),
    ...loans.map((row) => ({
      id: `loan:${row.id}`,
      href: `/events/loan/${row.id}`,
      type: "Loan",
      transaction: transactionRecordName("loan", row.transactionNo),
      timestamp: row.createdAt,
      summary: `Loaned to ${row.borrower.name}${row.actualReturnDate ? " (Returned)" : " (Active)"}${row.expectedReturnDate ? ` - Due ${row.expectedReturnDate.toLocaleDateString()}` : ""}`,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function getConcreteRecordPageData(recordTypeId: string, recordId?: string, options: ConcreteRecordQueryOptions = {}) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSystemMetadata(householdId);
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  const isForm = !recordId || options.mode === "edit";
  const activeTab = recordId && !isForm ? options.tab || defaultRecordTab(recordType.key) : null;
  const selectedTaskTab = options.taskTab === "schedules" ? "schedules" : "tasks";
  const needsItemSchedules = recordType.key === "item" && activeTab === "tasks" && selectedTaskTab === "schedules";
  const needsScheduleItems = recordType.key === "task_schedule" && activeTab === "items";
  const activityRecordTypeByKey: Record<string, string> = { location: "Location", room: "Room", area: "Area", item: "Item", file: "FileRecord", people: "People", task: "Task" };

  const [locations, rooms, record, attachableRecordTypes, systemRecordTypes, peopleLists, peopleRelationshipOptions, taskPeopleOptions, taskItemOptions, taskScheduleOptions, itemTaskSchedules, allItemScheduleOptions, scheduleItemAssignments, allScheduleItemOptions, attachedFiles, itemTransactions, itemTasks, taskTransactions, activity, itemActiveLoan, itemMaintenanceLogs, itemTotalQuantityAgg, peopleActiveLoans, peopleLoans] = await Promise.all([
    recordType.key === "room" || recordType.key === "area" ? prisma.location.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    recordType.key === "area" ? prisma.room.findMany({ where: { householdId, active: true }, include: { location: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    getConcreteRecord(householdId, recordType.key, recordId, activeTab === "item-location"),
    recordType.key === "file" ? getAttachableRecordTypes(householdId) : Promise.resolve([]),
    prisma.recordType.findMany({ where: { householdId, active: true, key: { in: ["file", "people", "task", "task_schedule", "item", "item_multi_upc", "location", "room", "area"] } }, select: { id: true, key: true } }),
    recordType.key === "people" ? prisma.appList.findMany({ where: { householdId, active: true, key: { in: ["people_relationship_type", "people_interests"] } }, include: { options: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } } }) : Promise.resolve([]),
    recordType.key === "people" ? prisma.people.findMany({ where: { householdId, active: true, ...(recordId ? { id: { not: recordId } } : {}) }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    (recordType.key === "task" || recordType.key === "task_schedule") && isForm ? getEligibleTaskAssignees(householdId) : Promise.resolve([]),
    (recordType.key === "task" || recordType.key === "item_multi_upc") && isForm ? prisma.item.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, brand: true, model: true } }) : Promise.resolve([]),
    recordType.key === "task" && isForm ? prisma.taskSchedule.findMany({ where: { householdId, active: true }, orderBy: [{ title: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, intervalDays: true, assignedToId: true } }) : Promise.resolve([]),
    recordId && needsItemSchedules ? prisma.itemTaskSchedule.findMany({
        where: { householdId, itemId: recordId },
        include: { taskSchedule: { include: { assignedTo: true } } },
        orderBy: [{ taskSchedule: { title: "asc" } }, { createdAt: "asc" }],
      }) : Promise.resolve([]),
    needsItemSchedules ? prisma.taskSchedule.findMany({
        where: { householdId, active: true },
        orderBy: [{ title: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, intervalDays: true },
      }) : Promise.resolve([]),
    recordId && needsScheduleItems ? prisma.itemTaskSchedule.findMany({
        where: { householdId, taskScheduleId: recordId },
        include: { item: true, assignedBy: true },
        orderBy: [{ item: { name: "asc" } }, { createdAt: "asc" }],
      }) : Promise.resolve([]),
    needsScheduleItems ? prisma.item.findMany({
        where: { householdId, active: true },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, brand: true, model: true },
      }) : Promise.resolve([]),
    recordId && activeTab === "files" && recordType.key !== "file" ? prisma.fileRecord.findMany({ where: { householdId, active: true, relatedRecordTypeId: recordType.id, relatedRecordId: recordId }, orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
    recordId && recordType.key === "item" && activeTab === "transactions" ? getItemTransactions(householdId, recordId) : Promise.resolve([]),
    recordId && recordType.key === "item" && activeTab === "tasks" && selectedTaskTab === "tasks" ? prisma.task.findMany({ where: { householdId, itemId: recordId }, include: { assignedTo: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] }) : Promise.resolve([]),
    recordId && recordType.key === "task" && activeTab === "transactions" ? prisma.itemMaintenance.findMany({
        where: { householdId, completedTask: { id: recordId } },
        include: { item: true, performedBy: true },
        orderBy: { createdAt: "desc" },
      }) : Promise.resolve([]),
    recordId && activeTab === "activity" ? prisma.activityLog.findMany({
        where: { householdId, recordType: activityRecordTypeByKey[recordType.key] ?? recordType.key, recordId },
        include: { people: true },
        orderBy: { createdAt: "desc" },
      }) : Promise.resolve([]),
    recordId && recordType.key === "item" ? prisma.itemLoan.findFirst({ where: { householdId, itemId: recordId, actualReturnDate: null, active: true }, include: { borrower: true } }) : Promise.resolve(null),
    recordId && recordType.key === "item" ? prisma.itemMaintenance.findMany({ where: { householdId, itemId: recordId, active: true }, select: { cost: true } }) : Promise.resolve([]),
    recordId && recordType.key === "item" ? prisma.itemLocation.aggregate({ where: { householdId, itemId: recordId, quantity: { gt: 0 } }, _sum: { quantity: true } }) : Promise.resolve({ _sum: { quantity: null } }),
    recordId && recordType.key === "people" ? prisma.itemLoan.findMany({ where: { householdId, borrowerId: recordId, actualReturnDate: null, active: true }, include: { item: true }, orderBy: { loanDate: "desc" } }) : Promise.resolve([]),
    recordId && recordType.key === "people" && (activeTab === "loans" || !activeTab) ? prisma.itemLoan.findMany({ where: { householdId, borrowerId: recordId, active: true }, include: { item: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);

  const recordTypeByKey = new Map(systemRecordTypes.map((next) => [next.key, next]));
  const relationshipList = peopleLists.find((list) => list.key === "people_relationship_type") ?? null;
  const interestsList = peopleLists.find((list) => list.key === "people_interests") ?? null;
  const itemScheduleOptions = allItemScheduleOptions.filter((schedule) => !itemTaskSchedules.some((row) => row.taskScheduleId === schedule.id));
  const scheduleItemOptions = allScheduleItemOptions.filter((item) => !scheduleItemAssignments.some((row) => row.itemId === item.id));
  const fileRecord = recordType.key === "file" && record && typeof record === "object"
    ? record as unknown as { relatedRecordType: { key: string }; relatedRecordId: string }
    : null;
  const relatedRecordLabel = fileRecord
    ? await getRecordLabel(householdId, fileRecord.relatedRecordType.key, fileRecord.relatedRecordId) ?? null
    : null;
  const normalizedTaskTransactions = taskTransactions.map((row) => ({
    id: row.id,
    href: `/events/maintenance/${row.id}`,
    transaction: transactionRecordName("maintenance", row.transactionNo),
    timestamp: row.createdAt,
    summary: `${row.item.name} - ${row.maintenanceType}`,
    performedById: row.performedById,
    performedBy: row.performedBy.name,
  }));

  const itemTco = record && recordType.key === "item" && typeof record === "object" && "createdAt" in record
    ? calculateTco({
        purchasePrice: "purchasePrice" in record && record.purchasePrice ? Number(record.purchasePrice) : null,
        purchaseDate: "purchaseDate" in record && record.purchaseDate instanceof Date ? record.purchaseDate : null,
        createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(),
        maintenanceCosts: itemMaintenanceLogs.map((m) => m.cost ? Number(m.cost) : 0),
      })
    : null;

  if (recordType.key === "people" && record && user.role !== "ADMINISTRATOR") {
    (record as { pin?: string | null }).pin = null;
  }

  return {
    recordType,
    record,
    locations,
    rooms,
    attachableRecordTypes,
    relatedRecordLabel,
    attachedFiles,
    fileRecordType: recordType.key === "file" ? null : recordTypeByKey.get("file") ?? null,
    peopleLists: { relationship: relationshipList, interests: interestsList, people: peopleRelationshipOptions },
    peopleRecordType: recordTypeByKey.get("people") ?? null,
    taskPeopleOptions,
    taskItemOptions,
    taskScheduleOptions,
    itemTaskSchedules,
    itemScheduleOptions,
    scheduleItemAssignments,
    scheduleItemOptions,
    taskRecordType: recordTypeByKey.get("task") ?? null,
    taskScheduleRecordType: recordTypeByKey.get("task_schedule") ?? null,
    itemRecordType: recordTypeByKey.get("item") ?? null,
    locationRecordType: recordTypeByKey.get("location") ?? null,
    roomRecordType: recordTypeByKey.get("room") ?? null,
    areaRecordType: recordTypeByKey.get("area") ?? null,
    itemTransactions,
    itemTasks,
    taskTransactions: normalizedTaskTransactions,
    activity,
    itemActiveLoan,
    itemTco,
    itemTotalQuantity: Number(itemTotalQuantityAgg._sum.quantity ?? 0),
    peopleActiveLoans,
    peopleLoans,
    user,
  };
}

export async function getListsPageData() {
  const { householdId, user } = await requireHouseholdContext();
  const lists = await prisma.appList.findMany({
    where: { householdId, active: true },
    include: { options: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] }, fields: { include: { recordType: true } } },
    orderBy: { name: "asc" },
  });
  return { lists, user };
}

export async function getListPageData(id: string) {
  const { householdId, user } = await requireHouseholdContext();
  const list = await prisma.appList.findFirstOrThrow({
    where: { id, householdId },
    include: { options: { orderBy: [{ position: "asc" }, { label: "asc" }] }, fields: { include: { recordType: true } } },
  });
  return { list, user };
}

export async function getListOptionPageData(listId: string, optionId?: string) {
  const { householdId, user } = await requireHouseholdContext();
  const list = await prisma.appList.findFirstOrThrow({ where: { id: listId, householdId } });
  const option = optionId
    ? await prisma.appListOption.findFirstOrThrow({ where: { id: optionId, listId, householdId } })
    : null;
  return { list, option, user };
}
