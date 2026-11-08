export const INVENTORY_CSV_COLUMNS = ["id", "name", "description", "brand", "model", "serialNumber", "upc", "minQuantity", "targetQuantity", "purchasePrice", "purchaseDate", "status", "notes", "active"] as const;

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function inventoryCsv(items: Array<Record<string, unknown>>) {
  return [INVENTORY_CSV_COLUMNS.join(","), ...items.map((item) => INVENTORY_CSV_COLUMNS.map((column) => csvCell(item[column])).join(","))].join("\r\n");
}
