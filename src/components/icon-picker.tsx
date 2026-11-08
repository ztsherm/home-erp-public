"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { RecordIcon, recordIconOptions } from "@/components/record-icon";

export function IconPicker({ name, defaultValue, disabled }: { name: string; defaultValue?: string | null; disabled?: boolean }) {
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const selectedOption = recordIconOptions.find((option) => option.value === selected) ?? recordIconOptions[0];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-fit min-w-20 items-center justify-between gap-3 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none disabled:opacity-60"
        aria-label="Select icon"
      >
        <span className="grid h-5 w-5 place-items-center text-orange-600">
          <RecordIcon name={selected} />
        </span>
        <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 top-12 z-50 w-[min(86vw,344px)] rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-7 gap-1">
            {recordIconOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelected(option.value);
                  setOpen(false);
                }}
                className="relative grid h-9 w-9 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-800 hover:bg-stone-50"
                title={option.label}
                aria-label={option.label}
              >
                <RecordIcon name={option.value} className="h-4 w-4" />
                {selectedOption.value === option.value ? <Check className="absolute right-0.5 top-0.5 h-3 w-3 text-orange-600" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
