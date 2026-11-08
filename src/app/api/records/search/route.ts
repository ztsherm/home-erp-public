import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { transactionRecordName } from "@/lib/format";

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });

export async function GET(request: Request) {
  const { householdId } = await requireHouseholdContext();
  const { searchParams } = new URL(request.url);
  const recordTypeId = searchParams.get("recordTypeId") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const recordType = await prisma.recordType.findFirstOrThrow({ where: { id: recordTypeId, householdId, active: true } });
  const take = 20;

  if (recordType.key === "location") {
    const rows = await prisma.location.findMany({ where: { householdId, active: true, ...(q ? { name: contains(q) } : {}) }, orderBy: { name: "asc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.name, subtitle: "Location" })) });
  }
  if (recordType.key === "room") {
    const rows = await prisma.room.findMany({ where: { householdId, active: true, ...(q ? { name: contains(q) } : {}) }, include: { location: true }, orderBy: { name: "asc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.name, subtitle: row.location.name })) });
  }
  if (recordType.key === "area") {
    const rows = await prisma.area.findMany({ where: { householdId, active: true, ...(q ? { name: contains(q) } : {}) }, include: { location: true, room: true }, orderBy: { name: "asc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.name, subtitle: `${row.location.name} / ${row.room.name}` })) });
  }
  if (recordType.key === "item") {
    const rows = await prisma.item.findMany({
      where: {
        householdId,
        active: true,
        ...(q
          ? {
              OR: [
                { name: contains(q) },
                { brand: contains(q) },
                { model: contains(q) },
                { serialNumber: contains(q) },
                { upc: contains(q) },
                { multiUpcs: { some: { upc: contains(q), active: true } } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take,
    });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.name, subtitle: [row.brand, row.model, row.serialNumber].filter(Boolean).join(" - ") || "Item" })) });
  }
  if (recordType.key === "item_multi_upc") {
    const rows = await prisma.itemMultiUpc.findMany({
      where: {
        householdId,
        active: true,
        ...(q
          ? {
              OR: [
                { upc: contains(q) },
                { item: { name: contains(q) } },
              ],
            }
          : {}),
      },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.upc, subtitle: row.item.name })) });
  }
  if (recordType.key === "people") {
    const rows = await prisma.people.findMany({ where: { householdId, active: true, ...(q ? { OR: [{ name: contains(q) }, { employer: contains(q) }, { jobTitle: contains(q) }] } : {}) }, orderBy: { name: "asc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.name, subtitle: [row.employer, row.jobTitle].filter(Boolean).join(" - ") || "People" })) });
  }
  if (recordType.key === "task") {
    const rows = await prisma.task.findMany({ where: { householdId, ...(q ? { OR: [{ title: contains(q) }, { notes: contains(q) }, { item: { name: contains(q) } }, { assignedTo: { name: contains(q) } }] } : {}) }, include: { item: true, assignedTo: true }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: row.title, subtitle: [row.item.name, row.assignedTo?.name ?? "Unassigned", row.status].join(" - ") })) });
  }
  if (recordType.key === "item_putaway") {
    const rows = await prisma.itemPutaway.findMany({ where: { householdId }, include: { item: true }, orderBy: { createdAt: "desc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: transactionRecordName(recordType.key, row.transactionNo), subtitle: row.item.name })).filter((row) => !q || `${row.label} ${row.subtitle}`.toLowerCase().includes(q.toLowerCase())) });
  }
  if (recordType.key === "item_transfer") {
    const rows = await prisma.itemTransfer.findMany({ where: { householdId }, include: { item: true }, orderBy: { createdAt: "desc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: transactionRecordName(recordType.key, row.transactionNo), subtitle: row.item.name })).filter((row) => !q || `${row.label} ${row.subtitle}`.toLowerCase().includes(q.toLowerCase())) });
  }
  if (recordType.key === "item_consumption") {
    const rows = await prisma.itemConsumption.findMany({ where: { householdId }, include: { item: true }, orderBy: { createdAt: "desc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: transactionRecordName(recordType.key, row.transactionNo), subtitle: row.item.name })).filter((row) => !q || `${row.label} ${row.subtitle}`.toLowerCase().includes(q.toLowerCase())) });
  }
  if (recordType.key === "item_maintenance") {
    const rows = await prisma.itemMaintenance.findMany({ where: { householdId }, include: { item: true }, orderBy: { createdAt: "desc" }, take });
    return NextResponse.json({ results: rows.map((row) => ({ id: row.id, label: transactionRecordName(recordType.key, row.transactionNo), subtitle: `${row.item.name} - ${row.maintenanceType}` })).filter((row) => !q || `${row.label} ${row.subtitle}`.toLowerCase().includes(q.toLowerCase())) });
  }

  return NextResponse.json({ results: [] });
}
