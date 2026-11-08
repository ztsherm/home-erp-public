"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, MapPin, PlusCircle, Search, X } from "lucide-react";
import { CameraScanButton } from "@/components/barcode-scanner";

export type AreaSearchOption = {
  id: string;
  name: string;
  locationName: string;
  roomName: string;
};

export type RoomOption = {
  id: string;
  name: string;
  locationId?: string;
  locationName?: string;
};

export function AreaSearchSelector({
  areas,
  rooms,
  initialAreaId,
  allowCreate = true,
  allowUnassigned = false,
  nameAreaId = "areaId",
  nameNewAreaName = "newAreaName",
  nameNewAreaRoomId = "newAreaRoomId",
  label = "Storage Area",
  onSelectArea,
}: {
  areas: AreaSearchOption[];
  rooms: RoomOption[];
  initialAreaId?: string;
  allowCreate?: boolean;
  allowUnassigned?: boolean;
  nameAreaId?: string;
  nameNewAreaName?: string;
  nameNewAreaRoomId?: string;
  label?: string;
  onSelectArea?: (areaId: string) => void;
}) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    initialAreaId ?? (areas.length === 1 && !allowUnassigned ? areas[0]?.id ?? "" : "")
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaRoomId, setNewAreaRoomId] = useState(rooms[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedArea = areas.find((a) => a.id === selectedAreaId);
  const selectedRoomForNewArea = rooms.find((r) => r.id === newAreaRoomId);

  // Real-time contains search across name, room, and location
  const filteredAreas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) =>
      `${a.name} ${a.roomName} ${a.locationName}`.toLowerCase().includes(q)
    );
  }, [areas, searchQuery]);

  const exactMatch = areas.some(
    (a) => a.name.trim().toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleSelectExisting = (id: string) => {
    setSelectedAreaId(id);
    setIsCreatingNew(false);
    setSearchQuery("");
    onSelectArea?.(id);
  };

  const handleStartCreateNew = (prefillName = "") => {
    setNewAreaName(prefillName);
    setIsCreatingNew(true);
    setSelectedAreaId("");
  };

  const handleConfirmCreateNew = () => {
    if (!newAreaName.trim() || !newAreaRoomId) return;
    setIsCreatingNew(true);
    setSelectedAreaId("");
    onSelectArea?.("");
  };

  const handleClear = () => {
    setSelectedAreaId("");
    setIsCreatingNew(false);
    setNewAreaName("");
    setSearchQuery("");
    onSelectArea?.("");
  };

  return (
    <div className="space-y-2">
      {/* Hidden form inputs */}
      <input type="hidden" name={nameAreaId} value={isCreatingNew ? "" : selectedAreaId} />
      <input type="hidden" name={nameNewAreaName} value={isCreatingNew ? newAreaName.trim() : ""} />
      <input type="hidden" name={nameNewAreaRoomId} value={isCreatingNew ? newAreaRoomId : ""} />

      {/* 1. Preview Card: Area is selected or new area is defined */}
      {!isCreatingNew && selectedArea ? (
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#6cf8bb]/20 text-[#006c49] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-[#121c2a] truncate">{selectedArea.name}</h4>
              <p className="text-xs text-[#737686] truncate">
                {selectedArea.locationName} &gt; {selectedArea.roomName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-[#004ac6] hover:underline"
            >
              Change
            </button>
            {allowUnassigned ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg text-[#737686] hover:bg-neutral-100"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : isCreatingNew && newAreaName.trim() && selectedRoomForNewArea ? (
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dbe1ff] bg-[#eff4ff]/40 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#dbe1ff] text-[#004ac6] flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-[#121c2a] truncate">{newAreaName}</h4>
                <span className="text-[10px] font-bold uppercase bg-[#004ac6] text-white px-1.5 py-0.5 rounded">
                  New Area
                </span>
              </div>
              <p className="text-xs text-[#737686] truncate">
                {selectedRoomForNewArea.locationName ?? "Location"} &gt; {selectedRoomForNewArea.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingNew(false)}
            className="text-xs font-bold text-[#004ac6] hover:underline shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      ) : isCreatingNew ? (
        /* 2. Inline New Area Creator Form */
        <div className="bg-white rounded-2xl p-4 border border-[#004ac6] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#dee9fc] pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#004ac6] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Create New Storage Area
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="text-xs text-[#737686] hover:text-[#121c2a]"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1">
                Area Name *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Top Shelf, Bin A3, Tool Drawer 2"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] focus:border-[#004ac6] rounded-xl px-3.5 py-2.5 text-xs outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1">
                Parent Location & Room *
              </label>
              {rooms.length > 0 ? (
                <select
                  value={newAreaRoomId}
                  onChange={(e) => setNewAreaRoomId(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] focus:border-[#004ac6] rounded-xl px-3.5 py-2.5 text-xs outline-none font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.locationName ? `${r.locationName} > ` : ""}{r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  No rooms configured yet. Please configure a Location and Room in ERP settings first.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!newAreaName.trim() || !newAreaRoomId}
              onClick={handleConfirmCreateNew}
              className="w-full bg-[#004ac6] text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:bg-[#003ea8] disabled:opacity-50 transition-colors"
            >
              Use &quot;{newAreaName.trim() || "New Area"}&quot;
            </button>
          </div>
        </div>
      ) : (
        /* 3. Real-Time Contains Search & Area Selector */
        <div className="bg-white rounded-2xl p-4 border border-[#dee9fc] shadow-xs space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search storage areas by name, room, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] font-medium transition-all"
              />
            </div>
            <CameraScanButton
              label="Scan Area QR"
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
                  handleSelectExisting(match.id);
                } else {
                  handleStartCreateNew(code.trim());
                }
              }}
            />
          </div>

          {/* Filtered Area List with Scroll for hundreds of items */}
          <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-neutral-100 pr-1">
            {allowUnassigned ? (
              <button
                type="button"
                onClick={() => handleSelectExisting("")}
                className="w-full p-2.5 text-left rounded-xl hover:bg-[#eff4ff] flex items-center justify-between text-xs text-[#737686] font-medium"
              >
                <span>(None - Unassigned)</span>
                {!selectedAreaId && !isCreatingNew ? <Check className="w-4 h-4 text-[#004ac6]" /> : null}
              </button>
            ) : null}

            {filteredAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => handleSelectExisting(area.id)}
                className={`w-full p-2.5 text-left rounded-xl flex items-center justify-between text-xs transition-colors ${
                  selectedAreaId === area.id
                    ? "bg-[#eff4ff] text-[#004ac6] font-bold"
                    : "hover:bg-[#f8f9ff] text-[#121c2a]"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{area.name}</p>
                  <p className="text-[10px] text-[#737686] truncate">
                    {area.locationName} &gt; {area.roomName}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#737686] shrink-0 ml-2" />
              </button>
            ))}

            {filteredAreas.length === 0 && searchQuery.trim() ? (
              <div className="p-3 text-center text-xs text-[#737686]">
                No existing areas found matching &quot;{searchQuery}&quot;
              </div>
            ) : null}
          </div>

          {/* Option to Create New Area on the fly */}
          {allowCreate && rooms.length > 0 ? (
            <button
              type="button"
              onClick={() => handleStartCreateNew(searchQuery.trim())}
              className="w-full mt-2 pt-2 border-t border-[#dee9fc] flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#004ac6] hover:bg-[#eff4ff] rounded-xl transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {searchQuery.trim() && !exactMatch
                ? `Create "${searchQuery.trim()}" as New Area`
                : "Create New Storage Area"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
