import Link from "next/link";
import { updateRecordType } from "@/features/metadata/actions";
import { getRecordTypePageData } from "@/features/metadata/queries";
import { IconPicker } from "@/components/icon-picker";
import { RecordIcon } from "@/components/record-icon";
import { FieldList } from "@/components/field-list";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";

export default async function CustomizeRecordTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recordType, user } = await getRecordTypePageData(id);
  const isAdmin = user.role === "ADMINISTRATOR";
  const configurableFields = recordType.fields.filter((field) => field.key !== "name");

  return (
    <>
      <PageHeader
        title={recordType.name}
        eyebrow="Customize"
        icon={recordType.icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-stone-100"><RecordIcon name={recordType.icon} /></span> : null}
        action={<Link href={`/records/${recordType.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">View records</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel className="p-4">
          <div className="mb-4">
            <h2 className="font-semibold">Record type</h2>
            <p className="text-sm text-neutral-500">Controls the table label and whether create, edit, and delete actions are restricted to administrators.</p>
          </div>
          <form action={updateRecordType} className="grid gap-3">
            <input type="hidden" name="id" value={recordType.id} />
            <Field label="Title"><input name="name" required defaultValue={recordType.name} disabled={!isAdmin} className={inputClass} /></Field>
            <Field label="Icon">
              <IconPicker name="icon" defaultValue={recordType.icon} disabled={!isAdmin} />
            </Field>
            <Field label="Description"><textarea name="description" defaultValue={recordType.description ?? ""} disabled={!isAdmin} className={inputClass} /></Field>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
              <input type="checkbox" name="editableRecords" defaultChecked={recordType.editableRecords} disabled={!isAdmin} />
              Records can only be created/edited by admin
            </label>
            {isAdmin ? <SubmitButton pendingLabel="Saving type...">Save type</SubmitButton> : null}
          </form>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-neutral-100 bg-stone-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Fields</h2>
                <p className="text-sm text-neutral-500">Drag handles to reorder fields on the form.</p>
              </div>
              {isAdmin ? <Link href={`/customize/${recordType.id}/fields/new`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Add</Link> : null}
            </div>
          </div>
          <FieldList recordTypeId={recordType.id} fields={configurableFields} isAdmin={isAdmin} />
        </Panel>
      </div>
    </>
  );
}
