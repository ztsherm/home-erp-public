"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Link as LinkIcon,
  PlusCircle,
  Search,
} from "lucide-react";
import { linkBarcodeToItem } from "@/features/inventory/actions";

type ExistingItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  upc: string | null;
};

export function UnknownScanClient({
  code,
  items,
}: {
  code: string;
  items: ExistingItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const filteredItems = searchQuery.trim()
    ? items.filter((i) =>
        `${i.name} ${i.brand ?? ""} ${i.model ?? ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Error / Unknown Header */}
      <div className="flex flex-col items-center text-center mt-4 mb-6">
        <div className="w-18 h-18 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(186,26,26,0.15)]">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#121c2a] tracking-tight">Unknown Item Scanned</h2>
        <p className="text-sm text-[#434655] mt-1 max-w-md">
          The barcode <strong className="text-[#121c2a] font-mono">#{code}</strong> was not found in
          your inventory. How would you like to proceed?
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Option 1: Create New Item */}
        <Link
          href={`/assistant/items/new?upc=${encodeURIComponent(code)}`}
          className="flex items-start gap-4 p-5 rounded-2xl bg-white shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] hover:border-[#004ac6] hover:shadow-[0_8px_24px_rgba(31,41,55,0.1)] transition-all group text-left"
        >
          <div className="w-12 h-12 rounded-full bg-[#004ac6] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#121c2a]">Create New Item</h3>
            <p className="text-xs text-[#737686] mt-0.5">
              Add a completely new item to your inventory with this barcode prefilled.
            </p>
          </div>
        </Link>

        {/* Option 2: Update / Link Existing Item */}
        <div className="rounded-2xl bg-white shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center shrink-0">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#121c2a]">Update Existing Item</h3>
              <p className="text-xs text-[#737686] mt-0.5">
                Assign this new barcode to an item already tracked in your system.
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inventory to link barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:border-[#004ac6]"
              />
            </div>

            {searchQuery.trim() ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-neutral-100 border border-[#eff4ff] rounded-xl p-2 bg-[#f8f9ff]">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full p-2 text-left rounded-lg transition-colors flex items-center justify-between text-xs ${
                      selectedItemId === item.id
                        ? "bg-[#004ac6] text-white font-bold"
                        : "hover:bg-[#e6eeff] text-[#121c2a]"
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <span className={`text-[10px] ml-2 shrink-0 ${selectedItemId === item.id ? "text-white/80" : "text-[#737686]"}`}>
                      {item.brand}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {selectedItemId ? (
              <form action={linkBarcodeToItem}>
                <input type="hidden" name="itemId" value={selectedItemId} />
                <input type="hidden" name="upc" value={code} />
                <button
                  type="submit"
                  disabled={isLinking}
                  onClick={() => setIsLinking(true)}
                  className="w-full mt-2 bg-[#004ac6] text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:bg-[#003ea8] transition-colors"
                >
                  {isLinking ? "Assigning Barcode..." : `Assign Barcode to Selected Item`}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
