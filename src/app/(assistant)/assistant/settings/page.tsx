import { CurrentPeopleForm, PasswordForm, PinForm } from "@/components/forms";
import { getSettingsPageData } from "@/features/inventory/queries";
import { AssistantHeader } from "@/components/assistant-header";
import { Home, KeyRound, ShieldCheck, User } from "lucide-react";

export default async function AssistantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string; pin?: string }>;
}) {
  const params = await searchParams;
  const { person, household, user } = await getSettingsPageData();

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title="Settings" showBack backHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Profile Card */}
        <section className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#004ac6] text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
              {person.name.slice(0, 1)}
            </div>
            <div>
              <h2 className="font-bold text-base text-[#121c2a]">{person.name}</h2>
              <p className="text-xs text-[#737686]">{user.email}</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-blue-100 text-[#004ac6] px-3 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {user.role}
          </span>
        </section>

        {/* Household Info */}
        <section className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-[#004ac6]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#434655]">Household</h3>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-neutral-100">
            <span className="text-[#737686]">Household Name</span>
            <span className="font-semibold text-[#121c2a]">{household.name}</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-[#737686]">Timezone</span>
            <span className="font-semibold text-[#121c2a]">{household.timezone}</span>
          </div>
        </section>

        {/* Profile & PIN Management */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc]">
          <CurrentPeopleForm person={person} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc]">
          <PinForm
            hasPin={Boolean(person.pin)}
            updated={params.pin === "updated"}
            removed={params.pin === "removed"}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc]">
          <PasswordForm updated={params.password === "updated"} />
        </div>
      </main>
    </div>
  );
}
