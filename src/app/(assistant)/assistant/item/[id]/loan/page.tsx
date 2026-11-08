import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { LoanFlowClient } from "@/components/loan-flow-client";
import { Boxes } from "lucide-react";

export default async function AssistantItemLoanPage({
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
        title="Loan Out Item"
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

        {/* Loan Flow with Contains Search for Borrower */}
        <LoanFlowClient
          itemId={item.id}
          itemName={item.name}
          brand={item.brand}
          model={item.model}
        />
      </main>
    </div>
  );
}
