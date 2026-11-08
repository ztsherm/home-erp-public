"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const eventTypes = [
  { value: "ITEM_PUTAWAY", label: "Item putaway" },
  { value: "ITEM_TRANSFER", label: "Item transfer" },
  { value: "ITEM_CONSUMPTION", label: "Item consumption" },
  { value: "ITEM_MAINTENANCE", label: "Item maintenance" },
  { value: "ACTIVITY", label: "Activity records" },
];

const defaultTypes = ["ITEM_PUTAWAY", "ITEM_TRANSFER", "ITEM_CONSUMPTION", "ITEM_MAINTENANCE"];

export function EventFilter({ value, query }: { value: string[]; query?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selected = useMemo(() => new Set(value.length ? value : defaultTypes), [value]);

  function update(next: Set<string>) {
    const values = eventTypes.map((type) => type.value).filter((type) => next.has(type));
    const isDefault = values.length === defaultTypes.length && defaultTypes.every((type) => next.has(type)) && !next.has("ACTIVITY");
    startTransition(() => {
      const params = new URLSearchParams();
      if (!isDefault) params.set("type", values.join(","));
      if (query) params.set("q", query);
      router.push(params.size ? `/events?${params}` : "/events");
    });
  }

  return (
    <div className="relative mb-4 sm:max-w-xs">
      <button type="button" onClick={() => setOpen((next) => !next)} className="flex min-h-10 w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm font-medium">
        {isPending ? "Updating..." : "Event types"}
        <span className="text-neutral-500">{selected.size} selected</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
          {eventTypes.map((type) => (
            <label key={type.value} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-stone-50">
              <input
                type="checkbox"
                checked={selected.has(type.value)}
                disabled={isPending}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(type.value);
                  else next.delete(type.value);
                  update(next);
                }}
              />
              {type.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
