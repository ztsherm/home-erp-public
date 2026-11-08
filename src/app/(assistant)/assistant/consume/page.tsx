import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { ConsumeFlowClient } from "@/components/consume-flow-client";

export default async function AssistantConsumePage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string }>;
}) {
  const { householdId, user } = await requireHouseholdContext();
  const { itemId } = await searchParams;

  // Load all items with positive stock
  const items = await prisma.item.findMany({
    where: {
      householdId,
      active: true,
      itemLocations: { some: { quantity: { gt: 0 } } },
    },
    include: {
      itemLocations: {
        where: { quantity: { gt: 0 } },
        include: {
          location: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
        },
        orderBy: { quantity: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-28 font-sans">
      <AssistantHeader
        title="Consume Item"
        showBack
        backHref={itemId ? `/assistant/item/${itemId}` : "/"}
        cancelHref="/"
        user={user}
      />

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <ConsumeFlowClient
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            brand: i.brand,
            model: i.model,
            upc: i.upc,
            photoUrl: i.photoUrl,
            itemLocations: i.itemLocations.map((loc) => ({
              id: loc.id,
              quantity: Number(loc.quantity),
              locationName: loc.location.name,
              roomName: loc.room.name,
              areaName: loc.area.name,
            })),
          }))}
          initialItemId={itemId}
        />
      </main>
    </div>
  );
}
