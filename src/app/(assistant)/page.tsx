import Link from "next/link";
import {
  ArrowRight,
  Barcode,
  Boxes,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Database,
  FileSpreadsheet,
  PackageMinus,
  PackagePlus,
  QrCode,
  ArrowLeftRight,
} from "lucide-react";
import { getAssistantHomeData } from "@/features/inventory/assistant-queries";
import { AssistantHeader } from "@/components/assistant-header";

export default async function AssistantHomePage() {
  const { user, pendingTasksCount, reports } = await getAssistantHomeData();

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader user={user} />

      <main className="max-w-4xl mx-auto px-4 mt-4 space-y-6">
        {/* Greeting Banner */}
        <section className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121c2a]">
            {greeting}, {user.personName}
          </h2>
        </section>

        {/* Begin Tasks Banner */}
        <section>
          <Link
            href="/assistant/tasks"
            className="group relative overflow-hidden flex items-center p-4 sm:p-5 bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] hover:shadow-[0_8px_24px_rgba(31,41,55,0.08)] transition-all duration-300 border border-[#dee9fc] text-left w-full"
          >
            <div className="flex-shrink-0 w-14 h-14 bg-[#2563eb] text-white rounded-2xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="text-lg font-semibold text-[#121c2a]">Begin Tasks</h3>
              <p className="text-xs sm:text-sm text-[#434655] mt-0.5">
                View and complete your assigned household activities
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#004ac6] text-white shadow-sm">
                <CalendarCheck className="w-3.5 h-3.5" />
                {pendingTasksCount > 0 ? `${pendingTasksCount} Tasks Pending` : "All tasks up to date!"}
              </div>
            </div>
            <div className="text-[#737686] group-hover:text-[#004ac6] transition-colors ml-2">
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>
        </section>

        {/* Primary Action Bento Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Scan / Enter Item */}
          <Link
            href="/assistant/scan?target=item"
            className="group relative overflow-hidden flex items-center p-5 bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] hover:shadow-[0_8px_24px_rgba(31,41,55,0.08)] transition-all duration-300 border border-[#dee9fc] text-left"
          >
            <div className="flex-shrink-0 w-14 h-14 bg-[#004ac6] text-white rounded-2xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <Barcode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#121c2a]">Scan/Enter Item</h3>
              <p className="text-xs text-[#434655] mt-0.5">Log new or existing inventory</p>
            </div>
          </Link>

          {/* Scan / Enter Area */}
          <Link
            href="/assistant/scan?target=area"
            className="group relative overflow-hidden flex items-center p-5 bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] hover:shadow-[0_8px_24px_rgba(31,41,55,0.08)] transition-all duration-300 border border-[#dee9fc] text-left"
          >
            <div className="flex-shrink-0 w-14 h-14 bg-[#006c49] text-white rounded-2xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#121c2a]">Scan/Enter Area</h3>
              <p className="text-xs text-[#434655] mt-0.5">Manage locations and zones</p>
            </div>
          </Link>
        </section>

        {/* Secondary Workflows Grid */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[#121c2a]">Workflows</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Add Item */}
            <Link
              href="/assistant/items/new"
              className="flex flex-col items-center justify-center p-4 h-28 bg-white rounded-xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc] hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#e6eeff] flex items-center justify-center mb-2 text-[#004ac6] group-hover:scale-110 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121c2a]">Add Item</span>
            </Link>

            {/* Putaway */}
            <Link
              href="/assistant/putaway"
              className="flex flex-col items-center justify-center p-4 h-28 bg-white rounded-xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-emerald-100 hover:border-[#006c49] hover:bg-emerald-50/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100/70 flex items-center justify-center mb-2 text-[#006c49] group-hover:scale-110 transition-transform">
                <PackagePlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#006c49]">Putaway</span>
            </Link>

            {/* Transfer */}
            <Link
              href="/assistant/transfer"
              className="flex flex-col items-center justify-center p-4 h-28 bg-white rounded-xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc] hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#e6eeff] flex items-center justify-center mb-2 text-[#004ac6] group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121c2a]">Transfer</span>
            </Link>

            {/* Consume */}
            <Link
              href="/assistant/consume"
              className="flex flex-col items-center justify-center p-4 h-28 bg-white rounded-xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-rose-100 hover:border-[#ba1a1a] hover:bg-rose-50/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100/70 flex items-center justify-center mb-2 text-[#ba1a1a] group-hover:scale-110 transition-transform">
                <PackageMinus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#ba1a1a]">Consume</span>
            </Link>
          </div>
        </section>

        {/* Reports & Insights Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#121c2a]">Reports & Insights</h3>
            {reports.length > 3 ? (
              <Link
                href="/assistant/reports"
                className="text-xs font-bold text-[#004ac6] hover:underline"
              >
                View All ({reports.length})
              </Link>
            ) : null}
          </div>

          <div className="space-y-2">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/assistant/reports/${report.id}`}
                className="flex items-center p-3.5 bg-white rounded-xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc] hover:bg-[#eff4ff] transition-colors w-full group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#004ac6] flex items-center justify-center mr-3 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold text-[#121c2a] truncate">
                    {report.name}
                  </p>
                  <p className="text-xs text-[#737686]">
                    {report.visibility === "PUBLIC" ? "Public Report" : "Private Report"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#737686] group-hover:text-[#004ac6] transition-colors" />
              </Link>
            ))}

            {!reports.length ? (
              <p className="p-4 text-xs text-[#737686] bg-white rounded-xl border border-[#dee9fc] text-center">
                No reports configured yet.
              </p>
            ) : null}
          </div>
        </section>

        {/* Enter ERP Backend Transition Card */}
        <section className="pt-2">
          <Link
            href="/records"
            className="flex items-center p-4 bg-[#eff4ff] rounded-2xl shadow-sm border border-[#dee9fc] hover:bg-[#dbe1ff] transition-colors w-full group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#004ac6] text-white flex items-center justify-center mr-3.5 shrink-0 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#121c2a]">Enter ERP Backend</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#dbe1ff] text-[#004ac6] px-1.5 py-0.5 rounded">
                  Admin & Records
                </span>
              </div>
              <p className="text-xs text-[#434655] mt-0.5 truncate">
                Full relational tables, custom fields, lists, and workflows
              </p>
            </div>
            <div className="text-[#004ac6] group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
