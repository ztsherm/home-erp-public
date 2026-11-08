import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader, Panel } from "@/components/shell";
import { getReportsPageData } from "@/features/reports/queries";
import { baseTableLabel } from "@/features/reports/definitions";
import { Pagination } from "@/components/pagination";
import { inputClass } from "@/components/shell";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { reports, sources, query, pagination } = await getReportsPageData(params);
  return (
    <>
      <PageHeader
        title="Reports"
        action={<Link href="/reports/new" className="grid h-10 w-10 place-items-center rounded-full bg-neutral-950 text-white" aria-label="Create report"><Plus className="h-5 w-5" /></Link>}
      />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={query} aria-label="Contains" placeholder="Contains across all shown fields" className={`${inputClass} min-w-0 flex-1`} /><button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
      <Panel className="overflow-hidden">
        <div className="grid divide-y divide-neutral-100">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`} className="virtual-row group block p-4 hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-950">{report.name}</p>
                  <p className="truncate text-sm text-neutral-500">{baseTableLabel(report.baseTable, sources)} - {report.visibility === "PUBLIC" ? "Public" : "Private"} - {report.columns.filter((column) => column.active).length} columns</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-neutral-950" aria-hidden="true" />
              </div>
            </Link>
          ))}
          {!reports.length ? <p className="p-4 text-sm text-neutral-500">No reports configured.</p> : null}
        </div>
      </Panel>
      <Pagination data={pagination} pathname="/reports" searchParams={params} />
    </>
  );
}
