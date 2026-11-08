import Link from "next/link";
import { getListOptionPageData } from "@/features/metadata/queries";
import { NewListOptionForm } from "@/components/list-config-form";
import { PageHeader, Panel } from "@/components/shell";

export default async function NewListOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { list, user } = await getListOptionPageData(id);
  const isAdmin = user.role === "ADMINISTRATOR";

  return (
    <>
      <PageHeader title="Add Option" action={<Link href={`/customize/lists/${list.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>} />
      <Panel className="p-4">
        {isAdmin ? <NewListOptionForm listId={list.id} /> : <p className="text-sm text-neutral-500">Administrator access required.</p>}
      </Panel>
    </>
  );
}
