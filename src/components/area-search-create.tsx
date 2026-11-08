"use client";

import { useMemo, useState } from "react";

type AreaOption = { id: string; name: string };
type RoomOption = { id: string; name: string };

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function AreaSearchCreate({
  areas,
  rooms,
  idName,
  newName,
  roomIdName,
  placeholder = "Type an area",
}: {
  areas: AreaOption[];
  rooms: RoomOption[];
  idName: string;
  newName: string;
  roomIdName: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [areaId, setAreaId] = useState("");
  const [addingName, setAddingName] = useState("");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const trimmedQuery = query.trim();

  const matches = useMemo(() => {
    const value = trimmedQuery.toLowerCase();
    if (!value) return [];
    return areas.filter((area) => area.name.toLowerCase().includes(value)).slice(0, 30);
  }, [areas, trimmedQuery]);
  const selectedArea = areaId ? areas.find((area) => area.id === areaId) : undefined;
  const addName = addingName || (!areaId && trimmedQuery && !matches.length ? trimmedQuery : "");

  return (
    <div className="grid gap-2">
      <input type="hidden" name={idName} value={areaId} />
      <input type="hidden" name={newName} value={addName} />
      <input
        value={query}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setAreaId("");
          setAddingName("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required
        className={inputClass}
        autoComplete="off"
      />
      {selectedArea ? <p className="text-xs font-medium text-neutral-500">Selected: {selectedArea.name}</p> : null}
      {open && trimmedQuery ? (
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm max-h-60 overflow-y-auto">
          {matches.map((area) => (
            <button
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
              key={area.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setAreaId(area.id);
                setQuery(area.name);
                setAddingName("");
                setOpen(false);
              }}
            >
              {area.name}
            </button>
          ))}
          <button
            className="block w-full border-t border-neutral-200 px-3 py-2 text-left text-sm font-medium text-neutral-950 hover:bg-stone-100"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setAreaId("");
              setAddingName(trimmedQuery);
              setQuery(trimmedQuery);
              setOpen(false);
            }}
          >
            Add &quot;{trimmedQuery}&quot; as new area
          </button>
        </div>
      ) : null}
      {addName ? (
        <div className="grid gap-1.5 text-sm font-medium text-neutral-800">
          <span>Room for new area</span>
          <select name={roomIdName} required value={roomId} onChange={(event) => setRoomId(event.target.value)} className={inputClass}>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  );
}
