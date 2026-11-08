import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { itemMaintenance } from "@/features/inventory/actions";
import { redirect } from "next/navigation";
import { Boxes, Wrench } from "lucide-react";

export default async function AssistantItemMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { householdId, user } = await requireHouseholdContext();

  const item = await prisma.item.findFirstOrThrow({
    where: { id, householdId, active: true },
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader
        title="Log Maintenance"
        showBack
        backHref={`/assistant/item/${item.id}`}
        user={user}
      />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Item Card */}
        <section className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#004ac6] overflow-hidden flex items-center justify-center shrink-0">
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Boxes className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#121c2a]">{item.name}</h2>
            <p className="text-xs text-[#737686]">
              {[item.brand, item.model].filter(Boolean).join(" • ") || "Inventory Item"}
            </p>
          </div>
        </section>

        {/* Maintenance Form */}
        <form
          action={async (formData) => {
            "use server";
            await itemMaintenance(formData);
            redirect(`/assistant/item/${id}`);
          }}
          className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] space-y-4"
        >
          <input type="hidden" name="itemId" value={item.id} />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
              Maintenance Type *
            </label>
            <input
              name="maintenanceType"
              required
              autoFocus
              placeholder="e.g. Battery Replacement, Cleaning, Calibration"
              className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#004ac6]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
                Service Provider / Vendor
              </label>
              <input
                name="vendor"
                placeholder="e.g. Self, Authorized Repair"
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
                Cost ($)
              </label>
              <input
                name="cost"
                placeholder="0.00"
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
              Next Due Date
            </label>
            <input
              name="nextDueDate"
              type="date"
              className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#004ac6]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
              Service Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Describe work completed or parts replaced..."
              className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl p-3 text-sm outline-none focus:border-[#004ac6]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#004ac6] text-white font-bold text-sm py-3.5 rounded-xl shadow-md hover:bg-[#003ea8] transition-colors flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Save Maintenance Log
          </button>
        </form>
      </main>
    </div>
  );
}
