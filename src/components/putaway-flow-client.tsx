"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Minus,
  PackagePlus,
  Plus,
  Search,
} from "lucide-react";
import { itemPutaway } from "@/features/inventory/actions";
import { CameraScanButton } from "@/components/barcode-scanner";
import { AreaSearchOption, AreaSearchSelector, RoomOption } from "@/components/area-search-selector";

type ItemOption = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  upc: string | null;
  photoUrl: string | null;
};

export function PutawayFlowClient({
  items,
  areas,
  rooms = [],
  initialItemId,
  initialAreaId,
}: {
  items: ItemOption[];
  areas: AreaSearchOption[];
  rooms?: RoomOption[];
  initialItemId?: string;
  initialAreaId?: string;
}) {
  const router = useRouter();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId ?? items[0]?.id ?? ""
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    initialAreaId ?? (areas.length === 1 ? areas[0]?.id ?? "" : "")
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemQuery, setItemQuery] = useState("");

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const filteredItems = itemQuery.trim()
    ? items.filter((i) =>
        `${i.name} ${i.brand ?? ""} ${i.upc ?? ""}`
          .toLowerCase()
          .includes(itemQuery.toLowerCase())
      )
    : items;

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        try {
          await itemPutaway(formData);
          router.push(`/assistant/item/${selectedItemId}`);
        } catch (err) {
          console.error("Putaway failed", err);
          setIsSubmitting(false);
        }
      }}
      className="space-y-6"
    >
      <input type="hidden" name="itemId" value={selectedItemId} />
      <input type="hidden" name="quantity" value={quantity} />

      {/* Step 1: Select Item */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h2 className="text-sm font-bold text-[#121c2a]">Select Item</h2>
        </div>

        {selectedItem ? (
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#004ac6] overflow-hidden flex items-center justify-center shrink-0">
                {selectedItem.photoUrl ? (
                  <img
                    src={selectedItem.photoUrl}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Boxes className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[#121c2a] truncate">{selectedItem.name}</h3>
                <p className="text-xs text-[#737686] truncate">
                  {[
                    selectedItem.brand,
                    selectedItem.model ? `Model: ${selectedItem.model}` : null,
                    selectedItem.upc ? `UPC: ${selectedItem.upc}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || `ID: ${selectedItem.id}`}
                </p>
              </div>
            </div>
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => setSelectedItemId("")}
                className="text-xs font-semibold text-[#004ac6] hover:underline shrink-0 ml-2"
              >
                Change
              </button>
            ) : null}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-[#dee9fc] space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type item name or scan UPC..."
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#004ac6]"
                />
              </div>
              <CameraScanButton
                label="Scan Item Barcode"
                onScan={(code) => {
                  let trimmed = code.trim().toLowerCase();
                  if (trimmed.includes("/item/")) {
                    const parts = trimmed.split("/item/");
                    if (parts[1]) trimmed = parts[1].split("/")[0].split("?")[0];
                  }
                  const match = items.find(
                    (i) =>
                      i.id.toLowerCase() === trimmed ||
                      i.upc?.toLowerCase() === trimmed ||
                      i.name.toLowerCase() === trimmed ||
                      i.name.toLowerCase().includes(trimmed)
                  );
                  if (match) {
                    setSelectedItemId(match.id);
                  }
                }}
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-neutral-100">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className="w-full p-2 text-left rounded-lg hover:bg-[#eff4ff] flex items-center justify-between text-xs font-medium text-[#121c2a]"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="text-[10px] text-[#737686] ml-2 shrink-0">{item.brand}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Select Destination Area */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
            2
          </div>
          <h2 className="text-sm font-bold text-[#121c2a]">Destination Storage Area</h2>
        </div>

        <AreaSearchSelector
          areas={areas}
          rooms={rooms}
          initialAreaId={initialAreaId}
          allowCreate={true}
          allowUnassigned={false}
          onSelectArea={(id) => setSelectedAreaId(id)}
        />
      </section>

      {/* Step 3: Quantity */}
      {selectedItem ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
              3
            </div>
            <h2 className="text-sm font-bold text-[#121c2a]">Quantity to Put Away</h2>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-center gap-6 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
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
              onClick={() => setQuantity((q) => q + 1)}
              className="w-13 h-13 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </section>
      ) : null}

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#dee9fc] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <button
            type="submit"
            disabled={!selectedItemId || isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#006c49] text-white font-bold text-sm rounded-full shadow-md hover:bg-[#005236] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PackagePlus className="w-5 h-5" />
            {isSubmitting ? "Putting away..." : "Confirm Putaway"}
          </button>
        </div>
      </div>
    </form>
  );
}
