"use client";

import { useMemo, useState } from "react";

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

type PersonOption = {
  id: string;
  name: string;
  employer?: string | null;
  jobTitle?: string | null;
};

export function PeopleSearchCreate({
  people,
  defaultPersonId,
  defaultLabel,
}: Readonly<{
  people: PersonOption[];
  defaultPersonId?: string;
  defaultLabel?: string;
}>) {
  const selectedPerson = people.find((person) => person.id === defaultPersonId);
  const [query, setQuery] = useState(defaultLabel ?? selectedPerson?.name ?? "");
  const [personId, setPersonId] = useState(defaultPersonId ?? "");
  const trimmed = query.trim();
  const matches = useMemo(() => {
    const lower = trimmed.toLowerCase();
    if (!lower) return people.slice(0, 8);
    return people
      .filter((person) => [person.name, person.employer, person.jobTitle].filter(Boolean).join(" ").toLowerCase().includes(lower))
      .slice(0, 8);
  }, [people, trimmed]);
  const selectedMatchesQuery = personId && people.find((person) => person.id === personId)?.name === trimmed;
  const shouldCreate = Boolean(trimmed && !selectedMatchesQuery);

  return (
    <div className="grid gap-2">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="newPersonName" value={shouldCreate ? trimmed : ""} />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPersonId("");
        }}
        className={inputClass}
        placeholder="Type a person"
      />
      {trimmed ? (
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          {matches.map((person) => (
            <button
              type="button"
              key={person.id}
              onClick={() => {
                setPersonId(person.id);
                setQuery(person.name);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${person.id === personId ? "bg-stone-100" : ""}`}
            >
              <span className="font-medium">{person.name}</span>
              {[person.employer, person.jobTitle].filter(Boolean).length ? <span className="ml-2 text-neutral-500">{[person.employer, person.jobTitle].filter(Boolean).join(" - ")}</span> : null}
            </button>
          ))}
          <div className="border-t border-neutral-100 px-3 py-2 text-sm text-neutral-700">Add &quot;{trimmed}&quot; as new person</div>
        </div>
      ) : null}
    </div>
  );
}
