import { ReportEditor } from "@/components/report-editor";
import { getReportEditPageData } from "@/features/reports/queries";
import { PageHeader } from "@/components/shell";
import { ExternalFormSubmit } from "@/components/external-form-submit";

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { report, availableColumns } = await getReportEditPageData(id);

  return (
    <>
      <PageHeader
        title={`Edit ${report.name}`}
        action={<ExternalFormSubmit formId="report-settings-form" pendingLabel="Saving report...">Save</ExternalFormSubmit>}
      />
      <ReportEditor report={report} availableColumns={availableColumns} />
    </>
  );
}
