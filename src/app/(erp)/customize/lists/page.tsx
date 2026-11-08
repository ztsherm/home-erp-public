import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getListsPageData } from "@/features/metadata/queries";
import { PageHeader, Panel } from "@/components/shell";

export default async function CustomizeListsPage() {
  const { lists, user } = await getListsPageData();
  const isAdmin = user.role === "ADMINISTRATOR";

  return (
    <>
      <PageHeader
        title="Lists"
        action={isAdmin ? <Link href="/customize/lists/new" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Create</Link> : null}
      />
      <Panel className="overflow-hidden">
        <div className="grid divide-y divide-neutral-100">
          {lists.map((list) => (
            <Link key={list.id} href={`/customize/lists/${list.id}`} className="group block p-4 hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-950">{list.name}</p>
                  <p className="truncate text-sm text-neutral-500">{list.selectionMode === "MULTI" ? "Multi select" : "Single select"} - {list.options.length} options</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-neutral-950" aria-hidden="true" />
              </div>
            </Link>
          ))}
          {!lists.length ? <p className="p-4 text-sm text-neutral-500">No lists configured.</p> : null}
        </div>
      </Panel>
    </>
  );
}
