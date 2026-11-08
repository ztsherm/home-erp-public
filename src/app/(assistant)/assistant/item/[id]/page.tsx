import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Building2,
  ChevronRight,
  Handshake,
  MapPin,
  PackageMinus,
  PackagePlus,
  PlusCircle,
  TrendingDown,
  Wrench,
} from "lucide-react";
import { getAssistantItemData } from "@/features/inventory/assistant-queries";
import { AssistantHeader } from "@/components/assistant-header";
import { ReturnLoanForm } from "@/components/forms";
import { shortDate } from "@/lib/format";

export default async function AssistantItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, item, totalQuantity, allAreas } = await getAssistantItemData(id);

  const minQty = item.minQuantity !== null ? Number(item.minQuantity) : null;
  const targetQty = item.targetQuantity !== null ? Number(item.targetQuantity) : null;
  const isLowStock = minQty !== null && minQty > 0 && totalQuantity <= minQty;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title="Scanned Item" showBack backHref="/assistant/scan" cancelHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-6">
        {/* Item Summary Card */}
        <section className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#eff4ff] border border-[#dee9fc] overflow-hidden flex items-center justify-center shrink-0 text-[#004ac6] relative shadow-sm">
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Boxes className="w-14 h-14" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
              <span className="bg-[#e6eeff] text-[#004ac6] text-xs font-bold px-2.5 py-0.5 rounded-full">
                {item.brand ?? "Inventory Item"}
              </span>
              {isLowStock ? (
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Replenishment Needed
                </span>
              ) : null}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#121c2a] tracking-tight">{item.name}</h2>
            {(() => {
              const allUpcs = Array.from(
                new Set([item.upc, ...(item.multiUpcs?.map((m) => m.upc) ?? [])].filter(Boolean) as string[])
              );
              return (
                <p className="text-xs text-[#737686]">
                  {[
                    item.model ? `Model: ${item.model}` : null,
                    allUpcs.length > 0 ? `UPC${allUpcs.length > 1 ? "s" : ""}: ${allUpcs.join(", ")}` : null,
                    item.serialNumber ? `SN: ${item.serialNumber}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || `ID: ${item.id}`}
                </p>
              );
            })()}

            <div className="pt-2 flex items-center gap-3 justify-center sm:justify-start">
              <span className="text-lg font-bold text-[#004ac6] bg-[#dbe1ff] px-3 py-1 rounded-xl">
                {totalQuantity} Units Available
              </span>
              {minQty !== null && minQty > 0 ? (
                <span className="text-xs text-[#737686]">
                  (Min: {minQty}, Max: {targetQty ?? "—"})
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Active Loan Alert (if borrowed) */}
        {item.loans && item.loans.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Handshake className="w-4 h-4" /> Item is Currently Loaned Out
            </p>
            {item.loans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between text-sm text-amber-950 pt-1">
                <div>
                  <p className="font-semibold">{loan.borrower.name}</p>
                  {loan.expectedReturnDate ? (
                    <p className="text-xs text-amber-800">
                      Due back: {shortDate(loan.expectedReturnDate)}
                    </p>
                  ) : null}
                </div>
                <ReturnLoanForm loanId={loan.id} />
              </div>
            ))}
          </section>
        ) : null}

        {/* Primary Guided Action Buttons */}
        <section className="grid grid-cols-2 gap-3">
          {/* Putaway */}
          <Link
            href={`/assistant/putaway?itemId=${item.id}`}
            className="h-14 bg-[#006c49] text-white font-bold text-sm rounded-full flex items-center justify-center gap-2 shadow-md hover:bg-[#005236] active:scale-95 transition-all"
          >
            <PackagePlus className="w-5 h-5" />
            Putaway
          </Link>

          {/* Consume */}
          <Link
            href={`/assistant/consume?itemId=${item.id}`}
            className="h-14 bg-[#ba1a1a] text-white font-bold text-sm rounded-full flex items-center justify-center gap-2 shadow-md hover:bg-[#93000a] active:scale-95 transition-all"
          >
            <PackageMinus className="w-5 h-5" />
            Consume
          </Link>

          {/* Maintenance Log */}
          <Link
            href={`/assistant/item/${item.id}/maintenance`}
            className="h-12 bg-white text-[#004ac6] border border-[#004ac6] font-semibold text-xs sm:text-sm rounded-full flex items-center justify-center gap-2 hover:bg-[#eff4ff] active:scale-95 transition-all"
          >
            <Wrench className="w-4 h-4" />
            Maintenance Log
          </Link>

          {/* Loan Out */}
          <Link
            href={`/assistant/item/${item.id}/loan`}
            className="h-12 bg-white text-[#004ac6] border border-[#004ac6] font-semibold text-xs sm:text-sm rounded-full flex items-center justify-center gap-2 hover:bg-[#eff4ff] active:scale-95 transition-all"
          >
            <Handshake className="w-4 h-4" />
            Loan Out
          </Link>
        </section>

        {/* Current Locations Section */}
        <section className="space-y-3">
          <div>
            <h3 className="text-base font-bold text-[#121c2a]">Current Locations</h3>
            <p className="text-xs text-[#737686]">Select a location to transfer or manage items.</p>
          </div>

          <div className="space-y-2.5">
            {item.itemLocations.map((loc) => (
              <Link
                key={loc.id}
                href={`/assistant/transfer?itemId=${item.id}&fromLocationId=${loc.id}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dee9fc] flex items-center justify-between hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#e6eeff] text-[#004ac6] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#121c2a] truncate">
                      {loc.location?.name ?? "Location"} / {loc.room?.name ?? "Room"} / {loc.area?.name ?? "Area"}
                    </p>
                    <p className="text-xs font-bold text-[#004ac6] mt-0.5">
                      {Number(loc.quantity)} Units in this area
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#737686] group-hover:text-[#004ac6]">
                  <span>Transfer</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}

            {item.itemLocations.length === 0 ? (
              <p className="p-4 text-xs text-[#737686] bg-white rounded-xl border border-[#dee9fc] text-center">
                This item currently has 0 units placed in any area.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
