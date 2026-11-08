"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Check,
  Info,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { itemConsumption } from "@/features/inventory/actions";
import { CameraScanButton } from "@/components/barcode-scanner";

type ClientItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  upc: string | null;
  photoUrl: string | null;
  itemLocations: {
    id: string;
    quantity: number;
    locationName: string;
    roomName: string;
    areaName: string;
  }[];
};

export function ConsumeFlowClient({
  items,
  initialItemId,
}: {
  items: ClientItem[];
  initialItemId?: string;
}) {
  const router = useRouter();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId && items.some((i) => i.id === initialItemId)
      ? initialItemId
      : items[0]?.id ?? ""
  );

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    selectedItem?.itemLocations[0]?.id ?? ""
  );

  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLocation = selectedItem?.itemLocations.find(
    (loc) => loc.id === selectedLocationId
  );

  const maxAvailable = selectedLocation ? selectedLocation.quantity : 1;
  const remainingUnits = Math.max(0, maxAvailable - quantity);

  function handleItemChange(itemId: string) {
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item && item.itemLocations[0]) {
      setSelectedLocationId(item.itemLocations[0].id);
      setQuantity(1);
    }
  }

  function handleQuantityChange(delta: number) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > maxAvailable) return maxAvailable;
      return next;
    });
  }

  const filteredItems = searchQuery.trim()
    ? items.filter((i) =>
        `${i.name} ${i.brand ?? ""} ${i.upc ?? ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : items;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-[#dee9fc] space-y-3">
        <Boxes className="w-12 h-12 text-[#737686] mx-auto opacity-40" />
        <h3 className="text-base font-bold text-[#121c2a]">No In-Stock Items</h3>
        <p className="text-xs text-[#737686]">
          There are currently no items with positive inventory to consume.
        </p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        try {
          await itemConsumption(formData);
          router.push(`/assistant/item/${selectedItemId}`);
        } catch (err) {
          console.error("Consumption failed", err);
          setIsSubmitting(false);
        }
      }}
      className="space-y-6"
    >
      <input type="hidden" name="itemId" value={selectedItemId} />
      <input type="hidden" name="itemLocationId" value={selectedLocationId} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* Step 1: Identify Item */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h2 className="text-sm font-bold text-[#121c2a]">Identify Item</h2>
        </div>

        {selectedItem ? (
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#eff4ff] text-[#004ac6] overflow-hidden flex items-center justify-center shrink-0">
              {selectedItem.photoUrl ? (
                <img
                  src={selectedItem.photoUrl}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Boxes className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-[#121c2a] truncate">{selectedItem.name}</h3>
              <p className="text-xs text-[#737686] truncate">
                {[selectedItem.brand, selectedItem.upc ? `UPC: ${selectedItem.upc}` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#eff4ff] text-[#004ac6] px-2 py-0.5 rounded-full">
                  <Barcode className="w-3 h-3" /> Scanned Item
                </span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedItemId("")}
                    className="text-[11px] font-semibold text-[#004ac6] hover:underline"
                  >
                    Change Item
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-[#dee9fc] space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items to consume..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#004ac6]"
                />
              </div>
              <CameraScanButton
                label="Scan item barcode"
                onScan={(code) => {
                  const trimmed = code.trim().toLowerCase();
                  const match = items.find(
                    (i) =>
                      (i.upc && i.upc.toLowerCase() === trimmed) ||
                      i.id.toLowerCase() === trimmed ||
                      i.name.toLowerCase().includes(trimmed)
                  );
                  if (match) {
                    handleItemChange(match.id);
                  }
                }}
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-neutral-100">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemChange(item.id)}
                  className="w-full p-2.5 text-left rounded-lg hover:bg-[#eff4ff] flex items-center justify-between transition-colors"
                >
                  <span className="text-xs font-semibold text-[#121c2a] truncate">{item.name}</span>
                  <span className="text-[11px] font-bold text-[#004ac6] shrink-0 ml-2">
                    {item.itemLocations.reduce((sum, l) => sum + l.quantity, 0)} units
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Select Source Location */}
      {selectedItem && selectedItem.itemLocations.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h2 className="text-sm font-bold text-[#121c2a]">Select Source Location</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedItem.itemLocations.map((loc) => {
              const isSelected = loc.id === selectedLocationId;
              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedLocationId(loc.id);
                    if (quantity > loc.quantity) setQuantity(loc.quantity);
                  }}
                  className={`cursor-pointer relative p-4 rounded-2xl border-2 transition-all shadow-[0_2px_8px_rgba(31,41,55,0.03)] flex items-center justify-between ${
                    isSelected
                      ? "bg-white border-[#004ac6] shadow-sm"
                      : "bg-white border-transparent hover:border-[#c3c6d7]"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-[#121c2a]">{loc.areaName}</p>
                    <p className="text-xs text-[#737686]">
                      {loc.locationName} / {loc.roomName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#004ac6]">{loc.quantity}</p>
                    <p className="text-[10px] uppercase font-bold text-[#737686]">Available</p>
                  </div>

                  {isSelected ? (
                    <div className="absolute -top-2 -right-2 bg-[#004ac6] text-white rounded-full p-0.5 shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Step 3: Enter Quantity */}
      {selectedLocation ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
              3
            </div>
            <h2 className="text-sm font-bold text-[#121c2a]">Quantity to Consume</h2>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-center gap-6 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="w-13 h-13 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-40"
            >
              <Minus className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-[#121c2a] font-mono">{quantity}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737686] mt-0.5">
                Units
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= maxAvailable}
              className="w-13 h-13 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-40"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </section>
      ) : null}

      {/* Step 4: Real-time Impact Summary */}
      {selectedLocation ? (
        <section className="bg-[#eff4ff] rounded-2xl p-4 border-l-4 border-[#004ac6] flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-[#004ac6] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
              Impact Summary
            </h4>
            <p className="text-xs text-[#434655] mt-0.5">
              This will remove <strong className="text-[#121c2a]">{quantity} units</strong> and leave{" "}
              <strong className="text-[#004ac6] font-bold">{remainingUnits} units</strong> remaining in{" "}
              <strong className="text-[#121c2a]">{selectedLocation.areaName}</strong>.
            </p>
          </div>
        </section>
      ) : null}

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#dee9fc] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <button
            type="submit"
            disabled={!selectedLocationId || isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ba1a1a] text-white font-bold text-sm rounded-full shadow-md hover:bg-[#93000a] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            {isSubmitting ? "Processing..." : "Confirm Consumption"}
          </button>
        </div>
      </div>
    </form>
  );
}
