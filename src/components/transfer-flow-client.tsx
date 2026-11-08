"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Boxes,
  Camera,
  Check,
  MapPin,
  Minus,
  Plus,
  PlusCircle,
  QrCode,
  Search,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { CameraScanButton, EmbeddedCameraScanner } from "@/components/barcode-scanner";
import { itemTransfer } from "@/features/inventory/actions";

type ItemWithLocs = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  upc: string | null;
  photoUrl: string | null;
  itemLocations: {
    id: string;
    quantity: number;
    areaId: string;
    locationName: string;
    roomName: string;
    areaName: string;
  }[];
};

type AreaItem = {
  id: string;
  name: string;
  locationName: string;
  roomName: string;
};

type RoomItem = {
  id: string;
  name: string;
  locationName: string;
};

export function TransferFlowClient({
  items,
  areas,
  rooms,
  initialItemId,
  initialFromLocationId,
}: {
  items: ItemWithLocs[];
  areas: AreaItem[];
  rooms: RoomItem[];
  initialItemId?: string;
  initialFromLocationId?: string;
}) {
  const router = useRouter();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId && items.some((i) => i.id === initialItemId)
      ? initialItemId
      : items[0]?.id ?? ""
  );

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const [selectedFromLocId, setSelectedFromLocId] = useState<string>(
    initialFromLocationId ?? selectedItem?.itemLocations[0]?.id ?? ""
  );

  const selectedFromLoc = selectedItem?.itemLocations.find((l) => l.id === selectedFromLocId);

  // All areas in the household are available for transfer
  const [selectedToAreaId, setSelectedToAreaId] = useState<string>(
    areas[0]?.id ?? ""
  );

  // For on-the-fly new area creation if typed
  const [isCreatingNewArea, setIsCreatingNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaRoomId, setNewAreaRoomId] = useState(rooms[0]?.id ?? "");

  // Scanner modal state
  const [showAreaScanner, setShowAreaScanner] = useState(false);

  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");

  const maxAvailable = selectedFromLoc ? selectedFromLoc.quantity : 1;

  const selectedToArea = areas.find((a) => a.id === selectedToAreaId);

  function handleItemChange(itemId: string) {
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item && item.itemLocations[0]) {
      setSelectedFromLocId(item.itemLocations[0].id);
      setQuantity(1);
    }
  }

  function handleScanAreaSelect(areaId: string) {
    setSelectedToAreaId(areaId);
    setIsCreatingNewArea(false);
    setShowAreaScanner(false);
    setAreaQuery("");
  }

  const filteredItems = itemQuery.trim()
    ? items.filter((i) =>
        `${i.name} ${i.brand ?? ""} ${i.upc ?? ""}`
          .toLowerCase()
          .includes(itemQuery.toLowerCase())
      )
    : items;

  // Real-time search as user types: matches area name, room name, or location name
  const filteredAreas = areaQuery.trim()
    ? areas.filter((a) =>
        `${a.name} ${a.locationName} ${a.roomName}`
          .toLowerCase()
          .includes(areaQuery.toLowerCase())
      )
    : areas;

  const exactMatchExists = areas.some(
    (a) => a.name.toLowerCase() === areaQuery.trim().toLowerCase()
  );

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-[#dee9fc] space-y-3">
        <Boxes className="w-12 h-12 text-[#737686] mx-auto opacity-40" />
        <h3 className="text-base font-bold text-[#121c2a]">No In-Stock Items</h3>
        <p className="text-xs text-[#737686]">
          There are currently no items with inventory to transfer.
        </p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        try {
          await itemTransfer(formData);
          router.push(`/assistant/item/${selectedItemId}`);
        } catch (err) {
          console.error("Transfer failed", err);
          setIsSubmitting(false);
        }
      }}
      className="space-y-6"
    >
      <input type="hidden" name="itemId" value={selectedItemId} />
      <input type="hidden" name="fromItemLocationId" value={selectedFromLocId} />
      <input
        type="hidden"
        name="toAreaId"
        value={isCreatingNewArea ? "" : selectedToAreaId}
      />
      <input
        type="hidden"
        name="newToAreaName"
        value={isCreatingNewArea ? newAreaName : ""}
      />
      <input
        type="hidden"
        name="newToAreaRoomId"
        value={isCreatingNewArea ? newAreaRoomId : ""}
      />
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
                  {[selectedItem.brand, selectedItem.upc ? `UPC: ${selectedItem.upc}` : null]
                    .filter(Boolean)
                    .join(" • ")}
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
            <div className="relative">
              <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items to transfer..."
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#004ac6]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-neutral-100">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemChange(item.id)}
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

      {/* Step 2: Select Source Location */}
      {selectedItem && selectedItem.itemLocations.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h2 className="text-sm font-bold text-[#121c2a]">Source Location (From)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedItem.itemLocations.map((loc) => {
              const isSelected = loc.id === selectedFromLocId;
              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedFromLocId(loc.id);
                    if (quantity > loc.quantity) setQuantity(loc.quantity);
                  }}
                  className={`cursor-pointer relative p-4 rounded-2xl border-2 transition-all shadow-[0_2px_8px_rgba(31,41,55,0.03)] flex items-center justify-between ${
                    isSelected
                      ? "bg-white border-[#004ac6] shadow-sm"
                      : "bg-white border-transparent hover:border-[#c3c6d7]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#004ac6] text-white"
                          : "bg-neutral-100 text-[#737686]"
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#121c2a] truncate">
                        {loc.areaName}
                      </p>
                      <p className="text-xs text-[#737686] truncate">
                        {loc.locationName} &gt; {loc.roomName}
                      </p>
                      <p className="text-xs text-[#737686] mt-0.5">
                        Current Balance: <strong className="text-[#121c2a]">{loc.quantity}</strong> units
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#004ac6] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-neutral-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Step 3: Select Destination Area */}
      {selectedFromLoc ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h2 className="text-sm font-bold text-[#121c2a]">Destination Area</h2>
            </div>
            <span className="text-[11px] text-[#737686]">
              All Areas Available ({areas.length})
            </span>
          </div>

          {/* Area Camera Scanner Overlay / Viewfinder Modal */}
          {showAreaScanner ? (
            <div className="bg-[#121c2a] rounded-2xl p-4 text-white shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#2563eb]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Scan Area Code</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAreaScanner(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Embedded Camera Scanner */}
              <EmbeddedCameraScanner
                targetType="area"
                onScan={(code) => {
                  let trimmed = code.trim().toLowerCase();
                  if (trimmed.includes("/area/")) {
                    const parts = trimmed.split("/area/");
                    if (parts[1]) trimmed = parts[1].split("/")[0].split("?")[0];
                  }
                  const match = areas.find(
                    (a) =>
                      a.id.toLowerCase() === trimmed ||
                      a.name.toLowerCase() === trimmed ||
                      a.name.toLowerCase().includes(trimmed)
                  );
                  if (match) {
                    handleScanAreaSelect(match.id);
                  }
                }}
              />

              {/* Quick-select simulated scan chips for convenience */}
              <div className="pt-1">
                <p className="text-[10px] text-white/60 uppercase font-semibold mb-1.5">
                  Or tap an area:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {areas.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleScanAreaSelect(a.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#2563eb] text-white text-xs transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Selected Destination Card Preview */}
          {!showAreaScanner && (selectedToArea || isCreatingNewArea) ? (
            <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#6cf8bb]/20 text-[#006c49] flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-[#121c2a] truncate">
                      {isCreatingNewArea ? newAreaName : selectedToArea?.name}
                    </h3>
                    {isCreatingNewArea ? (
                      <span className="text-[10px] font-bold uppercase bg-blue-100 text-[#004ac6] px-1.5 py-0.5 rounded">
                        New Area
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#737686] truncate">
                    {isCreatingNewArea
                      ? `${rooms.find((r) => r.id === newAreaRoomId)?.locationName} > ${rooms.find((r) => r.id === newAreaRoomId)?.name}`
                      : `${selectedToArea?.locationName} > ${selectedToArea?.roomName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setShowAreaScanner(true)}
                  title="Scan with Camera"
                  className="p-2 rounded-xl text-[#004ac6] bg-[#eff4ff] hover:bg-[#dbe1ff] transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToAreaId("");
                    setIsCreatingNewArea(false);
                    setAreaQuery("");
                  }}
                  className="text-xs font-semibold text-[#004ac6] hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          ) : null}

          {/* Real-time Search Input with Far-Right Camera Icon */}
          {!selectedToArea && !isCreatingNewArea && !showAreaScanner ? (
            <div className="bg-white rounded-2xl p-4 border border-[#dee9fc] space-y-3">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#737686] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type area name or tap camera to scan..."
                  value={areaQuery}
                  onChange={(e) => setAreaQuery(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-11 py-2.5 text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAreaScanner(true)}
                  title="Scan Area QR / Barcode"
                  className="absolute right-2 p-1.5 rounded-lg text-[#004ac6] hover:bg-[#dbe1ff] transition-colors"
                  aria-label="Scan area barcode"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Real-time Filtered Areas List */}
              <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-neutral-100">
                {filteredAreas.map((area) => {
                  const isSelected = area.id === selectedToAreaId;
                  return (
                    <div
                      key={area.id}
                      onClick={() => {
                        setSelectedToAreaId(area.id);
                        setIsCreatingNewArea(false);
                        setAreaQuery("");
                      }}
                      className={`cursor-pointer p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? "bg-[#eff4ff] text-[#004ac6] font-bold"
                          : "hover:bg-[#f8f9ff] text-[#121c2a]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{area.name}</p>
                        <p className="text-[10px] text-[#737686] truncate">
                          {area.locationName} / {area.roomName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {isSelected ? <Check className="w-4 h-4 text-[#004ac6]" /> : null}
                      </div>
                    </div>
                  );
                })}

                {/* If the typed query is not an existing area, offer to create & transfer to it on the fly */}
                {areaQuery.trim() && !exactMatchExists ? (
                  <div className="p-3 mt-2 rounded-xl bg-[#eff4ff] border border-[#dbe1ff] space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#004ac6] flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4" />
                        Create &quot;{areaQuery.trim()}&quot; as New Area
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#434655] mb-1">
                        Select Room for New Area:
                      </label>
                      <select
                        value={newAreaRoomId}
                        onChange={(e) => setNewAreaRoomId(e.target.value)}
                        className="w-full bg-white border border-[#c3c6d7] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#004ac6]"
                      >
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.locationName} &gt; {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewAreaName(areaQuery.trim());
                        setIsCreatingNewArea(true);
                        setSelectedToAreaId("");
                      }}
                      className="w-full bg-[#004ac6] text-white font-bold text-xs py-2 rounded-lg hover:bg-[#003ea8] transition-colors"
                    >
                      Use &quot;{areaQuery.trim()}&quot; as Destination
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Step 4: Quantity */}
      {selectedFromLoc && (selectedToAreaId || isCreatingNewArea) ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
              4
            </div>
            <h2 className="text-sm font-bold text-[#121c2a]">Quantity to Transfer</h2>
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
              onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
              disabled={quantity >= maxAvailable}
              className="w-13 h-13 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-40"
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
            disabled={
              !selectedFromLocId ||
              (!selectedToAreaId && !isCreatingNewArea) ||
              isSubmitting
            }
            className="w-full sm:w-auto px-8 py-3.5 bg-[#004ac6] text-white font-bold text-sm rounded-full shadow-md hover:bg-[#003ea8] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {isSubmitting ? "Transferring..." : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </form>
  );
}
