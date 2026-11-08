export function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function nextTaskDueDate(nextDate: Date, intervalDays: number, today: Date) {
  const dueDate = startOfDay(nextDate);
  const currentDay = startOfDay(today);
  if (intervalDays <= 0) return null;
  return dueDate <= currentDay ? dueDate : null;
}

export function nextTaskDateFromCompletion(today: Date, intervalDays: number) {
  if (intervalDays <= 0) return null;
  return startOfDay(addDays(today, intervalDays));
}
