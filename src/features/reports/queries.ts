import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { columnLabel, defaultColumnsForBaseTable, SYSTEM_REPORT_COLUMNS, SYSTEM_REPORT_SOURCES } from "@/features/reports/definitions";
import { shortDateTime, transactionRecordName } from "@/lib/format";
import { calculateTco, formatCurrency } from "@/features/inventory/tco";
import { runOnce } from "@/server/run-once";
import { unstable_cache } from "next/cache";
import { REPORTS_DATA_TAG } from "@/server/cache";
import { paginationResult, parsePagination } from "@/lib/pagination";

type ReportRow = { id: string; cells: Record<string, string> };
type RuntimeReportFilters = Record<string, string | string[] | undefined>;

function dateValue(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "";
}

function dateTimeValue(value: Date | null | undefined) {
  return value ? shortDateTime(value) : "";
}

async function bootstrapSeedReports(householdId: string, userId: string) {
  const existingLegacy = await prisma.report.findFirst({
    where: { householdId, name: "Item Location Report", baseTable: "ITEM_LOCATION", active: true },
  });
  if (existingLegacy) {
    await prisma.report.update({ where: { id: existingLegacy.id }, data: { baseTable: "item_location" } });
  }
  const legacyUpdatedColumns = await prisma.reportColumn.findMany({
    where: {
      householdId,
      columnKey: "updatedAt",
      report: { baseTable: "item_location" },
    },
  });
  for (const column of legacyUpdatedColumns) {
    const existingLastTransactionColumn = await prisma.reportColumn.findUnique({
      where: { reportId_columnKey: { reportId: column.reportId, columnKey: "lastTransactionDate" } },
    });
    if (existingLastTransactionColumn) {
      await prisma.reportColumn.delete({ where: { id: column.id } });
    } else {
      await prisma.reportColumn.update({ where: { id: column.id }, data: { columnKey: "lastTransactionDate", label: "Last Transaction Date" } });
    }
  }
  const existing = await prisma.report.findFirst({
    where: { householdId, name: "Item Location Report", baseTable: "item_location", active: true },
  });
  if (existing) {
    await ensureMaintenanceDueReport(householdId, userId);
    await ensureReplenishmentReport(householdId, userId);
    return;
  }
  const report = await prisma.report.create({
    data: { householdId, ownerUserId: userId, name: "Item Location Report", baseTable: "item_location", visibility: "PUBLIC" },
  });
  await prisma.reportColumn.createMany({
    data: defaultColumnsForBaseTable("item_location").map((column, position) => ({
      householdId,
      reportId: report.id,
      columnKey: column.key,
      label: column.label,
      position,
    })),
  });
  await ensureMaintenanceDueReport(householdId, userId);
  await ensureReplenishmentReport(householdId, userId);
}

const ensureSeedReportCached = unstable_cache(
  async (householdId: string, userId: string, _dateKey: string) => {
    void _dateKey;
    await bootstrapSeedReports(householdId, userId);
    return true;
  },
  ["seed-reports-v1"],
);

function ensureSeedReport(householdId: string, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return runOnce(`seed-reports:${householdId}:${today}`, () => ensureSeedReportCached(householdId, userId, today));
}

function dateOffsetValue(daysAhead: number) {
  const value = new Date();
  value.setDate(value.getDate() + daysAhead);
  value.setHours(0, 0, 0, 0);
  return value.toISOString().slice(0, 10);
}

async function upsertReportFilter(reportId: string, householdId: string, columnKey: string, operator: "ON_OR_BEFORE" | "IS_NOT_EMPTY" | "EQUALS", value: string) {
  const existing = await prisma.reportFilter.findFirst({ where: { reportId, householdId, columnKey, operator, role: "CRITERIA" } });
  if (existing) {
    await prisma.reportFilter.update({ where: { id: existing.id }, data: { value, active: true } });
  } else {
    await prisma.reportFilter.create({ data: { householdId, reportId, columnKey, operator, value, role: "CRITERIA" } });
  }
}

async function ensureMaintenanceDueReport(householdId: string, userId: string) {
  let report = await prisma.report.findFirst({
    where: { householdId, name: "Item Maintenance Due Next 30 Days", baseTable: "item_maintenance", active: true },
  });
  if (!report) {
    report = await prisma.report.create({
      data: { householdId, ownerUserId: userId, name: "Item Maintenance Due Next 30 Days", baseTable: "item_maintenance", visibility: "PUBLIC" },
    });
  }
  for (const [position, column] of [
    { key: "maintenanceType", label: "Maintenance Type" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "nextDueDate", label: "Next Due Date" },
  ].entries()) {
    await prisma.reportColumn.upsert({
      where: { reportId_columnKey: { reportId: report.id, columnKey: column.key } },
      update: { label: column.label, position, active: true },
      create: { householdId, reportId: report.id, columnKey: column.key, label: column.label, position },
    });
  }
  await upsertReportFilter(report.id, householdId, "nextDueDate", "IS_NOT_EMPTY", "");
  await upsertReportFilter(report.id, householdId, "nextDueDate", "ON_OR_BEFORE", dateOffsetValue(30));
}

async function ensureReplenishmentReport(householdId: string, userId: string) {
  let report = await prisma.report.findFirst({
    where: { householdId, name: "Replenishment Needed Report", baseTable: "item", active: true },
  });
  if (!report) {
    report = await prisma.report.create({
      data: { householdId, ownerUserId: userId, name: "Replenishment Needed Report", baseTable: "item", visibility: "PUBLIC" },
    });
  }
  for (const [position, column] of [
    { key: "name", label: "Name" },
    { key: "brand", label: "Brand" },
    { key: "totalQuantity", label: "Current Stock (Total Quantity)" },
    { key: "minQuantity", label: "Reorder Threshold (Min Quantity)" },
    { key: "targetQuantity", label: "Max Quantity (Target Quantity)" },
    { key: "replenishmentNeeded", label: "Replenishment Needed" },
  ].entries()) {
    await prisma.reportColumn.upsert({
      where: { reportId_columnKey: { reportId: report.id, columnKey: column.key } },
      update: { label: column.label, position, active: true },
      create: { householdId, reportId: report.id, columnKey: column.key, label: column.label, position },
    });
  }
  await upsertReportFilter(report.id, householdId, "replenishmentNeeded", "EQUALS", "Yes");
}

async function getReportSources(householdId: string) {
  const recordTypes = await prisma.recordType.findMany({
    where: { householdId, active: true },
    orderBy: { name: "asc" },
  });
  return [
    ...SYSTEM_REPORT_SOURCES,
    ...recordTypes.map((recordType) => ({
      value: `record:${recordType.id}`,
      label: recordType.name,
      kind: "record" as const,
      recordTypeId: recordType.id,
    })),
  ];
}

async function reportDisplayColumnLabel(householdId: string, baseTable: string, columnKey: string) {
  if (baseTable.startsWith("record:")) {
    const recordTypeId = baseTable.replace("record:", "");
    const field = await prisma.recordField.findFirst({ where: { householdId, recordTypeId, key: columnKey, active: true } });
    return field?.label ?? columnLabel(columnKey, baseTable);
  }
  if (baseTable === "item_location") {
    const [recordKey, fieldKey] = columnKey.split(".");
    if (recordKey && fieldKey) {
      const recordType = await prisma.recordType.findFirst({
        where: { householdId, key: recordKey, active: true },
        include: { fields: { where: { key: fieldKey, active: true } } },
      });
      const field = recordType?.fields[0];
      if (recordType && field) return `"${recordType.name}": "${field.label}"`;
    }
  }
  return columnLabel(columnKey, baseTable);
}

async function getItemLocationRows(householdId: string): Promise<ReportRow[]> {
  const itemLocations = await prisma.itemLocation.findMany({ where: { householdId, quantity: { gt: 0 } }, orderBy: [{ updatedAt: "desc" }] });
  const items = await prisma.item.findMany({ where: { householdId } });
  const locations = await prisma.location.findMany({ where: { householdId } });
  const rooms = await prisma.room.findMany({ where: { householdId } });
  const areas = await prisma.area.findMany({ where: { householdId } });
  const putaways = await prisma.itemPutaway.findMany({
    where: { householdId },
    select: { itemLocationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const transfers = await prisma.itemTransfer.findMany({
    where: { householdId },
    select: { fromItemLocationId: true, toItemLocationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const consumptions = await prisma.itemConsumption.findMany({
    where: { householdId },
    select: { itemLocationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const lastTransactionDateByItemLocationId = new Map<string, Date>();
  for (const putaway of putaways) {
    const existing = lastTransactionDateByItemLocationId.get(putaway.itemLocationId);
    if (!existing || putaway.createdAt > existing) lastTransactionDateByItemLocationId.set(putaway.itemLocationId, putaway.createdAt);
  }
  for (const transfer of transfers) {
    for (const itemLocationId of [transfer.fromItemLocationId, transfer.toItemLocationId]) {
      const existing = lastTransactionDateByItemLocationId.get(itemLocationId);
      if (!existing || transfer.createdAt > existing) lastTransactionDateByItemLocationId.set(itemLocationId, transfer.createdAt);
    }
  }
  for (const consumption of consumptions) {
    const existing = lastTransactionDateByItemLocationId.get(consumption.itemLocationId);
    if (!existing || consumption.createdAt > existing) lastTransactionDateByItemLocationId.set(consumption.itemLocationId, consumption.createdAt);
  }
  return itemLocations
    .map((row) => {
      const item = itemById.get(row.itemId);
      const location = locationById.get(row.locationId);
      const room = roomById.get(row.roomId);
      const area = areaById.get(row.areaId);
      return {
        id: row.id,
        cells: {
          item: item?.name ?? "",
          "item.name": item?.name ?? "",
          quantity: row.quantity.toString(),
          location: location?.name ?? "",
          "location.name": location?.name ?? "",
          room: room?.name ?? "",
          "room.name": room?.name ?? "",
          area: area?.name ?? "",
          "area.name": area?.name ?? "",
          brand: item?.brand ?? "",
          "item.brand": item?.brand ?? "",
          model: item?.model ?? "",
          "item.model": item?.model ?? "",
          serialNumber: item?.serialNumber ?? "",
          "item.serial_number": item?.serialNumber ?? "",
          upc: item?.upc ?? "",
          "item.upc": item?.upc ?? "",
          "item.notes": item?.notes ?? "",
          "location.notes": location?.notes ?? "",
          "room.notes": room?.notes ?? "",
          "area.notes": area?.notes ?? "",
          lastTransactionDate: dateTimeValue(lastTransactionDateByItemLocationId.get(row.id)),
          updatedAt: dateValue(row.updatedAt),
        },
      };
    })
    .sort((a, b) => `${a.cells["item.name"]}|${a.cells["location.name"]}|${a.cells["room.name"]}|${a.cells["area.name"]}`.localeCompare(`${b.cells["item.name"]}|${b.cells["location.name"]}|${b.cells["room.name"]}|${b.cells["area.name"]}`));
}

async function getSourceRows(householdId: string, baseTable: string): Promise<ReportRow[]> {
  if (baseTable === "item_location") return getItemLocationRows(householdId);
  if (baseTable === "item") {
    const [rows, itemLocations, maintenanceLogs] = await Promise.all([
      prisma.item.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } }),
      prisma.itemLocation.findMany({ where: { householdId, quantity: { gt: 0 } }, select: { itemId: true, quantity: true } }),
      prisma.itemMaintenance.findMany({ where: { householdId, active: true }, select: { itemId: true, cost: true } }),
    ]);

    const totalQuantityByItemId = new Map<string, number>();
    for (const loc of itemLocations) {
      totalQuantityByItemId.set(loc.itemId, (totalQuantityByItemId.get(loc.itemId) ?? 0) + Number(loc.quantity));
    }

    const maintenanceCostsByItemId = new Map<string, number[]>();
    for (const log of maintenanceLogs) {
      const costs = maintenanceCostsByItemId.get(log.itemId) ?? [];
      if (log.cost) costs.push(Number(log.cost));
      maintenanceCostsByItemId.set(log.itemId, costs);
    }

    return rows.map((row) => {
      const totalQuantity = totalQuantityByItemId.get(row.id) ?? 0;
      const minQuantityNum = row.minQuantity ? Number(row.minQuantity) : null;
      const targetQuantityNum = row.targetQuantity ? Number(row.targetQuantity) : null;
      const replenishmentNeeded = minQuantityNum !== null && minQuantityNum > 0 && totalQuantity <= minQuantityNum ? "Yes" : "No";

      const maintenanceCosts = maintenanceCostsByItemId.get(row.id) ?? [];
      const tco = calculateTco({
        purchasePrice: row.purchasePrice ? Number(row.purchasePrice) : null,
        purchaseDate: row.purchaseDate,
        createdAt: row.createdAt,
        maintenanceCosts,
      });

      return {
        id: row.id,
        cells: {
          name: row.name,
          brand: row.brand ?? "",
          model: row.model ?? "",
          serial_number: row.serialNumber ?? "",
          upc: row.upc ?? "",
          totalQuantity: totalQuantity.toString(),
          minQuantity: minQuantityNum !== null ? minQuantityNum.toString() : "",
          targetQuantity: targetQuantityNum !== null ? targetQuantityNum.toString() : "",
          replenishmentNeeded,
          purchasePrice: row.purchasePrice ? formatCurrency(Number(row.purchasePrice)) : "",
          purchaseDate: dateValue(row.purchaseDate),
          totalMaintenanceCost: formatCurrency(tco.totalMaintenanceCost),
          totalOwnershipCost: formatCurrency(tco.totalOwnershipCost),
          costPerMonth: formatCurrency(tco.costPerMonth),
          costPerYear: formatCurrency(tco.costPerYear),
          notes: row.notes ?? "",
          updatedAt: dateValue(row.updatedAt),
        },
      };
    });
  }
  if (baseTable === "item_multi_upc") {
    const rows = await prisma.itemMultiUpc.findMany({
      where: { householdId, active: true },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        upc: row.upc,
        "item.name": row.item.name,
        createdAt: dateTimeValue(row.createdAt),
        updatedAt: dateTimeValue(row.updatedAt),
      },
    }));
  }
  if (baseTable === "location") {
    const rows = await prisma.location.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } });
    return rows.map((row) => ({ id: row.id, cells: { name: row.name, notes: row.notes ?? "", updatedAt: dateValue(row.updatedAt) } }));
  }
  if (baseTable === "room") {
    const locations = await prisma.location.findMany({ where: { householdId } });
    const locationById = new Map(locations.map((row) => [row.id, row]));
    const rows = await prisma.room.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } });
    return rows.map((row) => ({ id: row.id, cells: { name: row.name, "location.name": locationById.get(row.locationId)?.name ?? "", notes: row.notes ?? "", updatedAt: dateValue(row.updatedAt) } }));
  }
  if (baseTable === "area") {
    const locations = await prisma.location.findMany({ where: { householdId } });
    const rooms = await prisma.room.findMany({ where: { householdId } });
    const locationById = new Map(locations.map((row) => [row.id, row]));
    const roomById = new Map(rooms.map((row) => [row.id, row]));
    const rows = await prisma.area.findMany({ where: { householdId, active: true }, orderBy: { name: "asc" } });
    return rows.map((row) => ({ id: row.id, cells: { name: row.name, "location.name": locationById.get(row.locationId)?.name ?? "", "room.name": roomById.get(row.roomId)?.name ?? "", notes: row.notes ?? "", updatedAt: dateValue(row.updatedAt) } }));
  }
  if (baseTable === "item_putaway") {
    const rows = await prisma.itemPutaway.findMany({
      where: { householdId },
      include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        transactionNo: transactionRecordName(baseTable, row.transactionNo),
        "item.name": row.item.name,
        quantity: row.quantity.toString(),
        "location.name": row.itemLocation.location.name,
        "room.name": row.itemLocation.room.name,
        "area.name": row.itemLocation.area.name,
        "performedBy.name": row.performedBy.name,
        createdAt: dateTimeValue(row.createdAt),
      },
    }));
  }
  if (baseTable === "item_transfer") {
    const rows = await prisma.itemTransfer.findMany({
      where: { householdId },
      include: { item: true, fromItemLocation: { include: { area: true } }, toItemLocation: { include: { area: true } }, performedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        transactionNo: transactionRecordName(baseTable, row.transactionNo),
        "item.name": row.item.name,
        quantity: row.quantity.toString(),
        "from.area.name": row.fromItemLocation.area.name,
        "to.area.name": row.toItemLocation.area.name,
        "performedBy.name": row.performedBy.name,
        createdAt: dateTimeValue(row.createdAt),
      },
    }));
  }
  if (baseTable === "item_consumption") {
    const rows = await prisma.itemConsumption.findMany({
      where: { householdId },
      include: { item: true, itemLocation: { include: { location: true, room: true, area: true } }, performedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        transactionNo: transactionRecordName(baseTable, row.transactionNo),
        "item.name": row.item.name,
        quantity: row.quantity.toString(),
        "location.name": row.itemLocation.location.name,
        "room.name": row.itemLocation.room.name,
        "area.name": row.itemLocation.area.name,
        "performedBy.name": row.performedBy.name,
        createdAt: dateTimeValue(row.createdAt),
      },
    }));
  }
  if (baseTable === "item_maintenance") {
    const rows = await prisma.itemMaintenance.findMany({
      where: { householdId },
      include: { item: true, performedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        transactionNo: transactionRecordName(baseTable, row.transactionNo),
        "item.name": row.item.name,
        maintenanceType: row.maintenanceType,
        "performedBy.name": row.performedBy.name,
        vendor: row.vendor ?? "",
        cost: row.cost ? formatCurrency(Number(row.cost)) : "",
        nextDueDate: dateValue(row.nextDueDate),
        createdAt: dateTimeValue(row.createdAt),
      },
    }));
  }
  if (baseTable === "item_loan") {
    const rows = await prisma.itemLoan.findMany({
      where: { householdId },
      include: { item: true, borrower: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      cells: {
        transactionNo: transactionRecordName(baseTable, row.transactionNo),
        "item.name": row.item.name,
        "borrower.name": row.borrower.name,
        loanDate: dateValue(row.loanDate),
        expectedReturnDate: dateValue(row.expectedReturnDate),
        actualReturnDate: dateValue(row.actualReturnDate),
        status: row.actualReturnDate ? "Returned" : "Active",
        conditionNotes: row.conditionNotes ?? "",
        notes: row.notes ?? "",
        createdAt: dateTimeValue(row.createdAt),
      },
    }));
  }
  return [];
}

function dateBoundary(daysBack: number) {
  const value = new Date();
  value.setDate(value.getDate() - daysBack);
  value.setHours(0, 0, 0, 0);
  return value;
}

function applyFilters(rows: ReportRow[], filters: Array<{ columnKey: string; operator: string; value: string; active: boolean; role?: string }>) {
  const activeFilters = filters.filter((filter) => filter.active && (filter.role ?? "CRITERIA") === "CRITERIA" && (filter.value.trim() || ["IS_EMPTY", "IS_NOT_EMPTY", "LAST_7_DAYS", "LAST_30_DAYS"].includes(filter.operator)));
  return rows.filter((row) =>
    activeFilters.every((filter) => {
      const raw = row.cells[filter.columnKey] ?? "";
      const value = filter.value.trim();
      const rawLower = raw.toLowerCase();
      const valueLower = value.toLowerCase();
      const rawDate = new Date(raw);
      const valueDate = new Date(value);
      if (filter.operator === "EQUALS") return raw.toLowerCase() === value.toLowerCase();
      if (filter.operator === "NOT_EQUALS") return rawLower !== valueLower;
      if (filter.operator === "STARTS_WITH") return rawLower.startsWith(valueLower);
      if (filter.operator === "ENDS_WITH") return rawLower.endsWith(valueLower);
      if (filter.operator === "GREATER_THAN") return Number(raw) > Number(value);
      if (filter.operator === "LESS_THAN") return Number(raw) < Number(value);
      if (filter.operator === "ON_OR_AFTER") return !Number.isNaN(rawDate.getTime()) && !Number.isNaN(valueDate.getTime()) && rawDate >= valueDate;
      if (filter.operator === "ON_OR_BEFORE") return !Number.isNaN(rawDate.getTime()) && !Number.isNaN(valueDate.getTime()) && rawDate <= valueDate;
      if (filter.operator === "LAST_7_DAYS") return !Number.isNaN(rawDate.getTime()) && rawDate >= dateBoundary(7);
      if (filter.operator === "LAST_30_DAYS") return !Number.isNaN(rawDate.getTime()) && rawDate >= dateBoundary(30);
      if (filter.operator === "IS_EMPTY") return !raw.trim();
      if (filter.operator === "IS_NOT_EMPTY") return Boolean(raw.trim());
      return rawLower.includes(valueLower);
    }),
  );
}

async function getAvailableColumnsForReport(householdId: string, baseTable: string) {
  if (SYSTEM_REPORT_COLUMNS[baseTable] && baseTable !== "item_location") return SYSTEM_REPORT_COLUMNS[baseTable];
  if (baseTable.startsWith("record:")) {
    const recordTypeId = baseTable.replace("record:", "");
    const recordType = await prisma.recordType.findFirst({
      where: { id: recordTypeId, householdId, active: true },
      include: { fields: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
    });
    return recordType?.fields.map((field) => ({ key: field.key, label: field.label })) ?? [];
  }
  const relatedRecordTypes = await prisma.recordType.findMany({
    where: { householdId, key: { in: ["item", "location", "room", "area"] }, active: true },
    include: { fields: { where: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } },
    orderBy: { name: "asc" },
  });
  const configuredFields = relatedRecordTypes.flatMap((recordType) =>
    recordType.fields.map((field) => ({ key: `${recordType.key}.${field.key}`, label: `"${recordType.name}": "${field.label}"` })),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const columnsByKey = new Map<string, { key: string; label: string }>();
  for (const column of [...(SYSTEM_REPORT_COLUMNS[baseTable] ?? []), ...configuredFields]) columnsByKey.set(column.key, column);
  for (const [legacyKey, nextKey] of [["brand", "item.brand"], ["model", "item.model"], ["serialNumber", "item.serial_number"], ["upc", "item.upc"]]) {
    const next = columnsByKey.get(nextKey);
    if (next) columnsByKey.set(legacyKey, { key: legacyKey, label: next.label });
  }
  return Array.from(columnsByKey.values());
}

const loadReportSources = unstable_cache(getReportSources, ["report-sources-v1"], { tags: [REPORTS_DATA_TAG] });

export async function getReportsPageData(searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSeedReport(householdId, user.id);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const where = { householdId, active: true, OR: [{ visibility: "PUBLIC" as const }, { ownerUserId: user.id }] };
  const [loadedReports, databaseTotal, sources] = await Promise.all([
    prisma.report.findMany({ where, select: { id: true, name: true, baseTable: true, visibility: true, columns: { select: { active: true }, orderBy: [{ position: "asc" }, { label: "asc" }] } }, orderBy: { name: "asc" }, ...(query ? {} : { skip, take: pageSize }) }),
    query ? Promise.resolve(0) : prisma.report.count({ where }),
    loadReportSources(householdId),
  ]);
  const sourceLabelByValue = new Map(sources.map((source) => [source.value, source.label]));
  const needle = query.toLocaleLowerCase();
  const matchingReports = query
    ? loadedReports.filter((report) => [
        report.name,
        sourceLabelByValue.get(report.baseTable) ?? report.baseTable,
        report.visibility === "PUBLIC" ? "Public" : "Private",
        `${report.columns.filter((column) => column.active).length} columns`,
      ].some((value) => value.toLocaleLowerCase().includes(needle)))
    : loadedReports;
  const reports = query ? matchingReports.slice(skip, skip + pageSize) : matchingReports;
  const total = query ? matchingReports.length : databaseTotal;
  return { reports, sources, user, query, pagination: paginationResult(total, page, pageSize) };
}

export async function getNewReportPageData() {
  const { householdId } = await requireHouseholdContext();
  return { sources: await getReportSources(householdId) };
}

function runtimeValue(searchParams: RuntimeReportFilters | undefined, filterId: string) {
  const value = searchParams?.[`filter_${filterId}`];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function getReportPageData(id: string, searchParams?: RuntimeReportFilters) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureSeedReport(householdId, user.id);
  const report = await prisma.report.findFirst({
    where: { id, householdId, active: true, OR: [{ visibility: "PUBLIC" }, { ownerUserId: user.id }] },
    include: { columns: { orderBy: [{ position: "asc" }, { label: "asc" }] }, filters: true, owner: true },
  });
  if (!report) notFound();
  const columns = await Promise.all(report.columns.filter((column) => column.active).map(async (column) => ({ ...column, label: await reportDisplayColumnLabel(householdId, report.baseTable, column.columnKey) })));
  const availableFilters = await Promise.all(report.filters.filter((filter) => filter.active && filter.role === "FILTER").map(async (filter) => ({ ...filter, label: await reportDisplayColumnLabel(householdId, report.baseTable, filter.columnKey), value: runtimeValue(searchParams, filter.id) })));
  const runtimeFilters = availableFilters.filter((filter) => filter.value.trim()).map((filter) => ({ columnKey: filter.columnKey, operator: filter.operator, value: filter.value, active: true, role: "CRITERIA" }));
  const rawQuery = searchParams?.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const needle = query.toLocaleLowerCase();
  const filteredRows = applyFilters(applyFilters(await getSourceRows(householdId, report.baseTable), report.filters), runtimeFilters);
  const rows = query
    ? filteredRows.filter((row) => columns.some((column) => (row.cells[column.columnKey] ?? "").toLocaleLowerCase().includes(needle)))
    : filteredRows;
  const { page, pageSize, skip } = parsePagination(searchParams);
  const visibleRows = rows.slice(skip, skip + pageSize);
  return {
    report,
    columns,
    availableFilters,
    query,
    rows: visibleRows.map((row) => ({ id: row.id, cells: Object.fromEntries(columns.map((column) => [column.columnKey, row.cells[column.columnKey] ?? ""])) })),
    pagination: paginationResult(rows.length, page, pageSize),
    user,
  };
}

export async function getReportEditPageData(id: string) {
  const { householdId, user } = await requireHouseholdContext();
  const report = await prisma.report.findFirst({
    where: { id, householdId, active: true, OR: [{ visibility: "PUBLIC" }, { ownerUserId: user.id }] },
    include: { columns: { orderBy: [{ position: "asc" }, { label: "asc" }] }, filters: { orderBy: { createdAt: "asc" } } },
  });
  if (!report) notFound();
  const columns = await Promise.all(report.columns.map(async (column) => ({ ...column, label: await reportDisplayColumnLabel(householdId, report.baseTable, column.columnKey) })));
  return { report: { ...report, columns }, availableColumns: await getAvailableColumnsForReport(householdId, report.baseTable), user };
}
