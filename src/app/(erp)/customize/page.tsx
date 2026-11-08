import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/shell";

const customizeOptions = [
  { href: "/customize/records", title: "Records", description: "Customize record types, fields, and record-level behavior." },
  { href: "/customize/lists", title: "Lists", description: "Customize reusable single-select and multi-select values." },
];

export default function CustomizePage() {
  return (
    <>
      <PageHeader title="Customize" />
      <Panel className="overflow-hidden">
        <div className="grid divide-y divide-neutral-100">
          {customizeOptions.map((option) => (
            <Link key={option.href} href={option.href} className="group block p-4 hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-950">{option.title}</p>
                  <p className="truncate text-sm text-neutral-500">{option.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-neutral-950" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
