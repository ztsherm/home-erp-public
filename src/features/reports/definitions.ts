export type ReportSource = {
  value: string;
  label: string;
  kind: "system" | "record";
  recordTypeId?: string;
};

export const SYSTEM_REPORT_SOURCES: ReportSource[] = [
  { value: "item_location", label: "Item Location", kind: "system" },
  { value: "item", label: "Item", kind: "system" },
  { value: "item_multi_upc", label: "Item Multi-UPC", kind: "system" },
  { value: "location", label: "Location", kind: "system" },
  { value: "room", label: "Room", kind: "system" },
  { value: "area", label: "Area", kind: "system" },
  { value: "item_putaway", label: "Item Putaway", kind: "system" },
  { value: "item_transfer", label: "Item Transfer", kind: "system" },
  { value: "item_consumption", label: "Item Consumption", kind: "system" },
  { value: "item_maintenance", label: "Item Maintenance", kind: "system" },
  { value: "item_loan", label: "Item Loan", kind: "system" },
];

export const SYSTEM_REPORT_COLUMNS: Record<string, Array<{ key: string; label: string }>> = {
  item_multi_upc: [
    { key: "upc", label: "UPC" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "createdAt", label: "Created" },
    { key: "updatedAt", label: "Updated" },
  ],
  item_location: [
    { key: "quantity", label: "Quantity" },
    { key: "lastTransactionDate", label: "Last Transaction Date" },
    { key: "area.name", label: "\"Area\": \"Name\"" },
    { key: "area.notes", label: "\"Area\": \"Notes\"" },
    { key: "item.brand", label: "\"Item\": \"Brand\"" },
    { key: "item.model", label: "\"Item\": \"Model\"" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "item.notes", label: "\"Item\": \"Notes\"" },
    { key: "item.serial_number", label: "\"Item\": \"Serial Number\"" },
    { key: "item.upc", label: "\"Item\": \"UPC\"" },
    { key: "location.name", label: "\"Location\": \"Name\"" },
    { key: "location.notes", label: "\"Location\": \"Notes\"" },
    { key: "room.name", label: "\"Room\": \"Name\"" },
    { key: "room.notes", label: "\"Room\": \"Notes\"" },
  ],
  item: [
    { key: "name", label: "Name" },
    { key: "brand", label: "Brand" },
    { key: "model", label: "Model" },
    { key: "serial_number", label: "Serial Number" },
    { key: "upc", label: "UPC" },
    { key: "totalQuantity", label: "Current Stock (Total Quantity)" },
    { key: "minQuantity", label: "Reorder Threshold (Min Quantity)" },
    { key: "targetQuantity", label: "Max Quantity (Target Quantity)" },
    { key: "replenishmentNeeded", label: "Replenishment Needed" },
    { key: "purchasePrice", label: "Purchase Price" },
    { key: "purchaseDate", label: "Purchase Date" },
    { key: "totalMaintenanceCost", label: "Total Maintenance Cost" },
    { key: "totalOwnershipCost", label: "Total Ownership Cost" },
    { key: "costPerMonth", label: "Cost Per Month" },
    { key: "costPerYear", label: "Cost Per Year" },
    { key: "notes", label: "Notes" },
    { key: "updatedAt", label: "Updated" },
  ],
  location: [
    { key: "name", label: "Name" },
    { key: "notes", label: "Notes" },
    { key: "updatedAt", label: "Updated" },
  ],
  room: [
    { key: "name", label: "Name" },
    { key: "notes", label: "Notes" },
    { key: "updatedAt", label: "Updated" },
    { key: "location.name", label: "\"Location\": \"Name\"" },
  ],
  area: [
    { key: "name", label: "Name" },
    { key: "notes", label: "Notes" },
    { key: "updatedAt", label: "Updated" },
    { key: "location.name", label: "\"Location\": \"Name\"" },
    { key: "room.name", label: "\"Room\": \"Name\"" },
  ],
  item_putaway: [
    { key: "transactionNo", label: "Transaction ID" },
    { key: "quantity", label: "Quantity" },
    { key: "createdAt", label: "Created" },
    { key: "area.name", label: "\"Area\": \"Name\"" },
    { key: "performedBy.name", label: "\"People\": \"Name\"" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "location.name", label: "\"Location\": \"Name\"" },
    { key: "room.name", label: "\"Room\": \"Name\"" },
  ],
  item_transfer: [
    { key: "transactionNo", label: "Transaction ID" },
    { key: "quantity", label: "Quantity" },
    { key: "createdAt", label: "Created" },
    { key: "performedBy.name", label: "\"People\": \"Name\"" },
    { key: "from.area.name", label: "\"From Area\": \"Name\"" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "to.area.name", label: "\"To Area\": \"Name\"" },
  ],
  item_consumption: [
    { key: "transactionNo", label: "Transaction ID" },
    { key: "quantity", label: "Quantity" },
    { key: "createdAt", label: "Created" },
    { key: "area.name", label: "\"Area\": \"Name\"" },
    { key: "performedBy.name", label: "\"People\": \"Name\"" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "location.name", label: "\"Location\": \"Name\"" },
    { key: "room.name", label: "\"Room\": \"Name\"" },
  ],
  item_maintenance: [
    { key: "transactionNo", label: "Transaction ID" },
    { key: "maintenanceType", label: "Maintenance Type" },
    { key: "vendor", label: "Vendor" },
    { key: "cost", label: "Cost" },
    { key: "nextDueDate", label: "Next Due Date" },
    { key: "createdAt", label: "Created" },
    { key: "performedBy.name", label: "\"People\": \"Name\"" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
  ],
  item_loan: [
    { key: "transactionNo", label: "Transaction ID" },
    { key: "item.name", label: "\"Item\": \"Name\"" },
    { key: "borrower.name", label: "\"Borrower\": \"Name\"" },
    { key: "loanDate", label: "Loan Date" },
    { key: "expectedReturnDate", label: "Expected Return Date" },
    { key: "actualReturnDate", label: "Actual Return Date" },
    { key: "status", label: "Status" },
    { key: "conditionNotes", label: "Condition Notes" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Created" },
  ],
};

const legacyColumnLabels: Record<string, string> = {
  item: "\"Item\": \"Name\"",
  location: "\"Location\": \"Name\"",
  room: "\"Room\": \"Name\"",
  area: "\"Area\": \"Name\"",
  brand: "\"Item\": \"Brand\"",
  model: "\"Item\": \"Model\"",
  serialNumber: "\"Item\": \"Serial Number\"",
  upc: "\"Item\": \"UPC\"",
};

export function baseTableLabel(value: string, sources: ReportSource[] = SYSTEM_REPORT_SOURCES) {
  return sources.find((source) => source.value === value)?.label ?? value;
}

export function columnLabel(value: string, source = "item_location") {
  return SYSTEM_REPORT_COLUMNS[source]?.find((column) => column.key === value)?.label ?? legacyColumnLabels[value] ?? value;
}

export function defaultColumnsForBaseTable(baseTable: string) {
  return (SYSTEM_REPORT_COLUMNS[baseTable] ?? []).slice(0, 5);
}
