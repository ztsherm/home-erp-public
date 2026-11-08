export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function shortDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

const transactionPrefixes: Record<string, string> = {
  putaway: "IP",
  item_putaway: "IP",
  ITEM_PUTAWAY: "IP",
  transfer: "IT",
  item_transfer: "IT",
  ITEM_TRANSFER: "IT",
  consumption: "IC",
  item_consumption: "IC",
  ITEM_CONSUMPTION: "IC",
  maintenance: "IM",
  item_maintenance: "IM",
  ITEM_MAINTENANCE: "IM",
};

export function transactionRecordName(kind: string, transactionNo: number | string) {
  const prefix = transactionPrefixes[kind] ?? "TX";
  const parsed = typeof transactionNo === "number" ? transactionNo : Number.parseInt(transactionNo, 10);
  const sequence = Number.isFinite(parsed) ? String(parsed) : String(transactionNo);
  return `${prefix}${sequence.padStart(5, "0")}`;
}
