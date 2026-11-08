import Link from "next/link";
import { createRecordType } from "@/features/metadata/actions";
import { IconPicker } from "@/components/icon-picker";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";
import { requireAdministrator } from "@/server/auth/context";

export default async function NewCustomizeRecordPage() {
  await requireAdministrator();

  return (
    <>
      <PageHeader
        title="Create Record"
        action={<Link href="/customize/records" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>}
      />
      <Panel className="p-4">
        <form action={createRecordType} className="grid gap-3">
          <Field label="Title"><input name="name" required className={inputClass} /></Field>
          <Field label="Icon">
            <IconPicker name="icon" />
          </Field>
          <Field label="Description"><textarea name="description" className={inputClass} /></Field>
          <SubmitButton pendingLabel="Creating record type...">Create record type</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
