import Link from "next/link";
import { getListOptionPageData } from "@/features/metadata/queries";
import { ExistingListOptionForm } from "@/components/list-config-form";
import { PageHeader, Panel } from "@/components/shell";

export default async function EditListOptionPage({ params }: { params: Promise<{ id: string; optionId: string }> }) {
  const { id, optionId } = await params;
  const { list, option, user } = await getListOptionPageData(id, optionId);
  const isAdmin = user.role === "ADMINISTRATOR";

  if (!option) return null;

  return (
    <>
      <PageHeader title={`Edit ${option.label}`} action={<Link href={`/customize/lists/${list.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>} />
      <Panel className="p-4">
        <ExistingListOptionForm option={option} isAdmin={isAdmin} />
      </Panel>
    </>
  );
}
