import { prisma } from "@/server/db";
import { requireHouseholdContext } from "@/server/auth/context";
import { AssistantHeader } from "@/components/assistant-header";
import { CreateItemFlowClient } from "@/components/create-item-flow-client";

export default async function AssistantCreateItemPage({
  searchParams,
}: {
  searchParams: Promise<{ upc?: string; name?: string; areaId?: string }>;
}) {
  const { householdId, user } = await requireHouseholdContext();
  const { upc, name, areaId } = await searchParams;

  const [areas, rooms] = await Promise.all([
    prisma.area.findMany({
      where: { householdId, active: true },
      include: {
        location: { select: { name: true } },
        room: { select: { name: true } },
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
      <AssistantHeader title="Create New Item" showBack backHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4">
        <CreateItemFlowClient
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
          initialName={name}
          initialUpc={upc}
          initialAreaId={areaId}
        />
      </main>
    </div>
  );
}
