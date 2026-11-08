import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { TransferFlowClient } from "@/components/transfer-flow-client";

export default async function AssistantTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; fromLocationId?: string }>;
}) {
  const { householdId, user } = await requireHouseholdContext();
  const { itemId, fromLocationId } = await searchParams;

  const [items, allAreas, allRooms] = await Promise.all([
    prisma.item.findMany({
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
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.area.findMany({
      where: { householdId, active: true },
      include: {
        location: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [{ location: { name: "asc" } }, { room: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.room.findMany({
      where: { householdId, active: true },
      include: {
        location: { select: { name: true } },
      },
      orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-28 font-sans">
      <AssistantHeader
        title="Transfer Item"
        showBack
        backHref={itemId ? `/assistant/item/${itemId}` : "/"}
        cancelHref="/"
        user={user}
      />

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <TransferFlowClient
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
              areaId: loc.areaId,
              locationName: loc.location.name,
              roomName: loc.room.name,
              areaName: loc.area.name,
            })),
          }))}
          areas={allAreas.map((a) => ({
            id: a.id,
            name: a.name,
            locationName: a.location?.name ?? "",
            roomName: a.room?.name ?? "",
          }))}
          rooms={allRooms.map((r) => ({
            id: r.id,
            name: r.name,
            locationName: r.location?.name ?? "",
          }))}
          initialItemId={itemId}
          initialFromLocationId={fromLocationId}
        />
      </main>
    </div>
  );
}
