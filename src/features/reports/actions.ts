"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { text } from "@/features/shared/form";
import { columnLabel, defaultColumnsForBaseTable } from "@/features/reports/definitions";
import { invalidateReportsData } from "@/server/cache";

function baseTable(value?: string) {
  return value?.trim() || "item_location";
}

function visibility(value?: string) {
  return value === "PUBLIC" ? "PUBLIC" as const : "PRIVATE" as const;
}

function operator(value?: string) {
  if (
    value === "CONTAINS" ||
    value === "STARTS_WITH" ||
    value === "ENDS_WITH" ||
    value === "EQUALS" ||
    value === "NOT_EQUALS" ||
    value === "GREATER_THAN" ||
    value === "LESS_THAN" ||
    value === "ON_OR_AFTER" ||
    value === "ON_OR_BEFORE" ||
    value === "LAST_7_DAYS" ||
    value === "LAST_30_DAYS" ||
    value === "IS_EMPTY" ||
    value === "IS_NOT_EMPTY"
  ) return value;
  return "CONTAINS" as const;
}

function filterRole(value?: string) {
  return value === "FILTER" ? "FILTER" as const : "CRITERIA" as const;
}

async function requireEditableReport(reportId: string) {
  const { householdId, user } = await requireHouseholdContext();
  const report = await prisma.report.findFirstOrThrow({
    where: { id: reportId, householdId, active: true, OR: [{ ownerUserId: user.id }, { visibility: "PUBLIC" }] },
  });
  return { householdId, user, report };
}

async function reportColumnLabel(householdId: string, reportId: string, columnKey: string) {
  const report = await prisma.report.findFirstOrThrow({ where: { id: reportId, householdId } });
  if (report.baseTable.startsWith("record:")) {
    const recordTypeId = report.baseTable.replace("record:", "");
    const recordType = await prisma.recordType.findFirst({
      where: { id: recordTypeId, householdId, active: true },
      include: { fields: { where: { key: columnKey, active: true } } },
    });
    const field = recordType?.fields[0];
    return field ? field.label : columnLabel(columnKey, report.baseTable);
  }
  if (report.baseTable !== "item_location" && !report.baseTable.startsWith("record:")) return columnLabel(columnKey, report.baseTable);
  const [recordKey, fieldKey] = columnKey.split(".");
  if (!recordKey || !fieldKey) return columnLabel(columnKey);
  const recordType = await prisma.recordType.findFirst({
    where: { householdId, key: recordKey, active: true },
    include: { fields: { where: { key: fieldKey, active: true } } },
  });
  const field = recordType?.fields[0];
  return recordType && field ? `"${recordType.name}": "${field.label}"` : columnLabel(columnKey);
}

export async function createReport(formData: FormData) {
  const { householdId, user } = await requireHouseholdContext();
  const selectedBaseTable = baseTable(text(formData, "baseTable"));
  const report = await prisma.report.create({
    data: {
      householdId,
      ownerUserId: user.id,
      name: text(formData, "name") ?? "New Report",
      baseTable: selectedBaseTable,
      visibility: visibility(text(formData, "visibility")),
    },
  });
  await prisma.reportColumn.createMany({
    data: defaultColumnsForBaseTable(selectedBaseTable).map((column, position) => ({
      householdId,
      reportId: report.id,
      columnKey: column.key,
      label: column.label,
      position,
    })),
  });
  invalidateReportsData();
  revalidatePath("/reports");
  redirect(`/reports/${report.id}/edit`);
}

export async function updateReport(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Report id is required");
  const { report } = await requireEditableReport(id);
  await prisma.report.update({
    where: { id: report.id },
    data: {
      name: text(formData, "name") ?? report.name,
      visibility: visibility(text(formData, "visibility")),
    },
  });
  invalidateReportsData();
  revalidatePath("/reports");
  revalidatePath(`/reports/${report.id}`);
  revalidatePath(`/reports/${report.id}/edit`);
  redirect(`/reports/${report.id}`);
}

export async function addReportColumn(formData: FormData) {
  const reportId = text(formData, "reportId");
  const columnKey = text(formData, "columnKey");
  if (!reportId || !columnKey) throw new Error("Report and column are required");
  const { householdId, report } = await requireEditableReport(reportId);
  const label = await reportColumnLabel(householdId, report.id, columnKey);
  const position = await prisma.reportColumn.count({ where: { reportId: report.id, householdId } });
  const column = await prisma.reportColumn.upsert({
    where: { reportId_columnKey: { reportId: report.id, columnKey } },
    update: { active: true, label },
    create: { householdId, reportId: report.id, columnKey, label, position },
    select: { id: true, columnKey: true, label: true, active: true },
  });
  invalidateReportsData();
  revalidatePath(`/reports/${report.id}`);
  revalidatePath(`/reports/${report.id}/edit`);
  return column;
}

export async function removeReportColumn(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Column id is required");
  const column = await prisma.reportColumn.findFirstOrThrow({ where: { id }, include: { report: true } });
  await requireEditableReport(column.reportId);
  await prisma.reportColumn.update({ where: { id }, data: { active: false } });
  invalidateReportsData();
  revalidatePath(`/reports/${column.reportId}`);
  revalidatePath(`/reports/${column.reportId}/edit`);
}

export async function reorderReportColumns(reportId: string, columnIds: string[]) {
  const { householdId, report } = await requireEditableReport(reportId);
  const existingColumns = await prisma.reportColumn.findMany({
    where: { reportId: report.id, householdId, id: { in: columnIds }, active: true },
    select: { id: true },
  });
  const existingIds = new Set(existingColumns.map((column) => column.id));
  await prisma.$transaction(
    columnIds
      .filter((id) => existingIds.has(id))
      .map((id, position) => prisma.reportColumn.update({ where: { id }, data: { position } })),
  );
  invalidateReportsData();
  revalidatePath(`/reports/${report.id}`);
  revalidatePath(`/reports/${report.id}/edit`);
}

export async function createReportFilter(formData: FormData) {
  const reportId = text(formData, "reportId");
  const columnKey = text(formData, "columnKey");
  if (!reportId || !columnKey) throw new Error("Report and column are required");
  const { householdId, report } = await requireEditableReport(reportId);
  await prisma.reportFilter.create({
    data: {
      householdId,
      reportId: report.id,
      columnKey,
      operator: operator(text(formData, "operator")),
      value: text(formData, "value") ?? "",
      role: filterRole(text(formData, "role")),
    },
  });
  invalidateReportsData();
  revalidatePath(`/reports/${report.id}`);
  revalidatePath(`/reports/${report.id}/edit`);
}

export async function updateReportFilter(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Filter id is required");
  const filter = await prisma.reportFilter.findFirstOrThrow({ where: { id } });
  await requireEditableReport(filter.reportId);
  await prisma.reportFilter.update({
    where: { id },
    data: {
      columnKey: text(formData, "columnKey") ?? filter.columnKey,
      operator: operator(text(formData, "operator")),
      value: text(formData, "value") ?? filter.value,
      role: filterRole(text(formData, "role")),
      active: formData.get("active") === "on",
    },
  });
  invalidateReportsData();
  revalidatePath(`/reports/${filter.reportId}`);
  revalidatePath(`/reports/${filter.reportId}/edit`);
}

export async function removeReportFilter(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Filter id is required");
  const filter = await prisma.reportFilter.findFirstOrThrow({ where: { id } });
  await requireEditableReport(filter.reportId);
  await prisma.reportFilter.update({ where: { id }, data: { active: false } });
  invalidateReportsData();
  revalidatePath(`/reports/${filter.reportId}`);
  revalidatePath(`/reports/${filter.reportId}/edit`);
}
