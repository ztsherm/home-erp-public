"use client";

import { useMemo, useState } from "react";
import { CameraScanButton } from "@/components/barcode-scanner";

type ItemOption = { id: string; name: string; upc?: string | null };
type ItemLocationOption = { id: string; itemId: string; name: string; quantity: string; path: string };

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

function ItemSearch({ items, onSelect }: { items: ItemOption[]; onSelect: (itemId: string) => void }) {
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState("");
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

  function selectItem(item: ItemOption) {
    setItemId(item.id);
    setQuery(item.name);
    setItemUpc(item.upc ?? "");
    setScanMessage("");
    onSelect(item.id);
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
    setItemId("");
    setItemUpc("");
    setQuery("");
    onSelect("");
    setScanMessage("Item does not exist in the system.");
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex gap-2">
        <input
          value={query}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setItemId("");
            setItemUpc("");
            setScanMessage("");
            onSelect("");
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
        </div>
      ) : null}
      {selectedItem ? (
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

export function ConsumptionWorkflow({ items, itemLocations }: { items: ItemOption[]; itemLocations: ItemLocationOption[] }) {
  const [itemId, setItemId] = useState("");
  const sourceLocations = itemLocations.filter((location) => location.itemId === itemId);

  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>Item</span>
        <ItemSearch items={items} onSelect={setItemId} />
      </label>
      {itemId ? (
        <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
          <span>From area</span>
          <select name="itemLocationId" required className={inputClass}>
            {sourceLocations.map((location) => <option key={location.id} value={location.id}>{location.path} - {location.quantity}</option>)}
          </select>
          {!sourceLocations.length ? <span className="text-xs font-medium text-neutral-500">This item has no current areas with quantity.</span> : null}
        </label>
      ) : null}
    </>
  );
}
