import Link from "next/link";
import { createReport } from "@/features/reports/actions";
import { getNewReportPageData } from "@/features/reports/queries";
import { Field, inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";

export default async function NewReportPage() {
  const { sources } = await getNewReportPageData();

  return (
    <>
      <PageHeader
        title="Create Report"
        action={<Link href="/reports" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>}
      />
      <Panel className="p-4">
        <form action={createReport} className="grid gap-3">
          <Field label="Title"><input name="name" required className={inputClass} /></Field>
          <Field label="Base record/table">
            <select name="baseTable" className={inputClass}>
              {sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
            </select>
          </Field>
          <Field label="Visibility">
            <select name="visibility" className={inputClass}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </Field>
          <SubmitButton pendingLabel="Creating report...">Create report</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
