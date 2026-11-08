"use client";

import { useMemo, useState } from "react";
import { CameraScanButton } from "@/components/barcode-scanner";

type ItemOption = { id: string; name: string; upc?: string | null };
const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function ItemSearchCreate({ items, canCreate = true }: { items: ItemOption[]; canCreate?: boolean }) {
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const [addingName, setAddingName] = useState("");
  const [itemUpc, setItemUpc] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [open, setOpen] = useState(false);

  const trimmedQuery = query.trim();
  const matches = useMemo(() => {
    const value = trimmedQuery.toLowerCase();
    if (!value) return [];
    return items.filter((item) => item.name.toLowerCase().includes(value) || (item.upc ?? "").toLowerCase().includes(value)).slice(0, 8);
  }, [items, trimmedQuery]);
  const selectedItem = itemId ? items.find((item) => item.id === itemId) : undefined;
  const addName = canCreate ? addingName || (!itemId && trimmedQuery && !matches.length ? trimmedQuery : "") : "";
  const showUpc = Boolean(selectedItem || addName);

  function selectItem(item: ItemOption) {
    setItemId(item.id);
    setQuery(item.name);
    setAddingName("");
    setItemUpc(item.upc ?? "");
    setScanMessage("");
    setOpen(false);
  }

  function handleScan(value: string) {
    const scanned = value.trim();
    const scannedLower = scanned.toLowerCase();
    const match = items.find((item) => item.upc?.trim().toLowerCase() === scannedLower) ?? items.find((item) => item.name.trim().toLowerCase() === scannedLower);
    if (match) {
      selectItem(match);
      setScanMessage(`Selected ${match.name}`);
      return;
    }
    if (!canCreate) {
      setScanMessage("Item does not exist in the system.");
      return;
    }
    if (!window.confirm("Item was not found. Create a new item with this UPC?")) {
      setScanMessage("No item selected.");
      return;
    }
    const name = window.prompt("Enter a name for the new item", scanned)?.trim();
    if (!name) {
      setScanMessage("New item needs a name.");
      return;
    }
    setItemId("");
    setAddingName(name);
    setQuery(name);
    setItemUpc(scanned);
    setScanMessage(`New item: ${name}`);
    setOpen(false);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="newItemName" value={addName} />
      <div className="flex gap-2">
        <input
          value={query}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setItemId("");
            setAddingName("");
            setItemUpc("");
            setScanMessage("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Type an item name or UPC"
          required
          className={`${inputClass} min-w-0 flex-1`}
          autoComplete="off"
        />
        <CameraScanButton onScan={handleScan} label="Scan item barcode" />
      </div>
      {selectedItem ? <p className="text-xs font-medium text-neutral-500">Selected: {selectedItem.name}</p> : null}
      {open && trimmedQuery ? (
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
          {matches.map((item) => (
            <button
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(item)}
            >
              {item.name}{item.upc ? <span className="text-neutral-500"> - {item.upc}</span> : null}
            </button>
          ))}
          {canCreate ? (
            <button
              className="block w-full border-t border-neutral-200 px-3 py-2 text-left text-sm font-medium text-neutral-950 hover:bg-stone-100"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setItemId("");
                setAddingName(trimmedQuery);
                setQuery(trimmedQuery);
                setItemUpc("");
                setScanMessage("");
                setOpen(false);
              }}
            >
              Add &quot;{trimmedQuery}&quot; as new item
            </button>
          ) : null}
        </div>
      ) : null}
      {addingName ? <p className="text-xs font-medium text-neutral-500">New item: {addingName}</p> : null}
      {showUpc ? (
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-neutral-500">UPC</span>
          <div className="flex gap-2">
            <input name="itemUpc" value={itemUpc} onChange={(event) => setItemUpc(event.target.value)} placeholder="Optional UPC" className={`${inputClass} min-w-0 flex-1`} />
            <CameraScanButton onScan={(value) => setItemUpc(value)} label="Scan UPC" />
          </div>
        </label>
      ) : null}
      {scanMessage ? <p className="text-xs font-medium text-neutral-500">{scanMessage}</p> : null}
    </div>
  );
}
