import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { PutawayFlowClient } from "@/components/putaway-flow-client";

export default async function AssistantPutawayPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; areaId?: string }>;
}) {
  const { householdId, user } = await requireHouseholdContext();
  const { itemId, areaId } = await searchParams;

  const [items, areas, rooms] = await Promise.all([
    prisma.item.findMany({
      where: { householdId, active: true },
      select: { id: true, name: true, brand: true, model: true, upc: true, photoUrl: true },
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
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-28 font-sans">
      <AssistantHeader
        title="Putaway Item"
        showBack
        backHref={itemId ? `/assistant/item/${itemId}` : areaId ? `/assistant/area/${areaId}` : "/"}
        cancelHref="/"
        user={user}
      />

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <PutawayFlowClient
          items={items}
          areas={areas.map((a) => ({
            id: a.id,
            name: a.name,
            locationName: a.location?.name ?? "",
            roomName: a.room?.name ?? "",
          }))}
          rooms={rooms.map((r) => ({
            id: r.id,
            name: r.name,
            locationId: r.locationId,
            locationName: r.location?.name ?? "",
          }))}
          initialItemId={itemId}
          initialAreaId={areaId}
        />
      </main>
    </div>
  );
}
