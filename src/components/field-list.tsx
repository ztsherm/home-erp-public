"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { GripVertical, Pencil } from "lucide-react";
import { reorderRecordFields } from "@/features/metadata/actions";

type FieldRow = {
  id: string;
  label: string;
  kind: string;
  required: boolean;
  active: boolean;
};

function kindLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export function FieldList({ recordTypeId, fields, isAdmin }: { recordTypeId: string; fields: FieldRow[]; isAdmin: boolean }) {
  const [rows, setRows] = useState(fields);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ids = useMemo(() => rows.map((field) => field.id), [rows]);

  function persist(nextRows: FieldRow[]) {
    setRows(nextRows);
    startTransition(() => {
      reorderRecordFields(recordTypeId, nextRows.map((field) => field.id));
    });
  }

  return (
    <div className="divide-y divide-neutral-100">
      {rows.map((field) => (
        <div
          key={field.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!draggedId || draggedId === field.id) return;
            const fromIndex = ids.indexOf(draggedId);
            const toIndex = ids.indexOf(field.id);
            if (fromIndex < 0 || toIndex < 0) return;
            const nextRows = [...rows];
            const [moved] = nextRows.splice(fromIndex, 1);
            nextRows.splice(toIndex, 0, moved);
            persist(nextRows);
            setDraggedId(null);
          }}
          onDragEnd={() => setDraggedId(null)}
          className={`flex items-center gap-3 p-4 ${draggedId === field.id ? "bg-stone-50" : ""}`}
        >
          <button
            type="button"
            draggable={isAdmin}
            onDragStart={() => setDraggedId(field.id)}
            disabled={!isAdmin}
            className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-md border border-neutral-200 bg-white text-neutral-500 disabled:cursor-default disabled:opacity-40"
            aria-label={`Reorder ${field.label}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-950">{field.label}</p>
            <p className="text-sm text-neutral-500">{kindLabel(field.kind)}{field.required ? " - required" : ""}{field.active ? "" : " - inactive"}</p>
          </div>
          <Link href={`/customize/${recordTypeId}/fields/${field.id}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-stone-50" aria-label={`Edit ${field.label}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
      ))}
      {isPending ? <p className="p-3 text-sm text-neutral-500">Saving field order...</p> : null}
      {!rows.length ? <p className="p-4 text-sm text-neutral-500">No additional fields configured.</p> : null}
    </div>
  );
}
