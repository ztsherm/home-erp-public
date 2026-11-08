import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { ensureTaskRecordType } from "@/features/metadata/queries";
import { getEligibleTaskAssignees } from "@/features/tasks/assignees";
import { unstable_cache } from "next/cache";
import { SHELL_CREATE_DATA_TAG } from "@/server/cache";
import { paginationResult, parsePagination } from "@/lib/pagination";
import { shortDateTime } from "@/lib/format";

const getTaskRecordType = unstable_cache(
  (householdId: string) => prisma.recordType.findFirst({ where: { householdId, key: "task", active: true }, select: { id: true } }),
  ["task-record-type-v1"],
  { tags: [SHELL_CREATE_DATA_TAG] },
);

function selectedFilter(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] ?? "me" : raw || "me";
}

function assignmentWhere(selected: string, currentPeopleId: string) {
  if (selected === "all") return {};
  if (selected === "unassigned") return { assignedToId: null };
  return { assignedToId: selected === "me" ? currentPeopleId : selected };
}

export async function getTasksPageData(searchParams: Record<string, string | string[] | undefined> = {}) {
  const { householdId, user } = await requireHouseholdContext();
  await ensureTaskRecordType(householdId);
  const selected = selectedFilter(searchParams?.assigned);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const rawQuery = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const query = rawQuery?.trim() ?? "";
  const where = { householdId, status: "OPEN" as const, ...assignmentWhere(selected, user.peopleId) };
  const [people, allTasks, databaseTotal, countMe, countAll, countUnassigned] = await Promise.all([
    getEligibleTaskAssignees(householdId),
    prisma.task.findMany({
      where,
      include: { item: true, assignedTo: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      ...(query ? {} : { skip, take: pageSize }),
    }),
    prisma.task.count({ where }),
    prisma.task.count({ where: { householdId, status: "OPEN", assignedToId: user.peopleId } }),
    prisma.task.count({ where: { householdId, status: "OPEN" } }),
    prisma.task.count({ where: { householdId, status: "OPEN", assignedToId: null } }),
  ]);
  const needle = query.toLocaleLowerCase();
  const matchingTasks = query ? allTasks.filter((task) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const dueLabel = due < today ? `Overdue - ${shortDateTime(task.dueDate)}` : due.getTime() === today.getTime() ? "Due today" : `Due ${task.dueDate.toLocaleDateString()}`;
    return [task.title, task.item.name, dueLabel, task.assignedTo ? `Assigned to ${task.assignedTo.name}` : "Unassigned"]
      .some((value) => value.toLocaleLowerCase().includes(needle));
  }) : allTasks;
  const total = query ? matchingTasks.length : databaseTotal;
  const tasks = query ? matchingTasks.slice(skip, skip + pageSize) : matchingTasks;
  const taskRecordType = await getTaskRecordType(householdId);
  return {
    tasks,
    people,
    selected,
    query,
    counts: {
      me: countMe,
      all: countAll,
      unassigned: countUnassigned,
    },
    currentPeopleId: user.peopleId,
    taskRecordType,
    pagination: paginationResult(total, page, pageSize),
  };
}

export async function getHomeTasks(householdId: string) {
  return prisma.task.findMany({
    where: { householdId, status: "OPEN" },
    include: { item: true, assignedTo: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 12,
  });
}
