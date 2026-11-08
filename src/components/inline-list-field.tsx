"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createListOptionInline } from "@/features/metadata/actions";

type Option = { id: string; label: string };
type AppList = { id: string; allowAddOnRecord: boolean; options: Option[] };

const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function InlineListField({
  list,
  name,
  defaultValue,
  multiple = false,
}: {
  list: AppList;
  name: string;
  defaultValue?: string | string[];
  multiple?: boolean;
}) {
  const [options, setOptions] = useState(list.options);
  const [newLabel, setNewLabel] = useState("");
  const [selected, setSelected] = useState<string[]>(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  const [isPending, startTransition] = useTransition();

  function addOption() {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(() => {
      void (async () => {
        const option = await createListOptionInline(list.id, label);
        setOptions((current) => current.some((existing) => existing.id === option.id) ? current : [...current, option]);
        setSelected((current) => multiple ? [...new Set([...current, option.id])] : [option.id]);
        setNewLabel("");
      })();
    });
  }

  return (
    <div className="grid gap-2">
      <select name={name} multiple={multiple} value={multiple ? selected : selected[0] ?? ""} onChange={(event) => {
        const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value).filter(Boolean);
        setSelected(multiple ? values : values.slice(0, 1));
      }} className={inputClass}>
        {!multiple ? <option value="">None</option> : null}
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {list.allowAddOnRecord ? (
        <div className="flex gap-2">
          <input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Add option" className={`${inputClass} min-w-0 flex-1`} />
          <button type="button" onClick={addOption} disabled={isPending || !newLabel.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-700 disabled:opacity-50" aria-label="Add list option">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
