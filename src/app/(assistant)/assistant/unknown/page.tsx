import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { UnknownScanClient } from "@/components/unknown-scan-client";

export default async function UnknownScanPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { householdId, user } = await requireHouseholdContext();
  const { code = "Unknown" } = await searchParams;

  const items = await prisma.item.findMany({
    where: { householdId, active: true },
    select: { id: true, name: true, brand: true, model: true, upc: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title="Scanner" showBack backHref="/assistant/scan" cancelHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <UnknownScanClient code={code} items={items} />
      </main>
    </div>
  );
}
