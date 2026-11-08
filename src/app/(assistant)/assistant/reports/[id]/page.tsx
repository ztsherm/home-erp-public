import Link from "next/link";
import { getReportPageData } from "@/features/reports/queries";
import { AssistantHeader } from "@/components/assistant-header";
import { Pagination } from "@/components/pagination";
import { FileSpreadsheet, Filter, Search } from "lucide-react";

export default async function AssistantReportViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { report, columns, rows, availableFilters, pagination, user, query } =
    await getReportPageData(id, filters);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader
        title={report.name}
        showBack
        backHref="/assistant/reports"
        user={user}
      />

      <main className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {/* Report Header Card */}
        <section className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121c2a] tracking-tight">{report.name}</h2>
              <p className="text-xs text-[#737686] mt-0.5">
                {report.visibility === "PUBLIC" ? "Public Household Report" : "My Private Report"} •{" "}
                {pagination.total} Rows
              </p>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc]">
          <form className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))_auto] gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#434655] mb-1">
                Contains Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search all columns..."
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-[#004ac6]"
                />
              </div>
            </div>

            {availableFilters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#434655] mb-1">
                  {filter.label}
                </label>
                <input
                  name={`filter_${filter.id}`}
                  defaultValue={filter.value}
                  placeholder="Filter value..."
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#004ac6]"
                />
              </div>
            ))}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-[#004ac6] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#003ea8] transition-colors"
              >
                Apply Filters
              </button>
              <Link
                href={`/assistant/reports/${report.id}`}
                className="bg-neutral-100 text-[#434655] font-semibold text-xs px-3 py-2.5 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {/* Horizontal Scrolling Report Table */}
        <section className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-[#dee9fc] text-xs">
              <thead className="bg-[#f8f9ff] text-left">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className="whitespace-nowrap px-4 py-3.5 font-bold uppercase tracking-wider text-[#434655]"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dee9fc]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className="whitespace-nowrap px-4 py-3 text-[#121c2a] font-medium"
                      >
                        {row.cells[col.columnKey]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!rows.length ? (
            <div className="p-8 text-center text-xs text-[#737686]">
              No rows match this report criteria.
            </div>
          ) : null}
        </section>

        {/* Pagination */}
        <Pagination
          data={pagination}
          pathname={`/assistant/reports/${report.id}`}
          searchParams={filters}
        />
      </main>
    </div>
  );
}
