import Link from "next/link";
import { getListPageData } from "@/features/metadata/queries";
import { ExistingListForm } from "@/components/list-config-form";
import { ListOptionList } from "@/components/list-option-list";
import { PageHeader, Panel } from "@/components/shell";

export default async function CustomizeListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { list, user } = await getListPageData(id);
  const isAdmin = user.role === "ADMINISTRATOR";

  return (
    <>
      <PageHeader
        title={list.name}
        action={<Link href={`/lists/${list.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View list</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel className="p-4">
          <div className="mb-4">
            <h2 className="font-semibold">List setup</h2>
            <p className="text-sm text-neutral-500">Controls the list label and whether fields can use one or many values.</p>
          </div>
          <ExistingListForm list={list} isAdmin={isAdmin} />
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-neutral-100 bg-stone-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Options</h2>
                <p className="text-sm text-neutral-500">Drag handles to reorder values in this list.</p>
              </div>
              {isAdmin ? <Link href={`/customize/lists/${list.id}/options/new`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Add</Link> : null}
            </div>
          </div>
          <ListOptionList listId={list.id} options={list.options} isAdmin={isAdmin} />
        </Panel>
      </div>
    </>
  );
}
