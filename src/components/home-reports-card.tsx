"use client";

import Link from "next/link";
import { Check, ChevronRight, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HomeReport = {
  id: string;
  name: string;
  description: string;
};

const STORAGE_KEY = "home-reports-card-visible-ids";

export function HomeReportsCard({ reports }: { reports: HomeReport[] }) {
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSelectedIds(reports.map((report) => report.id));
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const availableIds = new Set(reports.map((report) => report.id));
          setSelectedIds(parsed.filter((id): id is string => typeof id === "string" && availableIds.has(id)));
        } else {
          setSelectedIds(reports.map((report) => report.id));
        }
      } catch {
        setSelectedIds(reports.map((report) => report.id));
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [reports]);

  useEffect(() => {
    if (selectedIds) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  const selectedIdSet = useMemo(() => new Set(selectedIds ?? reports.map((report) => report.id)), [reports, selectedIds]);
  const visibleReports = reports.filter((report) => selectedIdSet.has(report.id));

  function toggleReport(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current ?? reports.map((report) => report.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return reports.filter((report) => next.has(report.id)).map((report) => report.id);
    });
  }

  return (
    <section className="mt-5 rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-4">
        <h2 className="font-semibold">Reports</h2>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="grid h-9 w-9 place-items-center rounded-md border border-neutral-200 text-neutral-700 hover:bg-stone-50 hover:text-neutral-950"
          aria-label={editing ? "Close report card editor" : "Edit report card"}
          title={editing ? "Close report card editor" : "Edit report card"}
        >
          {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
      </div>

      {editing ? (
        <div className="grid gap-2 border-b border-neutral-100 p-4">
          {reports.map((report) => (
            <label key={report.id} className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 text-sm hover:bg-stone-50">
              <input
                type="checkbox"
                checked={selectedIdSet.has(report.id)}
                onChange={() => toggleReport(report.id)}
                className="mt-1 h-4 w-4 accent-neutral-950"
              />
              <span className="min-w-0">
                <span className="block font-medium text-neutral-950">{report.name}</span>
                <span className="block text-neutral-500">{report.description}</span>
              </span>
            </label>
          ))}
          {!reports.length ? <p className="text-sm text-neutral-500">No reports configured.</p> : null}
        </div>
      ) : null}

      <div className="grid divide-y divide-neutral-100">
        {visibleReports.map((report) => (
          <Link key={report.id} href={`/reports/${report.id}`} className="group block p-4 hover:bg-stone-50">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-950">{report.name}</p>
                <p className="truncate text-sm text-neutral-500">{report.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-neutral-950" aria-hidden="true" />
            </div>
          </Link>
        ))}
        {reports.length && !visibleReports.length ? (
          <div className="flex items-center gap-2 p-4 text-sm text-neutral-500">
            <Check className="h-4 w-4" />
            <span>No reports selected for this card.</span>
          </div>
        ) : null}
        {!reports.length ? <p className="p-4 text-sm text-neutral-500">No reports configured.</p> : null}
      </div>
    </section>
  );
}
