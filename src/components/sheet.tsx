"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus } from "lucide-react";

const CreateSheetContent = dynamic(() => import("@/components/create-sheet-content").then((module) => module.CreateSheetContent), { ssr: false });

export function CreateSheet() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  function complete(message: string) { setOpen(false); setToast(message); window.setTimeout(() => setToast(null), 3000); }
  return <div className="relative flex justify-center">
    <button type="button" onClick={() => setOpen(true)} className="-mt-7 grid h-16 w-16 place-items-center rounded-full bg-neutral-950 text-white shadow-xl" aria-label="Create"><Plus className="h-7 w-7" /></button>
    {open ? <CreateSheetContent onClose={() => setOpen(false)} onComplete={complete} /> : null}
    {toast ? <div className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm rounded-md bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{toast}</div> : null}
  </div>;
}
