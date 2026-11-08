"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function ExternalFormSubmit({
  formId,
  children,
  pendingLabel = "Saving...",
}: Readonly<{
  formId: string;
  children: ReactNode;
  pendingLabel?: string;
}>) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-disabled={pending}
      onClick={() => {
        const form = document.getElementById(formId);
        if (!(form instanceof HTMLFormElement)) return;
        setPending(true);
        form.requestSubmit();
      }}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
