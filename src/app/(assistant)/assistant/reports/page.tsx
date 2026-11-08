import Link from "next/link";
import { getReportsPageData } from "@/features/reports/queries";
import { AssistantHeader } from "@/components/assistant-header";
import { ChevronRight, FileSpreadsheet, Search } from "lucide-react";

export default async function AssistantReportsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { reports, user, query } = await getReportsPageData(params);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title="Reports & Insights" showBack backHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Search Bar */}
        <form className="relative">
          <Search className="w-4 h-4 text-[#737686] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search all reports..."
            className="w-full bg-white border border-[#c3c6d7] rounded-xl pl-10 pr-4 py-3 text-xs outline-none focus:border-[#004ac6] shadow-sm"
          />
        </form>

        {/* Reports List */}
        <div className="space-y-2.5">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/assistant/reports/${report.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc] hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#121c2a] truncate">{report.name}</p>
                  <p className="text-xs text-[#737686] mt-0.5 truncate">
                    {report.visibility === "PUBLIC" ? "Public Report" : "Private Report"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#737686] group-hover:text-[#004ac6] shrink-0 ml-2" />
            </Link>
          ))}

          {!reports.length ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#dee9fc] text-xs text-[#737686]">
              No reports found.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
