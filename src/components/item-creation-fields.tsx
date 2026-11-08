"use client";

import { useState } from "react";
import { CameraScanButton } from "@/components/barcode-scanner";

type ItemOption = { id: string; name: string; upc?: string | null };

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function ItemCreationFields({ items }: Readonly<{ items: ItemOption[] }>) {
  const [name, setName] = useState("");
  const [upc, setUpc] = useState("");
  const [existingItemId, setExistingItemId] = useState("");
  const [message, setMessage] = useState("");

  function handleScan(value: string) {
    const scanned = value.trim();
    const scannedLower = scanned.toLowerCase();
    const match = items.find((item) => item.upc?.trim().toLowerCase() === scannedLower) ?? items.find((item) => item.name.trim().toLowerCase() === scannedLower);
    if (match) {
      setName(match.name);
      setUpc(match.upc ?? scanned);
      setExistingItemId(match.id);
      setMessage(`Item already exists: ${match.name}`);
      return;
    }
    if (!window.confirm("Item was not found. Create a new item with this UPC?")) {
      setMessage("No item selected.");
      return;
    }
    const nextName = window.prompt("Enter a name for the new item", "")?.trim();
    if (!nextName) {
      setMessage("New item needs a name.");
      return;
    }
    setName(nextName);
    setUpc(scanned);
    setExistingItemId("");
    setMessage(`New item: ${nextName}`);
  }

  return (
    <>
      <input type="hidden" name="existingItemId" value={existingItemId} />
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>Name</span>
        <div className="flex gap-2">
          <input name="name" value={name} onChange={(event) => { setName(event.target.value); setExistingItemId(""); setMessage(""); }} required className={`${inputClass} min-w-0 flex-1`} />
          <CameraScanButton onScan={handleScan} label="Scan item barcode" />
        </div>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>UPC</span>
        <div className="flex gap-2">
          <input name="upc" value={upc} onChange={(event) => setUpc(event.target.value)} className={`${inputClass} min-w-0 flex-1`} />
          <CameraScanButton onScan={(value) => setUpc(value)} label="Scan UPC" />
        </div>
      </label>
      {message ? <p className="text-xs font-medium text-neutral-500">{message}</p> : null}
    </>
  );
}
