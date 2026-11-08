import Link from "next/link";
import { getRecordFieldPageData } from "@/features/metadata/queries";
import { NewFieldForm } from "@/components/field-config-form";
import { PageHeader, Panel } from "@/components/shell";

export default async function NewFieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recordType, lists, recordTypes, user } = await getRecordFieldPageData(id);
  const isAdmin = user.role === "ADMINISTRATOR";

  return (
    <>
      <PageHeader title={`Add Field`} action={<Link href={`/customize/${recordType.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>} />
      <Panel className="p-4">
        {isAdmin ? <NewFieldForm recordTypeId={recordType.id} lists={lists} recordTypes={recordTypes} /> : <p className="text-sm text-neutral-500">Administrator access required.</p>}
      </Panel>
    </>
  );
}
