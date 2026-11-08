import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  MapPin,
  PackagePlus,
} from "lucide-react";
import { getAssistantAreaData } from "@/features/inventory/assistant-queries";
import { AssistantHeader } from "@/components/assistant-header";

export default async function AssistantAreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, area } = await getAssistantAreaData(id);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-28 font-sans">
      <AssistantHeader
        title="Scanned Area"
        showBack
        backHref="/assistant/scan?target=area"
        cancelHref="/"
        user={user}
      />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-5">
        {/* Area Summary Header Card */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(31,41,55,0.06)] border border-[#dee9fc] flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#6cf8bb]/20 text-[#006c49] flex items-center justify-center shrink-0 shadow-sm">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006c49] bg-[#6cf8bb]/25 px-2 py-0.5 rounded-full">
                Storage Area
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#121c2a] tracking-tight mt-1 truncate">
                {area.name}
              </h2>
              <p className="text-xs text-[#737686] mt-0.5 truncate">
                {area.location?.name} &gt; {area.room?.name}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <p className="text-xl font-extrabold text-[#006c49]">{area.itemLocations.length}</p>
            <p className="text-[10px] uppercase font-bold text-[#737686]">Item Types</p>
          </div>
        </section>

        {/* MAJOR PRIMARY HEADER ACTION: Putaway Item Here */}
        <section>
          <Link
            href={`/assistant/putaway?areaId=${area.id}`}
            className="w-full h-14 sm:h-15 bg-[#006c49] text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg hover:bg-[#005236] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 group"
          >
            <PackagePlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span>Putaway Item Here</span>
          </Link>
        </section>

        {/* Inventory Items List */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#434655]">
              Current Inventory in this Area ({area.itemLocations.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {area.itemLocations.map((loc) => (
              <Link
                key={loc.id}
                href={`/assistant/item/${loc.item.id}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dee9fc] flex items-center justify-between hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#e6eeff] text-[#004ac6] overflow-hidden flex items-center justify-center shrink-0">
                    {loc.item.photoUrl ? (
                      <img
                        src={loc.item.photoUrl}
                        alt={loc.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Boxes className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#121c2a] truncate">{loc.item.name}</p>
                    <p className="text-xs text-[#737686] truncate">
                      {[loc.item.brand, loc.item.upc ? `UPC: ${loc.item.upc}` : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#004ac6] bg-[#dbe1ff] px-2.5 py-1 rounded-full">
                    {Number(loc.quantity)} Units
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#737686] group-hover:text-[#004ac6]" />
                </div>
              </Link>
            ))}

            {area.itemLocations.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#dee9fc] space-y-3">
                <Boxes className="w-12 h-12 text-[#737686] mx-auto opacity-40" />
                <div>
                  <p className="text-base font-bold text-[#121c2a]">No items stored here yet</p>
                  <p className="text-xs text-[#737686] mt-1">
                    Tap the Putaway button above to assign items into this area.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
