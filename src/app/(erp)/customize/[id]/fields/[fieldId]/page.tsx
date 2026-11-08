import Link from "next/link";
import { getRecordFieldPageData } from "@/features/metadata/queries";
import { ExistingFieldForm } from "@/components/field-config-form";
import { PageHeader, Panel } from "@/components/shell";

export default async function EditFieldPage({ params }: { params: Promise<{ id: string; fieldId: string }> }) {
  const { id, fieldId } = await params;
  const { recordType, field, lists, recordTypes, user } = await getRecordFieldPageData(id, fieldId);
  const isAdmin = user.role === "ADMINISTRATOR";

  if (!field) return null;

  return (
    <>
      <PageHeader title={`Edit ${field.label}`} action={<Link href={`/customize/${recordType.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>} />
      <Panel className="overflow-hidden">
        <ExistingFieldForm field={field} lists={lists} recordTypes={recordTypes} isAdmin={isAdmin} />
      </Panel>
    </>
  );
}
