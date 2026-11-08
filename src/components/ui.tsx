export function Panel({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <section className={`rounded-lg border border-neutral-200 bg-white ${className}`}>{children}</section>;
}

export function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <label className="grid gap-1.5 text-sm font-medium text-neutral-800"><span>{label}</span>{children}</label>;
}

export const inputClass = "min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

