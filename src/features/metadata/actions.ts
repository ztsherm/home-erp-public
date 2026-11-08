"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireAdministrator, requireHouseholdContext } from "@/server/auth/context";
import { dateValue, numberValue, text } from "@/features/shared/form";
import { saveUploadedFile, saveUploadedImage } from "@/features/shared/uploads";
import { normalizeRecordIcon } from "@/components/record-icon";
import { assertEligibleTaskAssignee } from "@/features/tasks/assignees";
import { invalidateShellCreateData } from "@/server/cache";
import { assertValidPin } from "@/features/auth/pin";
import { recordItemUpc } from "@/features/inventory/actions";
import { nextTaskDateFromCompletion, startOfDay } from "@/features/tasks/schedule";

function keyFromLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function fieldKind(value?: string) {
  if (value === "DATE" || value === "INTEGER" || value === "CHECKBOX" || value === "LIST" || value === "RECORD") return value;
  return "FREE_TEXT";
}

async function ensureRequiredNameField(householdId: string, recordTypeId: string) {
  await prisma.recordField.upsert({
    where: { recordTypeId_key: { recordTypeId, key: "name" } },
    update: {
      label: "Name",
      kind: "FREE_TEXT",
      required: true,
      active: true,
      listId: null,
      relatedRecordTypeId: null,
      position: 0,
    },
    create: {
      householdId,
      recordTypeId,
      label: "Name",
      key: "name",
      kind: "FREE_TEXT",
      required: true,
      position: 0,
    },
  });
}

function recordHref(recordTypeId: string, recordTypeKey: string, recordId: string, tab?: string) {
  const suffix = tab ? `?tab=${tab}` : "";
  if (recordTypeKey === "item_putaway") return `/events/putaway/${recordId}${suffix}`;
  if (recordTypeKey === "item_transfer") return `/events/transfer/${recordId}${suffix}`;
  if (recordTypeKey === "item_consumption") return `/events/consumption/${recordId}${suffix}`;
  if (recordTypeKey === "item_maintenance") return `/events/maintenance/${recordId}${suffix}`;
  if (recordTypeKey === "item_loan") return `/events/loan/${recordId}${suffix}`;
  return `/records/${recordTypeId}/${recordId}${suffix}`;
}

async function seedInitialTaskForItemSchedule(householdId: string, itemId: string, taskScheduleId: string) {
  const schedule = await prisma.taskSchedule.findFirstOrThrow({ where: { id: taskScheduleId, householdId, active: true }, select: { id: true, title: true, assignedToId: true } });
  const existing = await prisma.task.findFirst({ where: { householdId, itemId, taskScheduleId, status: "OPEN" }, select: { id: true } });
  if (existing) return;
  const today = startOfDay(new Date());
  const pendingNext = await prisma.task.findFirst({
    where: { householdId, itemId, taskScheduleId, nextTaskDate: { not: null } },
    select: { id: true, nextTaskDate: true },
    orderBy: { nextTaskDate: "asc" },
  });
  if (pendingNext?.nextTaskDate && pendingNext.nextTaskDate > today) return;
  await prisma.task.create({
    data: {
      householdId,
      itemId,
      taskScheduleId,
      title: schedule.title,
      assignedToId: schedule.assignedToId,
      dueDate: pendingNext?.nextTaskDate ?? today,
    },
  });
  if (pendingNext) await prisma.task.update({ where: { id: pendingNext.id }, data: { nextTaskDate: null } });
}

async function completeTaskRecord(taskId: string, householdId: string, completedById: string, completedAt: Date, notes?: string | null) {
  const task = await prisma.task.findFirstOrThrow({ where: { id: taskId, householdId }, include: { item: true, taskSchedule: true, maintenanceRecord: true } });
  if (task.status === "COMPLETED" && task.maintenanceRecord) return task;
  const maintenance = task.maintenanceRecord ?? await prisma.itemMaintenance.create({
    data: {
      householdId,
      itemId: task.itemId,
      maintenanceType: task.title,
      performedById: completedById,
      notes: notes ?? task.notes,
    },
  });
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt,
      completedDate: startOfDay(completedAt),
      completedById,
      nextTaskDate: task.taskSchedule ? nextTaskDateFromCompletion(completedAt, task.taskSchedule.intervalDays) : null,
      maintenanceRecordId: maintenance.id,
      assignedToId: task.assignedToId ?? completedById,
      skippedAt: null,
    },
  });
}

export async function assignItemTaskSchedule(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const itemId = text(formData, "itemId");
  const taskScheduleId = text(formData, "taskScheduleId");
  const returnTo = text(formData, "returnTo") ?? "/records";
  if (!itemId || !taskScheduleId) throw new Error("Item and task schedule are required");
  await Promise.all([
    prisma.item.findFirstOrThrow({ where: { id: itemId, householdId, active: true }, select: { id: true } }),
    prisma.taskSchedule.findFirstOrThrow({ where: { id: taskScheduleId, householdId, active: true }, select: { id: true } }),
  ]);
  await prisma.itemTaskSchedule.upsert({
    where: { householdId_itemId_taskScheduleId: { householdId, itemId, taskScheduleId } },
    update: {},
    create: { householdId, itemId, taskScheduleId, assignedById: user.peopleId },
  });
  await seedInitialTaskForItemSchedule(householdId, itemId, taskScheduleId);
  invalidateShellCreateData();
  revalidatePath(returnTo);
  revalidatePath("/tasks");
  revalidatePath("/");
  redirect(returnTo);
}

export async function removeItemTaskSchedule(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const itemId = text(formData, "itemId");
  const taskScheduleId = text(formData, "taskScheduleId");
  const returnTo = text(formData, "returnTo") ?? "/records";
  if (!itemId || !taskScheduleId) throw new Error("Item and task schedule are required");
  await prisma.itemTaskSchedule.deleteMany({ where: { householdId, itemId, taskScheduleId } });
  invalidateShellCreateData();
  revalidatePath(returnTo);
  revalidatePath("/tasks");
  revalidatePath("/");
  redirect(returnTo);
}

export async function createRecordType(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const name = text(formData, "name") ?? "New record type";
  const key = keyFromLabel(name);
  const recordType = await prisma.recordType.create({
    data: {
      householdId,
      name,
      key,
      icon: normalizeRecordIcon(text(formData, "icon")),
      description: text(formData, "description"),
      systemType: false,
      editableRecords: true,
    },
  });
  await ensureRequiredNameField(householdId, recordType.id);
  invalidateShellCreateData();
  revalidatePath("/customize");
  revalidatePath("/customize/records");
  redirect(`/customize/${recordType.id}`);
}

export async function updateRecordType(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Record type id is required");
  const existing = await prisma.recordType.findFirstOrThrow({ where: { id, householdId } });
  const name = text(formData, "name") ?? "Record type";
  await prisma.recordType.update({
    where: { id },
    data: {
      name,
      key: existing.key,
      icon: normalizeRecordIcon(text(formData, "icon")),
      description: text(formData, "description"),
      editableRecords: formData.get("editableRecords") === "on",
    },
  });
  await ensureRequiredNameField(householdId, id);
  invalidateShellCreateData();
  revalidatePath("/customize");
  revalidatePath("/customize/records");
  revalidatePath("/records");
  revalidatePath(`/records/${id}`);
  revalidatePath(`/customize/${id}`);
}

export async function createRecordField(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const recordTypeId = text(formData, "recordTypeId");
  if (!recordTypeId) throw new Error("Record type is required");
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  const label = text(formData, "label") ?? "New field";
  const kind = fieldKind(text(formData, "kind"));
  const position = await prisma.recordField.count({ where: { recordTypeId: recordType.id, householdId } });
  await prisma.recordField.create({
    data: {
      householdId,
      recordTypeId: recordType.id,
      label,
      key: keyFromLabel(text(formData, "key") ?? label),
      kind,
      required: formData.get("required") === "on",
      position,
      listId: kind === "LIST" ? text(formData, "listId") : undefined,
      relatedRecordTypeId: kind === "RECORD" ? text(formData, "relatedRecordTypeId") : undefined,
    },
  });
  invalidateShellCreateData();
  revalidatePath(`/customize/${recordType.id}`);
  redirect(`/customize/${recordType.id}`);
}

export async function updateRecordField(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Field id is required");
  const existing = await prisma.recordField.findFirstOrThrow({ where: { id, householdId } });
  const isNameField = existing.key === "name";
  const label = isNameField ? "Name" : text(formData, "label") ?? existing.label;
  const kind = isNameField ? "FREE_TEXT" : fieldKind(text(formData, "kind"));
  await prisma.recordField.update({
    where: { id },
    data: {
      label,
      key: isNameField ? "name" : keyFromLabel(text(formData, "key") ?? label),
      kind,
      required: isNameField ? true : formData.get("required") === "on",
      position: existing.position,
      listId: kind === "LIST" ? text(formData, "listId") : null,
      relatedRecordTypeId: kind === "RECORD" ? text(formData, "relatedRecordTypeId") : null,
      active: isNameField ? true : formData.get("active") === "on",
    },
  });
  invalidateShellCreateData();
  revalidatePath(`/customize/${existing.recordTypeId}`);
  redirect(`/customize/${existing.recordTypeId}`);
}

export async function reorderRecordFields(recordTypeId: string, fieldIds: string[]) {
  const { householdId } = await requireAdministrator();
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  const existingFields = await prisma.recordField.findMany({
    where: { recordTypeId: recordType.id, householdId, id: { in: fieldIds }, key: { not: "name" } },
    select: { id: true },
  });
  const existingIds = new Set(existingFields.map((field) => field.id));
  await prisma.$transaction(
    fieldIds
      .filter((id) => existingIds.has(id))
      .map((id, index) => prisma.recordField.update({ where: { id }, data: { position: index + 1 } })),
  );
  invalidateShellCreateData();
  revalidatePath(`/customize/${recordType.id}`);
}

export async function createList(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const name = text(formData, "name") ?? "New list";
  const list = await prisma.appList.create({
    data: {
      householdId,
      name,
      key: keyFromLabel(name),
      selectionMode: text(formData, "selectionMode") === "MULTI" ? "MULTI" : "SINGLE",
    },
  });
  invalidateShellCreateData();
  revalidatePath("/lists");
  revalidatePath("/customize/lists");
  redirect(`/customize/lists/${list.id}`);
}

export async function updateList(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("List id is required");
  const existing = await prisma.appList.findFirstOrThrow({ where: { id, householdId } });
  const name = text(formData, "name") ?? "List";
  await prisma.appList.update({
    where: { id },
    data: {
      name,
      key: existing.key,
      selectionMode: text(formData, "selectionMode") === "MULTI" ? "MULTI" : "SINGLE",
      allowAddOnRecord: formData.get("allowAddOnRecord") !== "off",
      active: formData.get("active") === "on",
    },
  });
  invalidateShellCreateData();
  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);
  revalidatePath("/customize/lists");
  revalidatePath(`/customize/lists/${id}`);
}

export async function createListOptionInline(listId: string, label: string) {
  const { householdId } = await requireHouseholdContext();
  const list = await prisma.appList.findFirstOrThrow({ where: { id: listId, householdId, active: true } });
  if (!list.allowAddOnRecord) throw new Error("This list does not allow adding options from records");
  const cleanLabel = label.trim();
  if (!cleanLabel) throw new Error("Option label is required");
  const value = keyFromLabel(cleanLabel);
  const position = await prisma.appListOption.count({ where: { listId, householdId } });
  const option = await prisma.appListOption.upsert({
    where: { listId_value: { listId, value } },
    update: { label: cleanLabel, active: true },
    create: { householdId, listId, label: cleanLabel, value, position },
    select: { id: true, label: true },
  });
  invalidateShellCreateData();
  revalidatePath("/records");
  revalidatePath(`/lists/${list.id}`);
  return option;
}

export async function createListOption(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const listId = text(formData, "listId");
  if (!listId) throw new Error("List is required");
  const list = await prisma.appList.findFirstOrThrow({ where: { id: listId, householdId } });
  const label = text(formData, "label") ?? "New option";
  const position = await prisma.appListOption.count({ where: { listId: list.id, householdId } });
  await prisma.appListOption.create({
    data: {
      householdId,
      listId: list.id,
      label,
      value: keyFromLabel(label),
      position,
    },
  });
  invalidateShellCreateData();
  revalidatePath(`/lists/${list.id}`);
  revalidatePath(`/customize/lists/${list.id}`);
  redirect(`/customize/lists/${list.id}`);
}

export async function updateListOption(formData: FormData) {
  const { householdId } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Option id is required");
  const existing = await prisma.appListOption.findFirstOrThrow({ where: { id, householdId } });
  const label = text(formData, "label") ?? existing.label;
  await prisma.appListOption.update({
    where: { id },
    data: {
      label,
      value: existing.value,
      position: existing.position,
      active: formData.get("active") === "on",
    },
  });
  invalidateShellCreateData();
  revalidatePath(`/lists/${existing.listId}`);
  revalidatePath(`/customize/lists/${existing.listId}`);
  redirect(`/customize/lists/${existing.listId}`);
}

export async function reorderListOptions(listId: string, optionIds: string[]) {
  const { householdId } = await requireAdministrator();
  const list = await prisma.appList.findFirstOrThrow({ where: { id: listId, householdId } });
  const existingOptions = await prisma.appListOption.findMany({
    where: { listId: list.id, householdId, id: { in: optionIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingOptions.map((option) => option.id));
  await prisma.$transaction(
    optionIds
      .filter((id) => existingIds.has(id))
      .map((id, index) => prisma.appListOption.update({ where: { id }, data: { position: index } })),
  );
  invalidateShellCreateData();
  revalidatePath(`/lists/${list.id}`);
  revalidatePath(`/customize/lists/${list.id}`);
}

async function getRecordTypeForWrite(recordTypeId: string) {
  const { householdId, user } = await requireHouseholdContext();
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  if (recordType.editableRecords && user.role !== "ADMINISTRATOR") throw new Error("Administrator access required");
  return { householdId, user, recordType };
}

async function assertConcreteRecordNotReferenced(householdId: string, recordTypeId: string, recordTypeKey: string, id: string) {
  const fileReferences = await prisma.fileRecord.count({ where: { householdId, active: true, relatedRecordTypeId: recordTypeId, relatedRecordId: id, NOT: { id } } });
  const counts = [fileReferences];
  if (recordTypeKey === "location") counts.push(await prisma.room.count({ where: { householdId, locationId: id } }), await prisma.area.count({ where: { householdId, locationId: id } }), await prisma.itemLocation.count({ where: { householdId, locationId: id } }), await prisma.itemPutaway.count({ where: { householdId, locationId: id } }), await prisma.itemConsumption.count({ where: { householdId, locationId: id } }));
  if (recordTypeKey === "room") counts.push(await prisma.area.count({ where: { householdId, roomId: id } }), await prisma.itemLocation.count({ where: { householdId, roomId: id } }), await prisma.itemPutaway.count({ where: { householdId, roomId: id } }), await prisma.itemConsumption.count({ where: { householdId, roomId: id } }));
  if (recordTypeKey === "area") counts.push(await prisma.itemLocation.count({ where: { householdId, areaId: id } }), await prisma.itemPutaway.count({ where: { householdId, areaId: id } }), await prisma.itemConsumption.count({ where: { householdId, areaId: id } }));
  if (recordTypeKey === "item") counts.push(await prisma.itemLocation.count({ where: { householdId, itemId: id } }), await prisma.itemPutaway.count({ where: { householdId, itemId: id } }), await prisma.itemTransfer.count({ where: { householdId, itemId: id } }), await prisma.itemConsumption.count({ where: { householdId, itemId: id } }), await prisma.itemMaintenance.count({ where: { householdId, itemId: id } }), await prisma.itemLoan.count({ where: { householdId, itemId: id } }), await prisma.task.count({ where: { householdId, itemId: id } }), await prisma.itemTaskSchedule.count({ where: { householdId, itemId: id } }), await prisma.itemMultiUpc.count({ where: { householdId, itemId: id } }));
  if (recordTypeKey === "people") counts.push(await prisma.user.count({ where: { householdId, peopleId: id } }), await prisma.itemPutaway.count({ where: { householdId, performedById: id } }), await prisma.itemTransfer.count({ where: { householdId, performedById: id } }), await prisma.itemConsumption.count({ where: { householdId, performedById: id } }), await prisma.itemMaintenance.count({ where: { householdId, performedById: id } }), await prisma.itemLoan.count({ where: { householdId, borrowerId: id } }), await prisma.task.count({ where: { householdId, assignedToId: id } }), await prisma.task.count({ where: { householdId, completedById: id } }), await prisma.taskSchedule.count({ where: { householdId, assignedToId: id } }), await prisma.itemTaskSchedule.count({ where: { householdId, assignedById: id } }));
  if (recordTypeKey === "task") counts.push(await prisma.itemMaintenance.count({ where: { householdId, completedTask: { id } } }));
  if (recordTypeKey === "task_schedule") counts.push(await prisma.task.count({ where: { householdId, taskScheduleId: id } }), await prisma.itemTaskSchedule.count({ where: { householdId, taskScheduleId: id } }));
  if (counts.some((count) => count > 0)) throw new Error("Cannot delete this record because another record refers to it. Inactivate it instead.");
}

export async function saveConcreteRecord(formData: FormData) {
  const recordTypeId = text(formData, "recordTypeId");
  if (!recordTypeId) throw new Error("Record type is required");
  const id = text(formData, "id");
  const { householdId, user, recordType } = await getRecordTypeForWrite(recordTypeId);
  const active = id ? formData.get("active") === "on" : true;
  let redirectHref: string | undefined;
  if (recordType.key === "location") {
    if (id) await prisma.location.update({ where: { id }, data: { name: text(formData, "name") ?? "Location", notes: text(formData, "notes"), active } });
    else await prisma.location.create({ data: { householdId, name: text(formData, "name") ?? "Location", notes: text(formData, "notes"), active } });
  } else if (recordType.key === "room") {
    const locationId = text(formData, "locationId");
    if (!locationId) throw new Error("Location is required");
    if (id) await prisma.room.update({ where: { id }, data: { locationId, name: text(formData, "name") ?? "Room", notes: text(formData, "notes"), active } });
    else await prisma.room.create({ data: { householdId, locationId, name: text(formData, "name") ?? "Room", notes: text(formData, "notes"), active } });
  } else if (recordType.key === "area") {
    const roomId = text(formData, "roomId");
    const locationId = text(formData, "locationId");
    if (!roomId) throw new Error("Room is required");
    const room = await prisma.room.findFirstOrThrow({ where: { id: roomId, householdId, ...(locationId ? { locationId } : {}) } });
    if (id) await prisma.area.update({ where: { id }, data: { locationId: room.locationId, roomId, name: text(formData, "name") ?? "Area", notes: text(formData, "notes"), active } });
    else await prisma.area.create({ data: { householdId, locationId: room.locationId, roomId, name: text(formData, "name") ?? "Area", notes: text(formData, "notes"), active } });
  } else if (recordType.key === "item") {
    const photoUrl = await saveUploadedImage(formData, "photo", "items");
    const minQuantity = text(formData, "minQuantity") ? numberValue(formData, "minQuantity") : null;
    const targetQuantity = text(formData, "targetQuantity") ? numberValue(formData, "targetQuantity") : null;
    const purchasePrice = text(formData, "purchasePrice") ? text(formData, "purchasePrice") : null;
    const purchaseDate = dateValue(formData, "purchaseDate") ?? null;
    const itemData = {
      name: text(formData, "name") ?? "Item",
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serialNumber: text(formData, "serialNumber"),
      upc: text(formData, "upc"),
      minQuantity,
      targetQuantity,
      purchasePrice,
      purchaseDate,
      notes: text(formData, "notes"),
      active,
    };
    if (id) {
      const updated = await prisma.item.update({ where: { id }, data: { ...itemData, ...(photoUrl ? { photoUrl } : {}) } });
      if (itemData.upc) await recordItemUpc(householdId, updated.id, itemData.upc);
    } else {
      const created = await prisma.item.create({ data: { householdId, ...itemData, photoUrl } });
      if (itemData.upc) await recordItemUpc(householdId, created.id, itemData.upc);
    }
  } else if (recordType.key === "item_multi_upc") {
    const upc = (text(formData, "upc") ?? text(formData, "name") ?? "").trim();
    const itemId = text(formData, "itemId") ?? text(formData, "item");
    if (!upc) throw new Error("UPC is required");
    if (!itemId) throw new Error("Item is required");
    const targetItem = await prisma.item.findFirstOrThrow({ where: { id: itemId, householdId } });
    if (id) {
      await prisma.itemMultiUpc.update({ where: { id }, data: { upc, itemId, active } });
    } else {
      await prisma.itemMultiUpc.upsert({
        where: { householdId_itemId_upc: { householdId, itemId, upc } },
        update: { active },
        create: { householdId, itemId, upc, active },
      });
      if (!targetItem.upc) {
        await prisma.item.update({ where: { id: itemId }, data: { upc } });
      }
    }
  } else if (recordType.key === "task_schedule") {
    const assignedToId = text(formData, "assignedToId") ?? null;
    if (assignedToId) await assertEligibleTaskAssignee(householdId, assignedToId);
    const intervalDays = numberValue(formData, "intervalDays", 0);
    if (!intervalDays || intervalDays < 1) throw new Error("Interval days must be at least 1");
    const data = {
      title: text(formData, "title") ?? "Task schedule",
      intervalDays,
      assignedToId,
      active,
    };
    if (id) {
      await prisma.taskSchedule.update({ where: { id }, data });
      await prisma.task.updateMany({ where: { householdId, taskScheduleId: id, status: "OPEN" }, data: { title: data.title, assignedToId: data.assignedToId } });
    } else {
      await prisma.taskSchedule.create({ data: { householdId, ...data } });
    }
  } else if (recordType.key === "file") {
    const target = text(formData, "relatedRecord")?.split("::") ?? [];
    const relatedRecordTypeId = text(formData, "relatedRecordTypeId") ?? target[0];
    const relatedRecordId = text(formData, "relatedRecordId") ?? target[1];
    if (!relatedRecordTypeId || !relatedRecordId) throw new Error("Related record is required");
    const relatedRecordType = await prisma.recordType.findFirstOrThrow({ where: { id: relatedRecordTypeId, householdId, active: true } });
    const uploaded = await saveUploadedFile(formData, "file", "files");
    const fileRecordName = text(formData, "name") ?? uploaded?.fileName ?? "File";
    if (id) {
      await prisma.fileRecord.update({
        where: { id },
        data: {
          name: fileRecordName,
          relatedRecordTypeId,
          relatedRecordId,
          notes: text(formData, "notes"),
          active,
          ...(uploaded ? { fileUrl: uploaded.url, fileName: uploaded.fileName, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes } : {}),
        },
      });
    } else {
      if (!uploaded) throw new Error("File is required");
      await prisma.fileRecord.create({
        data: {
          householdId,
          name: fileRecordName,
          fileUrl: uploaded.url,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          relatedRecordTypeId,
          relatedRecordId,
          notes: text(formData, "notes"),
          active,
        },
      });
      redirectHref = recordHref(relatedRecordType.id, relatedRecordType.key, relatedRecordId, "files");
    }
  } else if (recordType.key === "people") {
    const loginRole = text(formData, "loginRole") === "admin" ? "ADMINISTRATOR" : "MEMBER";
    const rawPin = text(formData, "pin");
    let pin: string | null | undefined = undefined;
    if (user.role === "ADMINISTRATOR" && rawPin !== undefined) {
      if (rawPin.trim() === "") {
        pin = null;
      } else {
        pin = assertValidPin(rawPin);
        const existingPin = await prisma.people.findFirst({
          where: { householdId, pin, ...(id ? { id: { not: id } } : {}), active: true },
        });
        if (existingPin) throw new Error("This PIN is already in use by someone else. Please choose a different PIN.");
      }
    }
    const data = {
      name: text(formData, "name") ?? "Person",
      relationshipTypeOptionId: text(formData, "relationshipTypeOptionId"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      friendOfPeopleIds: formData.getAll("friendOfPeopleIds").map(String).filter(Boolean),
      birthday: dateValue(formData, "birthday"),
      anniversary: dateValue(formData, "anniversary"),
      employer: text(formData, "employer"),
      jobTitle: text(formData, "jobTitle"),
      interestOptionIds: formData.getAll("interestOptionIds").map(String).filter(Boolean),
      notes: text(formData, "notes"),
      ...(pin !== undefined ? { pin } : {}),
      active,
    };
    if (id) await prisma.people.update({ where: { id }, data });
    else await prisma.people.create({ data: { householdId, ...data } });
    if (id) await prisma.user.updateMany({ where: { householdId, peopleId: id }, data: { role: loginRole } });
  } else if (recordType.key === "task") {
    const itemId = text(formData, "itemId");
    if (!itemId) throw new Error("Item is required");
    await prisma.item.findFirstOrThrow({ where: { id: itemId, householdId, active: true }, select: { id: true } });
    const existingTask = id ? await prisma.task.findFirstOrThrow({ where: { id, householdId }, select: { status: true, completedAt: true, completedDate: true, completedById: true, maintenanceRecordId: true } }) : null;
    const assignedToId = text(formData, "assignedToId") ?? null;
    if (assignedToId) await assertEligibleTaskAssignee(householdId, assignedToId);
    const taskScheduleId = text(formData, "taskScheduleId") ?? null;
    const taskSchedule = taskScheduleId ? await prisma.taskSchedule.findFirstOrThrow({ where: { id: taskScheduleId, householdId, active: true }, select: { id: true, title: true, intervalDays: true, assignedToId: true } }) : null;
    if (taskScheduleId) {
      await prisma.itemTaskSchedule.upsert({
        where: { householdId_itemId_taskScheduleId: { householdId, itemId, taskScheduleId } },
        update: {},
        create: { householdId, itemId, taskScheduleId, assignedById: user.peopleId },
      });
    }
    const dueDate = dateValue(formData, "dueDate");
    if (!dueDate) throw new Error("Due date is required");
    const statusValue = text(formData, "status");
    const status: "OPEN" | "COMPLETED" | "SKIPPED" = statusValue === "COMPLETED" || statusValue === "SKIPPED" ? statusValue : "OPEN";
    const now = new Date();
    const data = {
      itemId,
      taskScheduleId,
      assignedToId: assignedToId ?? taskSchedule?.assignedToId ?? null,
      title: text(formData, "title") ?? taskSchedule?.title ?? "Task",
      dueDate,
      status,
      notes: text(formData, "notes"),
      nextTaskDate: status === "OPEN" ? null : dateValue(formData, "nextTaskDate"),
      completedDate: status === "COMPLETED" ? existingTask?.completedDate ?? dateValue(formData, "completedDate") ?? startOfDay(now) : null,
      completedAt: status === "COMPLETED" ? existingTask?.completedAt ?? now : null,
      completedById: status === "COMPLETED" ? existingTask?.completedById ?? user.peopleId : null,
      maintenanceRecordId: status === "COMPLETED" ? existingTask?.maintenanceRecordId : null,
      skippedAt: status === "SKIPPED" ? now : null,
    };
    const savedTask = id ? await prisma.task.update({ where: { id }, data }) : await prisma.task.create({ data: { householdId, ...data } });
    if (status === "COMPLETED" && (!existingTask || existingTask.status !== "COMPLETED" || !existingTask.maintenanceRecordId)) await completeTaskRecord(savedTask.id, householdId, user.peopleId, now, text(formData, "notes"));
  } else {
    throw new Error("This record type does not have a concrete table yet");
  }
  invalidateShellCreateData();
  revalidatePath("/assets");
  revalidatePath("/tasks");
  revalidatePath("/events");
  revalidatePath(`/records/${recordType.id}`);
  redirect(redirectHref ?? (id ? `/records/${recordType.id}/${id}` : `/records/${recordType.id}`));
}

export async function deleteConcreteRecord(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const recordTypeId = text(formData, "recordTypeId");
  const id = text(formData, "id");
  if (!recordTypeId || !id) throw new Error("Record type and id are required");
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId } });
  if (recordType.editableRecords && user.role !== "ADMINISTRATOR") throw new Error("Administrator access required");

  await prisma.$transaction(async (tx) => {
    if (recordType.key === "item") {
      await tx.itemMultiUpc.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemTaskSchedule.deleteMany({ where: { householdId, itemId: id } });
      await tx.task.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemMaintenance.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemLoan.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemConsumption.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemTransfer.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemPutaway.deleteMany({ where: { householdId, itemId: id } });
      await tx.itemLocation.deleteMany({ where: { householdId, itemId: id } });
      await tx.fileRecord.deleteMany({ where: { householdId, relatedRecordTypeId: recordType.id, relatedRecordId: id } });
      await tx.activityLog.deleteMany({ where: { householdId, recordId: id } });
      await tx.item.delete({ where: { id, householdId } });
    } else if (recordType.key === "area") {
      await tx.itemLocation.deleteMany({ where: { householdId, areaId: id } });
      await tx.itemPutaway.deleteMany({ where: { householdId, areaId: id } });
      await tx.itemConsumption.deleteMany({ where: { householdId, areaId: id } });
      await tx.fileRecord.deleteMany({ where: { householdId, relatedRecordTypeId: recordType.id, relatedRecordId: id } });
      await tx.activityLog.deleteMany({ where: { householdId, recordId: id } });
      await tx.area.delete({ where: { id, householdId } });
    } else if (recordType.key === "room") {
      const areas = await tx.area.findMany({ where: { householdId, roomId: id }, select: { id: true } });
      const areaIds = areas.map((a) => a.id);
      if (areaIds.length) {
        await tx.itemLocation.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.itemPutaway.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.itemConsumption.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.area.deleteMany({ where: { householdId, id: { in: areaIds } } });
      }
      await tx.fileRecord.deleteMany({ where: { householdId, relatedRecordTypeId: recordType.id, relatedRecordId: id } });
      await tx.activityLog.deleteMany({ where: { householdId, recordId: id } });
      await tx.room.delete({ where: { id, householdId } });
    } else if (recordType.key === "location") {
      const rooms = await tx.room.findMany({ where: { householdId, locationId: id }, select: { id: true } });
      const roomIds = rooms.map((r) => r.id);
      const areas = await tx.area.findMany({ where: { householdId, OR: [{ locationId: id }, { roomId: { in: roomIds } }] }, select: { id: true } });
      const areaIds = areas.map((a) => a.id);
      if (areaIds.length) {
        await tx.itemLocation.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.itemPutaway.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.itemConsumption.deleteMany({ where: { householdId, areaId: { in: areaIds } } });
        await tx.area.deleteMany({ where: { householdId, id: { in: areaIds } } });
      }
      if (roomIds.length) {
        await tx.room.deleteMany({ where: { householdId, id: { in: roomIds } } });
      }
      await tx.fileRecord.deleteMany({ where: { householdId, relatedRecordTypeId: recordType.id, relatedRecordId: id } });
      await tx.activityLog.deleteMany({ where: { householdId, recordId: id } });
      await tx.location.delete({ where: { id, householdId } });
    } else if (recordType.key === "task_schedule") {
      await tx.itemTaskSchedule.deleteMany({ where: { householdId, taskScheduleId: id } });
      await tx.task.deleteMany({ where: { householdId, taskScheduleId: id } });
      await tx.taskSchedule.delete({ where: { id, householdId } });
    } else if (recordType.key === "task") {
      await tx.task.delete({ where: { id, householdId } });
    } else if (recordType.key === "file") {
      await tx.fileRecord.delete({ where: { id, householdId } });
    } else if (recordType.key === "people") {
      await tx.people.delete({ where: { id, householdId } });
    } else if (recordType.key === "item_multi_upc") {
      await tx.itemMultiUpc.delete({ where: { id, householdId } });
    } else {
      throw new Error("This record type does not have a concrete table yet");
    }
  });

  invalidateShellCreateData();
  revalidatePath("/assets");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/records/${recordType.id}`);
  revalidatePath("/tasks");
  redirect(`/records/${recordType.id}`);
}
