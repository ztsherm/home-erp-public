"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonVariant = "primary" | "secondary" | "danger";

const baseClass = "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const variantClass: Record<SubmitButtonVariant, string> = {
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
  secondary: "border border-neutral-200 bg-white text-neutral-950 hover:bg-stone-50",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

export function SubmitButton({
  children,
  pendingLabel = "Working...",
  variant = "primary",
  className = "",
  form,
  ariaLabel,
}: Readonly<{
  children: ReactNode;
  pendingLabel?: string;
  variant?: SubmitButtonVariant;
  className?: string;
  form?: string;
  ariaLabel?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" form={form} disabled={pending} aria-disabled={pending} aria-label={ariaLabel} className={`${baseClass} ${variantClass[variant]} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
