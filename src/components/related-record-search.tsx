"use client";

import { useEffect, useState } from "react";

type RecordTypeOption = { id: string; name: string };
type SearchResult = { id: string; label: string; subtitle: string };
const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function RelatedRecordSearch({ recordTypes, defaultRecordTypeId = "", defaultRecordId = "", defaultLabel = "" }: Readonly<{ recordTypes: RecordTypeOption[]; defaultRecordTypeId?: string; defaultRecordId?: string; defaultLabel?: string }>) {
  const [recordTypeId, setRecordTypeId] = useState(defaultRecordTypeId || recordTypes[0]?.id || "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(defaultRecordId ? `${defaultRecordTypeId}::${defaultRecordId}` : "");
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!recordTypeId) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/records/search?recordTypeId=${encodeURIComponent(recordTypeId)}&q=${encodeURIComponent(query)}`);
        if (cancelled) return;
        setLoading(false);
        if (!response.ok) return;
        const data = await response.json() as { results: SearchResult[] };
        setResults(data.results);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [recordTypeId, query]);

  return (
    <div className="grid gap-2">
      <input type="hidden" name="relatedRecord" value={selected} />
      <select
        className={inputClass}
        value={recordTypeId}
        onChange={(event) => {
          setRecordTypeId(event.target.value);
          setSelected("");
          setSelectedLabel("");
          setQuery("");
        }}
      >
        {recordTypes.map((recordType) => <option key={recordType.id} value={recordType.id}>{recordType.name}</option>)}
      </select>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" className={inputClass} />
      {selectedLabel ? <p className="text-sm text-neutral-600">Selected: {selectedLabel}</p> : null}
      <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200 bg-white">
        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => {
              setSelected(`${recordTypeId}::${result.id}`);
              setSelectedLabel(`${result.label} - ${result.subtitle}`);
            }}
            className="block w-full border-b border-neutral-100 p-3 text-left last:border-b-0 hover:bg-stone-50"
          >
            <span className="block text-sm font-medium">{result.label}</span>
            <span className="block text-sm text-neutral-500">{result.subtitle}</span>
          </button>
        ))}
        {loading ? <p className="p-3 text-sm text-neutral-500">Searching records...</p> : null}
        {!loading && !results.length ? <p className="p-3 text-sm text-neutral-500">Select a type and search for a record.</p> : null}
      </div>
    </div>
  );
}
