"use client";

import { useRouter } from "next/navigation";

type PersonOption = { id: string; name: string };

export function TaskFilterSelect({ people, selected, query }: { people: PersonOption[]; selected: string; query?: string }) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
        <span>Show tasks</span>
        <select
          value={selected}
          onChange={(event) => {
            const params = new URLSearchParams({ assigned: event.target.value });
            if (query) params.set("q", query);
            router.push(`/tasks?${params}`);
          }}
          className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950"
        >
          <option value="me">Tasks assigned to me</option>
          <option value="unassigned">Unassigned</option>
          <option value="all">All</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>
    </div>
  );
}
