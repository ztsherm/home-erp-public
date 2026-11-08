"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireAdministrator, requireHouseholdContext } from "@/server/auth/context";
import { dateValue, numberValue, text } from "@/features/shared/form";
import { saveUploadedImage } from "@/features/shared/uploads";
import { invalidateShellCreateData } from "@/server/cache";
import { transactionRecordName } from "@/lib/format";

async function logActivity(householdId: string, peopleId: string, recordType: string, recordId: string, summary: string, action: "CREATE" | "UPDATE" | "DELETE" | "TRANSACTION" = "CREATE") {
  await prisma.activityLog.create({ data: { householdId, peopleId, action, recordType, recordId, summary } });
}

async function assertTransactionNotReferenced(householdId: string, recordTypeKey: string, recordId: string) {
  const recordType = await prisma.recordType.findFirst({ where: { householdId, key: recordTypeKey, active: true }, select: { id: true } });
  const fileCount = recordType ? await prisma.fileRecord.count({ where: { householdId, active: true, relatedRecordTypeId: recordType.id, relatedRecordId: recordId } }) : 0;
  if (fileCount > 0) throw new Error("Cannot delete this transaction because another record refers to it. Inactivate it instead.");
}

export async function recordItemUpc(householdId: string, itemId: string, upc: string | undefined | null) {
  const cleanUpc = upc?.trim();
  if (!cleanUpc) return;
  await prisma.itemMultiUpc.upsert({
    where: {
      householdId_itemId_upc: {
        householdId,
        itemId,
        upc: cleanUpc,
      },
    },
    update: {
      active: true,
    },
    create: {
      householdId,
      itemId,
      upc: cleanUpc,
      active: true,
    },
  });
}

async function updateItemUpc(itemId: string, householdId: string, upc: string | undefined) {
  const cleanUpc = upc?.trim() || null;
  await prisma.item.updateMany({ where: { id: itemId, householdId }, data: { upc: cleanUpc } });
  if (cleanUpc) {
    await recordItemUpc(householdId, itemId, cleanUpc);
  }
}

async function resolveArea(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], householdId: string, userPeopleId: string, areaId: string | undefined, newAreaName: string | undefined, newAreaRoomId: string | undefined) {
  if (areaId) return tx.area.findFirstOrThrow({ where: { id: areaId, householdId, active: true } });
  if (!newAreaName || !newAreaRoomId) throw new Error("Area is required");
  const room = await tx.room.findFirstOrThrow({ where: { id: newAreaRoomId, householdId, active: true } });
  const areaName = newAreaName.trim();
  const area = await tx.area.upsert({
    where: { householdId_roomId_name: { householdId, roomId: room.id, name: areaName } },
    update: { locationId: room.locationId, active: true },
    create: { householdId, locationId: room.locationId, roomId: room.id, name: areaName },
  });
  if (area.createdAt.getTime() === area.updatedAt.getTime()) {
    await tx.activityLog.create({ data: { householdId, peopleId: userPeopleId, action: "CREATE", recordType: "Area", recordId: area.id, summary: `Created area ${area.name}` } });
  }
  return area;
}

export async function createLocation(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const location = await prisma.location.create({ data: { householdId, name: text(formData, "name") ?? "New location", notes: text(formData, "notes") } });
  await logActivity(householdId, user.peopleId, "Location", location.id, `Created location ${location.name}`);
  revalidatePath("/");
}

export async function createRoom(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const room = await prisma.room.create({ data: { householdId, locationId: text(formData, "locationId") ?? "", name: text(formData, "name") ?? "New room", notes: text(formData, "notes") } });
  await logActivity(householdId, user.peopleId, "Room", room.id, `Created room ${room.name}`);
  revalidatePath("/");
}

export async function createArea(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const room = await prisma.room.findFirstOrThrow({ where: { id: text(formData, "roomId"), householdId } });
  const areaName = text(formData, "name") ?? "New area";
  const area = await prisma.area.upsert({
    where: { householdId_roomId_name: { householdId, roomId: room.id, name: areaName } },
    update: { locationId: room.locationId, notes: text(formData, "notes"), active: true },
    create: { householdId, locationId: room.locationId, roomId: room.id, name: areaName, notes: text(formData, "notes") },
  });
  await logActivity(householdId, user.peopleId, "Area", area.id, `Created area ${area.name}`);
  revalidatePath("/");
}

export async function createItem(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const photoUrl = await saveUploadedImage(formData, "photo", "items");
  const existingItemId = text(formData, "existingItemId");
  const minQuantity = text(formData, "minQuantity") ? numberValue(formData, "minQuantity") : null;
  const targetQuantity = text(formData, "targetQuantity") ? numberValue(formData, "targetQuantity") : null;
  const purchasePrice = text(formData, "purchasePrice") ? text(formData, "purchasePrice") : null;
  const purchaseDate = dateValue(formData, "purchaseDate") ?? null;
  if (existingItemId) {
    await prisma.item.findFirstOrThrow({ where: { id: existingItemId, householdId, active: true }, select: { id: true } });
    const item = await prisma.item.update({
      where: { id: existingItemId },
      data: {
        name: text(formData, "name") ?? "New item",
        description: text(formData, "description"),
        brand: text(formData, "brand"),
        model: text(formData, "model"),
        serialNumber: text(formData, "serialNumber"),
        minQuantity,
        targetQuantity,
        purchasePrice,
        purchaseDate,
        notes: text(formData, "notes"),
        ...(photoUrl ? { photoUrl } : {}),
      },
    });
    await updateItemUpc(item.id, householdId, text(formData, "upc"));
    await logActivity(householdId, user.peopleId, "Item", item.id, `Updated item ${item.name}`, "UPDATE");
    revalidatePath("/assets");
    return;
  }
  const item = await prisma.item.create({
    data: {
      householdId,
      name: text(formData, "name") ?? "New item",
      description: text(formData, "description"),
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serialNumber: text(formData, "serialNumber"),
      minQuantity,
      targetQuantity,
      purchasePrice,
      purchaseDate,
      notes: text(formData, "notes"),
      photoUrl,
    },
  });
  await updateItemUpc(item.id, householdId, text(formData, "upc"));
  await logActivity(householdId, user.peopleId, "Item", item.id, `Created item ${item.name}`);
  revalidatePath("/assets");
}

export async function updateCurrentPerson(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const profilePhotoUrl = await saveUploadedImage(formData, "profilePhoto", "people");
  const person = await prisma.people.update({
    where: { id: user.peopleId },
    data: {
      name: text(formData, "name") ?? user.name,
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
    },
  });
  await logActivity(householdId, user.peopleId, "People", person.id, `Updated person record ${person.name}`, "UPDATE");
  revalidatePath("/settings");
  revalidatePath("/records");
}

export async function itemPutaway(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const submittedItemId = text(formData, "itemId");
  const newItemName = text(formData, "newItemName");
  const itemUpc = text(formData, "itemUpc");
  const submittedAreaId = text(formData, "areaId");
  const newAreaName = text(formData, "newAreaName");
  const newAreaRoomId = text(formData, "newAreaRoomId");
  if ((!submittedItemId && !newItemName) || (!submittedAreaId && !newAreaName)) throw new Error("Item and area are required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const area = await resolveArea(tx, householdId, user.peopleId, submittedAreaId, newAreaName, newAreaRoomId);
    const item = submittedItemId
      ? await tx.item.findFirstOrThrow({ where: { id: submittedItemId, householdId, active: true } })
      : await tx.item.create({ data: { householdId, name: newItemName ?? "New item" } });
    if (itemUpc) {
      await tx.item.update({ where: { id: item.id }, data: { upc: itemUpc } });
    }
    const itemId = item.id;
    const itemLocation = await tx.itemLocation.upsert({
      where: { householdId_itemId_areaId: { householdId, itemId, areaId: area.id } },
      update: { locationId: area.locationId, roomId: area.roomId, quantity: { increment: quantity } },
      create: { householdId, itemId, locationId: area.locationId, roomId: area.roomId, areaId: area.id, quantity },
    });
    const putaway = await tx.itemPutaway.create({ data: { householdId, itemId, itemLocationId: itemLocation.id, locationId: area.locationId, roomId: area.roomId, areaId: area.id, quantity, performedById: user.peopleId, notes: text(formData, "notes") } });
    if (!submittedItemId) {
      await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "CREATE", recordType: "Item", recordId: item.id, summary: `Created item ${item.name}` } });
    }
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "TRANSACTION", recordType: "ItemPutaway", recordId: putaway.id, summary: `Put away ${quantity} ${item.name}` } });
  });
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
}

export async function itemTransfer(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const fromItemLocationId = text(formData, "fromItemLocationId");
  const submittedItemId = text(formData, "itemId");
  const itemUpc = text(formData, "itemUpc");
  const toAreaId = text(formData, "toAreaId");
  const newToAreaName = text(formData, "newToAreaName");
  const newToAreaRoomId = text(formData, "newToAreaRoomId");
  if (!fromItemLocationId || (!toAreaId && !newToAreaName)) throw new Error("Source and destination are required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const source = await tx.itemLocation.findFirstOrThrow({ where: { id: fromItemLocationId, householdId } });
    if (submittedItemId && source.itemId !== submittedItemId) throw new Error("Selected item does not match the source location");
    if (itemUpc) await tx.item.update({ where: { id: source.itemId }, data: { upc: itemUpc } });
    if (Number(source.quantity) < quantity) throw new Error("Not enough quantity at source");
    const area = await resolveArea(tx, householdId, user.peopleId, toAreaId, newToAreaName, newToAreaRoomId);
    await tx.itemLocation.update({ where: { id: source.id }, data: { quantity: { decrement: quantity } } });
    const destination = await tx.itemLocation.upsert({
      where: { householdId_itemId_areaId: { householdId, itemId: source.itemId, areaId: area.id } },
      update: { locationId: area.locationId, roomId: area.roomId, quantity: { increment: quantity } },
      create: { householdId, itemId: source.itemId, locationId: area.locationId, roomId: area.roomId, areaId: area.id, quantity },
    });
    const transfer = await tx.itemTransfer.create({ data: { householdId, itemId: source.itemId, fromItemLocationId: source.id, toItemLocationId: destination.id, quantity, performedById: user.peopleId, notes: text(formData, "notes") } });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "TRANSACTION", recordType: "ItemTransfer", recordId: transfer.id, summary: `Transferred ${quantity} item(s)` } });
  });
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
}

export async function itemConsumption(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const itemLocationId = text(formData, "itemLocationId");
  const submittedItemId = text(formData, "itemId");
  const itemUpc = text(formData, "itemUpc");
  if (!itemLocationId) throw new Error("Item location is required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const source = await tx.itemLocation.findFirstOrThrow({ where: { id: itemLocationId, householdId }, include: { item: true } });
    if (submittedItemId && source.itemId !== submittedItemId) throw new Error("Selected item does not match the source location");
    if (itemUpc) await tx.item.update({ where: { id: source.itemId }, data: { upc: itemUpc } });
    if (Number(source.quantity) < quantity) throw new Error("Not enough quantity available to consume");
    await tx.itemLocation.update({ where: { id: source.id }, data: { quantity: { decrement: quantity } } });
    const consumption = await tx.itemConsumption.create({
      data: {
        householdId,
        itemId: source.itemId,
        itemLocationId: source.id,
        locationId: source.locationId,
        roomId: source.roomId,
        areaId: source.areaId,
        quantity,
        performedById: user.peopleId,
        notes: text(formData, "notes"),
      },
    });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "TRANSACTION", recordType: "ItemConsumption", recordId: consumption.id, summary: `Consumed ${quantity} ${source.item.name}` } });
  });
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
}

export async function itemMaintenance(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const itemId = text(formData, "itemId");
  if (!itemId) throw new Error("Item is required");
  const log = await prisma.itemMaintenance.create({ data: { householdId, itemId, maintenanceType: text(formData, "maintenanceType") ?? "Maintenance", performedById: user.peopleId, vendor: text(formData, "vendor"), cost: text(formData, "cost"), notes: text(formData, "notes"), nextDueDate: dateValue(formData, "nextDueDate") } });
  await logActivity(householdId, user.peopleId, "ItemMaintenance", log.id, `Recorded maintenance`, "TRANSACTION");
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
}

export async function updatePutaway(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Putaway id is required");
  const itemId = text(formData, "itemId");
  const areaId = text(formData, "areaId");
  const performedById = text(formData, "performedById");
  if (!itemId || !areaId || !performedById) throw new Error("Item, area, and performed by are required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const putaway = await tx.itemPutaway.findFirstOrThrow({ where: { id, householdId }, include: { item: true } });
    const currentLocation = await tx.itemLocation.findFirstOrThrow({ where: { id: putaway.itemLocationId, householdId } });
    if (Number(currentLocation.quantity) < Number(putaway.quantity)) throw new Error("Cannot edit putaway because the original quantity is no longer available at its current item location");
    const area = await tx.area.findFirstOrThrow({ where: { id: areaId, householdId } });
    const performedBy = await tx.people.findFirstOrThrow({ where: { id: performedById, householdId, active: true } });
    await tx.itemLocation.update({ where: { id: currentLocation.id }, data: { quantity: { decrement: Number(putaway.quantity) } } });
    const nextLocation = await tx.itemLocation.upsert({
      where: { householdId_itemId_areaId: { householdId, itemId, areaId } },
      update: { locationId: area.locationId, roomId: area.roomId, quantity: { increment: quantity } },
      create: { householdId, itemId, locationId: area.locationId, roomId: area.roomId, areaId, quantity },
    });
    await tx.itemPutaway.update({
      where: { id },
      data: {
        itemId,
        itemLocationId: nextLocation.id,
        locationId: area.locationId,
        roomId: area.roomId,
        areaId,
        quantity,
        performedById: performedBy.id,
        notes: text(formData, "notes"),
      },
    });
    await tx.itemPutaway.update({ where: { id }, data: { active: formData.get("active") === "on" } });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "UPDATE", recordType: "ItemPutaway", recordId: id, summary: `Updated putaway for ${putaway.item.name}` } });
  });
  revalidatePath(`/events/putaway/${id}`);
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect(`/events/putaway/${id}`);
}

export async function updateTransfer(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Transfer id is required");
  const fromItemLocationId = text(formData, "fromItemLocationId");
  const toAreaId = text(formData, "toAreaId");
  const performedById = text(formData, "performedById");
  if (!fromItemLocationId || !toAreaId || !performedById) throw new Error("Source, destination, and performed by are required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.itemTransfer.findFirstOrThrow({ where: { id, householdId }, include: { item: true } });
    const oldDestination = await tx.itemLocation.findFirstOrThrow({ where: { id: transfer.toItemLocationId, householdId } });
    if (Number(oldDestination.quantity) < Number(transfer.quantity)) throw new Error("Cannot edit transfer because the original destination quantity has already been moved");
    await tx.itemLocation.update({ where: { id: transfer.fromItemLocationId }, data: { quantity: { increment: Number(transfer.quantity) } } });
    await tx.itemLocation.update({ where: { id: transfer.toItemLocationId }, data: { quantity: { decrement: Number(transfer.quantity) } } });
    const source = await tx.itemLocation.findFirstOrThrow({ where: { id: fromItemLocationId, householdId } });
    if (Number(source.quantity) < quantity) throw new Error("Not enough quantity at source for updated transfer");
    const area = await tx.area.findFirstOrThrow({ where: { id: toAreaId, householdId } });
    const performedBy = await tx.people.findFirstOrThrow({ where: { id: performedById, householdId, active: true } });
    await tx.itemLocation.update({ where: { id: source.id }, data: { quantity: { decrement: quantity } } });
    const destination = await tx.itemLocation.upsert({
      where: { householdId_itemId_areaId: { householdId, itemId: source.itemId, areaId: area.id } },
      update: { locationId: area.locationId, roomId: area.roomId, quantity: { increment: quantity } },
      create: { householdId, itemId: source.itemId, locationId: area.locationId, roomId: area.roomId, areaId: area.id, quantity },
    });
    await tx.itemTransfer.update({
      where: { id },
      data: {
        itemId: source.itemId,
        fromItemLocationId: source.id,
        toItemLocationId: destination.id,
        quantity,
        performedById: performedBy.id,
        notes: text(formData, "notes"),
      },
    });
    await tx.itemTransfer.update({ where: { id }, data: { active: formData.get("active") === "on" } });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "UPDATE", recordType: "ItemTransfer", recordId: id, summary: `Updated transfer for ${transfer.item.name}` } });
  });
  revalidatePath(`/events/transfer/${id}`);
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect(`/events/transfer/${id}`);
}

export async function updateConsumption(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Consumption id is required");
  const itemLocationId = text(formData, "itemLocationId");
  const performedById = text(formData, "performedById");
  if (!itemLocationId || !performedById) throw new Error("Item location and performed by are required");
  const quantity = numberValue(formData, "quantity", 1);
  await prisma.$transaction(async (tx) => {
    const consumption = await tx.itemConsumption.findFirstOrThrow({ where: { id, householdId }, include: { item: true } });
    await tx.itemLocation.update({ where: { id: consumption.itemLocationId }, data: { quantity: { increment: Number(consumption.quantity) } } });
    const source = await tx.itemLocation.findFirstOrThrow({ where: { id: itemLocationId, householdId } });
    if (Number(source.quantity) < quantity) throw new Error("Not enough quantity available for updated consumption");
    const performedBy = await tx.people.findFirstOrThrow({ where: { id: performedById, householdId, active: true } });
    await tx.itemLocation.update({ where: { id: source.id }, data: { quantity: { decrement: quantity } } });
    await tx.itemConsumption.update({
      where: { id },
      data: {
        itemId: source.itemId,
        itemLocationId: source.id,
        locationId: source.locationId,
        roomId: source.roomId,
        areaId: source.areaId,
        quantity,
        performedById: performedBy.id,
        notes: text(formData, "notes"),
      },
    });
    await tx.itemConsumption.update({ where: { id }, data: { active: formData.get("active") === "on" } });
    await tx.activityLog.create({ data: { householdId, peopleId: user.peopleId, action: "UPDATE", recordType: "ItemConsumption", recordId: id, summary: `Updated consumption for ${consumption.item.name}` } });
  });
  revalidatePath(`/events/consumption/${id}`);
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect(`/events/consumption/${id}`);
}

export async function updateMaintenance(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Maintenance id is required");
  const itemId = text(formData, "itemId");
  const performedById = text(formData, "performedById");
  if (!itemId || !performedById) throw new Error("Item and performed by are required");
  await prisma.itemMaintenance.findFirstOrThrow({ where: { id, householdId } });
  await prisma.item.findFirstOrThrow({ where: { id: itemId, householdId, active: true } });
  await prisma.people.findFirstOrThrow({ where: { id: performedById, householdId, active: true } });
  const log = await prisma.itemMaintenance.update({
    where: { id },
    data: {
      itemId,
      maintenanceType: text(formData, "maintenanceType") ?? "Maintenance",
      performedById,
      vendor: text(formData, "vendor"),
      cost: text(formData, "cost"),
      notes: text(formData, "notes"),
      nextDueDate: dateValue(formData, "nextDueDate"),
    },
    include: { item: true },
  });
  await prisma.itemMaintenance.update({ where: { id }, data: { active: formData.get("active") === "on" } });
  await logActivity(householdId, user.peopleId, "ItemMaintenance", id, `Updated maintenance for ${log.item.name}`, "UPDATE");
  revalidatePath(`/events/maintenance/${id}`);
  revalidatePath("/events");
  redirect(`/events/maintenance/${id}`);
}

export async function deletePutaway(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Putaway id is required");
  await assertTransactionNotReferenced(householdId, "item_putaway", id);
  await prisma.$transaction(async (tx) => {
    const putaway = await tx.itemPutaway.findFirstOrThrow({ where: { id, householdId }, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true } });
    const itemLocation = await tx.itemLocation.findFirstOrThrow({ where: { id: putaway.itemLocationId, householdId } });
    if (Number(itemLocation.quantity) < Number(putaway.quantity)) throw new Error("Cannot delete putaway because that quantity is no longer available at this location");
    await tx.itemLocation.update({ where: { id: itemLocation.id }, data: { quantity: { decrement: Number(putaway.quantity) } } });
    await tx.itemPutaway.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        householdId,
        peopleId: user.peopleId,
        action: "DELETE",
        recordType: "ItemPutaway",
        recordId: id,
        summary: `Deleted putaway for ${putaway.item.name} - Quantity: ${String(putaway.quantity)} - Area: ${putaway.itemLocation.location.name} / ${putaway.itemLocation.room.name} / ${putaway.itemLocation.area.name} - Performed by: ${putaway.performedBy.name}${putaway.notes ? ` - Notes: ${putaway.notes}` : ""}`,
      },
    });
  });
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect("/events");
}

export async function deleteTransfer(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Transfer id is required");
  await assertTransactionNotReferenced(householdId, "item_transfer", id);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.itemTransfer.findFirstOrThrow({ where: { id, householdId }, include: { item: true, fromItemLocation: { include: { location: true, room: true, area: true } }, toItemLocation: { include: { location: true, room: true, area: true } }, performedBy: true } });
    const destination = await tx.itemLocation.findFirstOrThrow({ where: { id: transfer.toItemLocationId, householdId } });
    if (Number(destination.quantity) < Number(transfer.quantity)) throw new Error("Cannot delete transfer because the destination quantity has already been moved");
    await tx.itemLocation.update({ where: { id: transfer.fromItemLocationId }, data: { quantity: { increment: Number(transfer.quantity) } } });
    await tx.itemLocation.update({ where: { id: transfer.toItemLocationId }, data: { quantity: { decrement: Number(transfer.quantity) } } });
    await tx.itemTransfer.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        householdId,
        peopleId: user.peopleId,
        action: "DELETE",
        recordType: "ItemTransfer",
        recordId: id,
        summary: `Deleted transfer for ${transfer.item.name} - Quantity: ${String(transfer.quantity)} - From: ${transfer.fromItemLocation.location.name} / ${transfer.fromItemLocation.room.name} / ${transfer.fromItemLocation.area.name} - To: ${transfer.toItemLocation.location.name} / ${transfer.toItemLocation.room.name} / ${transfer.toItemLocation.area.name} - Performed by: ${transfer.performedBy.name}${transfer.notes ? ` - Notes: ${transfer.notes}` : ""}`,
      },
    });
  });
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect("/events");
}

export async function deleteConsumption(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Consumption id is required");
  await assertTransactionNotReferenced(householdId, "item_consumption", id);
  await prisma.$transaction(async (tx) => {
    const consumption = await tx.itemConsumption.findFirstOrThrow({ where: { id, householdId }, include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true } });
    await tx.itemLocation.update({ where: { id: consumption.itemLocationId }, data: { quantity: { increment: Number(consumption.quantity) } } });
    await tx.itemConsumption.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        householdId,
        peopleId: user.peopleId,
        action: "DELETE",
        recordType: "ItemConsumption",
        recordId: id,
        summary: `Deleted consumption for ${consumption.item.name} - Quantity: ${String(consumption.quantity)} - Area: ${consumption.itemLocation.location.name} / ${consumption.itemLocation.room.name} / ${consumption.itemLocation.area.name} - Performed by: ${consumption.performedBy.name}${consumption.notes ? ` - Notes: ${consumption.notes}` : ""}`,
      },
    });
  });
  revalidatePath("/events");
  revalidatePath("/assets");
  redirect("/events");
}

export async function deleteMaintenance(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Maintenance id is required");
  await assertTransactionNotReferenced(householdId, "item_maintenance", id);
  const log = await prisma.itemMaintenance.findFirstOrThrow({ where: { id, householdId }, include: { item: true, performedBy: true } });
  await prisma.itemMaintenance.delete({ where: { id } });
  await logActivity(householdId, user.peopleId, "ItemMaintenance", id, `Deleted maintenance for ${log.item.name} - Type: ${log.maintenanceType} - Performed by: ${log.performedBy.name}${log.vendor ? ` - Vendor: ${log.vendor}` : ""}${log.cost ? ` - Cost: ${String(log.cost)}` : ""}${log.nextDueDate ? ` - Next due: ${log.nextDueDate.toISOString().slice(0, 10)}` : ""}${log.notes ? ` - Notes: ${log.notes}` : ""}`, "DELETE");
  revalidatePath("/events");
  redirect("/events");
}

export async function itemLoan(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const itemId = text(formData, "itemId");
  const borrowerId = text(formData, "borrowerId");
  if (!itemId || !borrowerId) throw new Error("Item and borrower are required");
  const loanDate = dateValue(formData, "loanDate") ?? new Date();
  const expectedReturnDate = dateValue(formData, "expectedReturnDate") ?? null;
  const conditionNotes = text(formData, "conditionNotes");
  const notes = text(formData, "notes");

  const [item, borrower] = await Promise.all([
    prisma.item.findFirstOrThrow({ where: { id: itemId, householdId, active: true } }),
    prisma.people.findFirstOrThrow({ where: { id: borrowerId, householdId, active: true } }),
  ]);

  const loan = await prisma.itemLoan.create({
    data: {
      householdId,
      itemId: item.id,
      borrowerId: borrower.id,
      loanDate,
      expectedReturnDate,
      conditionNotes,
      notes,
    },
  });

  await logActivity(
    householdId,
    user.peopleId,
    "ItemLoan",
    loan.id,
    `Loaned ${item.name} to ${borrower.name}`,
    "TRANSACTION",
  );
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
  revalidatePath("/records");
}

export async function returnItemLoan(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Loan id is required");
  const actualReturnDate = dateValue(formData, "actualReturnDate") ?? new Date();
  const conditionNotes = text(formData, "conditionNotes");

  const loan = await prisma.itemLoan.findFirstOrThrow({
    where: { id, householdId },
    include: { item: true, borrower: true },
  });

  await prisma.itemLoan.update({
    where: { id: loan.id },
    data: {
      actualReturnDate,
      ...(conditionNotes ? { conditionNotes } : {}),
    },
  });

  await logActivity(
    householdId,
    user.peopleId,
    "ItemLoan",
    loan.id,
    `Returned ${loan.item.name} from ${loan.borrower.name}`,
    "TRANSACTION",
  );
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
  revalidatePath("/records");
}

export async function updateItemLoan(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const id = text(formData, "id");
  if (!id) throw new Error("Loan id is required");
  const itemId = text(formData, "itemId");
  const borrowerId = text(formData, "borrowerId");
  if (!itemId || !borrowerId) throw new Error("Item and borrower are required");

  await prisma.itemLoan.update({
    where: { id },
    data: {
      itemId,
      borrowerId,
      loanDate: dateValue(formData, "loanDate") ?? new Date(),
      expectedReturnDate: dateValue(formData, "expectedReturnDate") ?? null,
      actualReturnDate: dateValue(formData, "actualReturnDate") ?? null,
      conditionNotes: text(formData, "conditionNotes"),
      notes: text(formData, "notes"),
      active: formData.get("active") === "on",
    },
  });

  await logActivity(householdId, user.peopleId, "ItemLoan", id, `Updated loan record`, "UPDATE");
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
  revalidatePath("/records");
}

export async function deleteItemLoan(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireAdministrator();
  const id = text(formData, "id");
  if (!id) throw new Error("Loan id is required");
  await assertTransactionNotReferenced(householdId, "item_loan", id);
  const loan = await prisma.itemLoan.findFirstOrThrow({ where: { id, householdId }, select: { id: true, transactionNo: true } });
  await prisma.itemLoan.delete({ where: { id } });
  await logActivity(householdId, user.peopleId, "ItemLoan", id, `Deleted transaction ${transactionRecordName("item_loan", loan.transactionNo)}`, "DELETE");
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/events");
  revalidatePath("/records");
  redirect("/events");
}

export async function createAssistantItem(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  try {
    const name = text(formData, "name") ?? "New item";
    const brand = text(formData, "brand");
    const model = text(formData, "model");
    const serialNumber = text(formData, "serialNumber");
    const upc = text(formData, "upc");
    // Upload before opening the database transaction. On Vercel this uses Blob;
    // locally it falls back to public/uploads.
    const photoUrl = await saveUploadedImage(formData, "photo", "items");
    const minQuantity = text(formData, "minQuantity") ? numberValue(formData, "minQuantity") : null;
    const targetQuantity = text(formData, "targetQuantity") ? numberValue(formData, "targetQuantity") : null;
    const purchasePrice = text(formData, "purchasePrice") ? text(formData, "purchasePrice") : null;
    const purchaseDate = dateValue(formData, "purchaseDate") ?? null;
    const areaId = text(formData, "areaId");
    const newAreaName = text(formData, "newAreaName");
    const newAreaRoomId = text(formData, "newAreaRoomId");
    const quantity = numberValue(formData, "quantity", 0);

    const item = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.item.create({
        data: {
          householdId,
          name,
          brand,
          model,
          serialNumber,
          upc,
          photoUrl,
          minQuantity,
          targetQuantity,
          purchasePrice,
          purchaseDate,
        },
      });

      if (upc) {
        await tx.itemMultiUpc.upsert({
          where: { householdId_itemId_upc: { householdId, itemId: createdItem.id, upc } },
          update: { active: true },
          create: { householdId, itemId: createdItem.id, upc, active: true },
        });
      }

      if ((areaId || (newAreaName && newAreaRoomId)) && quantity > 0) {
        const area = await resolveArea(tx, householdId, user.peopleId, areaId, newAreaName, newAreaRoomId);
        const itemLoc = await tx.itemLocation.create({
          data: {
            householdId,
            itemId: createdItem.id,
            locationId: area.locationId,
            roomId: area.roomId,
            areaId: area.id,
            quantity,
          },
        });
        const putaway = await tx.itemPutaway.create({
          data: {
            householdId,
            itemId: createdItem.id,
            itemLocationId: itemLoc.id,
            locationId: area.locationId,
            roomId: area.roomId,
            areaId: area.id,
            quantity,
            performedById: user.peopleId,
            notes: "Initial inventory putaway",
          },
        });
        await tx.activityLog.create({
          data: {
            householdId,
            peopleId: user.peopleId,
            action: "TRANSACTION",
            recordType: "ItemPutaway",
            recordId: putaway.id,
            summary: `Created item and put away ${quantity} ${createdItem.name}`,
          },
        });
      } else {
        await tx.activityLog.create({
          data: {
            householdId,
            peopleId: user.peopleId,
            action: "CREATE",
            recordType: "Item",
            recordId: createdItem.id,
            summary: `Created item ${createdItem.name}`,
          },
        });
      }

      return createdItem;
    });

    invalidateShellCreateData();
    revalidatePath("/");
    revalidatePath("/assets");
    revalidatePath("/records");
    return { success: true as const, itemId: item.id };
  } catch (error) {
    console.error("Failed to create assistant item:", error);
    const message = error instanceof Error && (
      error.message.startsWith("Uploaded ") ||
      error.message.startsWith("File storage ")
    )
      ? error.message
      : "Unable to create the item. Nothing was saved; please try again.";
    return { success: false as const, error: message };
  }
}

export async function linkBarcodeToItem(formData: FormData) {
  invalidateShellCreateData();
  const { householdId, user } = await requireHouseholdContext();
  const itemId = text(formData, "itemId");
  const upc = text(formData, "upc")?.trim();
  if (!itemId || !upc) throw new Error("Item ID and Barcode are required");

  const existingItem = await prisma.item.findFirstOrThrow({ where: { id: itemId, householdId } });
  const item = await prisma.item.update({
    where: { id: itemId, householdId },
    data: { upc: existingItem.upc || upc },
  });
  await recordItemUpc(householdId, item.id, upc);

  await prisma.activityLog.create({
    data: {
      householdId,
      peopleId: user.peopleId,
      action: "UPDATE",
      recordType: "Item",
      recordId: item.id,
      summary: `Assigned barcode ${upc} to item ${item.name}`,
    },
  });

  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/records");
  redirect(`/assistant/item/${item.id}`);
}

