import Link from "next/link";
import { getReportPageData } from "@/features/reports/queries";
import { inputClass, PageHeader, Panel } from "@/components/shell";
import { SubmitButton } from "@/components/submit-button";
import { Pagination } from "@/components/pagination";
import { FavoriteToggle } from "@/components/personalization";
import { RecentRecordTracker } from "@/components/recent-record-tracker";
import { getFavorites } from "@/features/personalization/queries";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const filters = await searchParams;
  const { report, columns, rows, availableFilters, pagination, user, query } = await getReportPageData(id, filters);
  const href = `/reports/${report.id}`;
  const favorites = await getFavorites(report.householdId, user.id);
  const favorite = favorites.some((item) => item.href === href);

  return (
    <>
      <PageHeader
        title={report.name}
        action={<div className="flex gap-2"><FavoriteToggle href={href} label={report.name} active={favorite} /><Link href={`/reports/${report.id}/edit`} className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Edit</Link></div>}
      />
      <RecentRecordTracker href={href} label={report.name} />
      <Panel className="mb-4 p-4">
          <form className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-neutral-800">
              <span>Contains</span>
              <input name="q" defaultValue={query} placeholder="Search all shown fields" className={inputClass} />
            </label>
            {availableFilters.map((filter) => (
              <label key={filter.id} className="grid gap-1.5 text-sm font-medium text-neutral-800">
                <span>{filter.label}</span>
                <input name={`filter_${filter.id}`} defaultValue={filter.value} className={inputClass} />
              </label>
            ))}
            <div className="flex gap-2">
              <SubmitButton pendingLabel="Applying...">Apply</SubmitButton>
              <Link href={`/reports/${report.id}`} className="rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold">Reset</Link>
            </div>
          </form>
        </Panel>
      <Panel className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-stone-50 text-left text-neutral-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="whitespace-nowrap border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.id} className="virtual-row hover:bg-neutral-50">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="whitespace-nowrap px-4 py-3 text-neutral-800"
                  >
                    {row.cells[column.columnKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-4 text-sm text-neutral-500">No rows match this report.</p> : null}
      </Panel>
      <Pagination data={pagination} pathname={`/reports/${report.id}`} searchParams={filters} />
    </>
  );
}
