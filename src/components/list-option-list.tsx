"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { GripVertical, Pencil } from "lucide-react";
import { reorderListOptions } from "@/features/metadata/actions";

type OptionRow = {
  id: string;
  label: string;
  active: boolean;
};

export function ListOptionList({ listId, options, isAdmin }: { listId: string; options: OptionRow[]; isAdmin: boolean }) {
  const [rows, setRows] = useState(options);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ids = useMemo(() => rows.map((option) => option.id), [rows]);

  function persist(nextRows: OptionRow[]) {
    setRows(nextRows);
    startTransition(() => {
      reorderListOptions(listId, nextRows.map((option) => option.id));
    });
  }

  return (
    <div className="divide-y divide-neutral-100">
      {rows.map((option) => (
        <div
          key={option.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!draggedId || draggedId === option.id) return;
            const fromIndex = ids.indexOf(draggedId);
            const toIndex = ids.indexOf(option.id);
            if (fromIndex < 0 || toIndex < 0) return;
            const nextRows = [...rows];
            const [moved] = nextRows.splice(fromIndex, 1);
            nextRows.splice(toIndex, 0, moved);
            persist(nextRows);
            setDraggedId(null);
          }}
          onDragEnd={() => setDraggedId(null)}
          className={`flex items-center gap-3 p-4 ${draggedId === option.id ? "bg-stone-50" : ""}`}
        >
          <button
            type="button"
            draggable={isAdmin}
            onDragStart={() => setDraggedId(option.id)}
            disabled={!isAdmin}
            className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-md border border-neutral-200 bg-white text-neutral-500 disabled:cursor-default disabled:opacity-40"
            aria-label={`Reorder ${option.label}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-950">{option.label}</p>
            <p className="text-sm text-neutral-500">{option.active ? "Active" : "Inactive"}</p>
          </div>
          <Link href={`/customize/lists/${listId}/options/${option.id}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-stone-50" aria-label={`Edit ${option.label}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
      ))}
      {isPending ? <p className="p-3 text-sm text-neutral-500">Saving option order...</p> : null}
      {!rows.length ? <p className="p-4 text-sm text-neutral-500">No options configured.</p> : null}
    </div>
  );
}
