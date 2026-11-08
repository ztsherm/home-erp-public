"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Barcode,
  Boxes,
  ChevronRight,
  HelpCircle,
  Link as LinkIcon,
  MapPin,
  PlusCircle,
  QrCode,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { AssistantHeader } from "@/components/assistant-header";
import { EmbeddedCameraScanner } from "@/components/barcode-scanner";
import { linkBarcodeToItem } from "@/features/inventory/actions";

type SearchItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  upc: string | null;
  photoUrl: string | null;
  totalQuantity: number;
};

type SearchArea = {
  id: string;
  name: string;
  locationName: string;
  roomName: string;
  itemCount: number;
};

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetParam = searchParams.get("target");
  const targetType: "all" | "item" | "area" =
    targetParam === "area" ? "area" : targetParam === "item" ? "item" : "all";

  const isAreaMode = targetType === "area";
  const isItemMode = targetType === "item";

  // Camera Scanning State
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);

  // Separate Manual Search State
  const [manualQuery, setManualQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    items: SearchItem[];
    areas: SearchArea[];
  }>({ items: [], areas: [] });
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [hasSearchedManual, setHasSearchedManual] = useState(false);

  // Inline "Update UPC on Existing Item" for manual search zero-match
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [existingItemQuery, setExistingItemQuery] = useState("");
  const [existingItems, setExistingItems] = useState<SearchItem[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  // AUTOMATIC CAMERA SCAN HANDLER
  const handleCameraScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || isResolvingScan) return;

      setIsResolvingScan(true);
      setScanStatusMessage(`Looking up "${trimmed}"...`);

      try {
        const res = await fetch(
          `/api/assistant/scan?code=${encodeURIComponent(trimmed)}&target=${targetType}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.matched === "item" && data.id) {
            setScanStatusMessage(`Found item: ${data.item?.name ?? "Item"}. Opening...`);
            router.push(`/assistant/item/${data.id}`);
            return;
          }

          if (data.matched === "area" && data.id) {
            setScanStatusMessage(`Found area: ${data.area?.name ?? "Storage Area"}. Opening...`);
            router.push(`/assistant/area/${data.id}`);
            return;
          }
        }

        // Unrecognized code -> navigate to Add Item / Link UPC screen
        setScanStatusMessage(`Unrecognized code. Opening options...`);
        router.push(`/assistant/unknown?code=${encodeURIComponent(trimmed)}`);
      } catch (err) {
        console.error("Scan resolution failed:", err);
        router.push(`/assistant/unknown?code=${encodeURIComponent(trimmed)}`);
      } finally {
        // Keep brief resolving indicator while routing
        setTimeout(() => {
          setIsResolvingScan(false);
          setScanStatusMessage(null);
        }, 2000);
      }
    },
    [isResolvingScan, targetType, router]
  );

  // SEPARATE MANUAL SEARCH DEBOUNCE
  useEffect(() => {
    const q = manualQuery.trim();
    if (!q) {
      setSearchResults({ items: [], areas: [] });
      setIsSearchingManual(false);
      setHasSearchedManual(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingManual(true);
      try {
        const res = await fetch(
          `/api/assistant/search?q=${encodeURIComponent(q)}&target=${targetType}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults({
            items: data.items ?? [],
            areas: data.areas ?? [],
          });
          setHasSearchedManual(true);
        }
      } catch (err) {
        console.error("Manual search failed:", err);
      } finally {
        setIsSearchingManual(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualQuery, targetType]);

  // Debounced search for linking UPC in zero-match manual flow
  useEffect(() => {
    if (!showLinkExisting) return;
    const q = existingItemQuery.trim();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/assistant/search?q=${encodeURIComponent(q)}&target=item`
        );
        if (res.ok) {
          const data = await res.json();
          setExistingItems(data.items ?? []);
        }
      } catch (err) {
        console.error("Failed fetching items for link:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [showLinkExisting, existingItemQuery]);

  async function handleLinkBarcode(itemId: string) {
    if (!manualQuery.trim()) return;
    setIsLinking(true);
    try {
      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("barcode", manualQuery.trim());
      await linkBarcodeToItem(formData);
      router.push(`/assistant/item/${itemId}`);
    } catch (err) {
      console.error("Link barcode failed:", err);
      setIsLinking(false);
    }
  }

  const pageTitle = isAreaMode
    ? "Scan Area / Bin"
    : isItemMode
    ? "Scan Item"
    : "Barcode Scanner";

  const searchPlaceholder = isAreaMode
    ? "Type area name, room, or location..."
    : isItemMode
    ? "Type item name, brand, UPC, or SKU..."
    : "Type item name, UPC, or area...";

  const noItemResults = !isAreaMode && searchResults.items.length === 0;
  const noAreaResults = isAreaMode && searchResults.areas.length === 0;
  const noManualResults = isAreaMode
    ? searchResults.areas.length === 0
    : isItemMode
    ? searchResults.items.length === 0
    : searchResults.items.length === 0 && searchResults.areas.length === 0;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title={pageTitle} showBack backHref="/" />

      <main className="max-w-xl mx-auto px-4 mt-4 space-y-6">
        {/* Target Mode Filter Pills */}
        <div className="flex items-center justify-between gap-2 p-1 bg-white rounded-2xl border border-[#dee9fc] shadow-xs">
          <Link
            href="/assistant/scan"
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              targetType === "all"
                ? "bg-[#004ac6] text-white shadow-xs"
                : "text-[#434655] hover:text-[#121c2a] hover:bg-neutral-50"
            }`}
          >
            All Barcodes
          </Link>
          <Link
            href="/assistant/scan?target=item"
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              targetType === "item"
                ? "bg-[#004ac6] text-white shadow-xs"
                : "text-[#434655] hover:text-[#121c2a] hover:bg-neutral-50"
            }`}
          >
            Items Only
          </Link>
          <Link
            href="/assistant/scan?target=area"
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              targetType === "area"
                ? "bg-[#006c49] text-white shadow-xs"
                : "text-[#434655] hover:text-[#121c2a] hover:bg-neutral-50"
            }`}
          >
            Areas Only
          </Link>
        </div>

        {/* PRIMARY CAMERA SCANNER CARD */}
        <section className="space-y-2">
          <EmbeddedCameraScanner
            onScan={handleCameraScan}
            targetType={targetType}
            isProcessing={isResolvingScan}
            autoStart={true}
          />
          {scanStatusMessage ? (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#004ac6] text-xs font-semibold text-center animate-pulse">
              {scanStatusMessage}
            </div>
          ) : null}
        </section>

        {/* SEPARATE MANUAL SEARCH FLOW */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#c3c6d7]/60" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#737686]">
              Or Search Manually
            </span>
            <div className="h-px flex-1 bg-[#c3c6d7]/60" />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-5 h-5 text-[#737686] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => {
                  setManualQuery(e.target.value);
                  setShowLinkExisting(false);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-white border border-[#c3c6d7] focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Manual Search Feedback & Results */}
          {isSearchingManual ? (
            <div className="text-center py-6 text-xs text-[#737686] animate-pulse">
              Searching {isAreaMode ? "storage areas" : isItemMode ? "items" : "catalog"}...
            </div>
          ) : manualQuery.trim() && hasSearchedManual ? (
            <div className="space-y-4">
              {/* Matching Items */}
              {!isAreaMode && searchResults.items.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#434655] px-1">
                    Matching Items ({searchResults.items.length})
                  </h4>
                  <div className="space-y-2">
                    {searchResults.items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/assistant/item/${item.id}`}
                        className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-xs border border-[#dee9fc] hover:border-[#004ac6] hover:bg-[#eff4ff] transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#e6eeff] text-[#004ac6] overflow-hidden flex items-center justify-center shrink-0">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Boxes className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#121c2a] truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-[#737686] truncate">
                              {[
                                item.brand,
                                item.upc ? `UPC: ${item.upc}` : null,
                                item.model ? `Model: ${item.model}` : null,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#004ac6] bg-[#dbe1ff] px-2.5 py-1 rounded-full">
                            {item.totalQuantity} units
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#737686] group-hover:text-[#004ac6]" />
                        </div>
                      </Link>
                    ))}

                    {/* Persistent Action Footer below items */}
                    <div className="p-3 bg-white rounded-xl border border-[#dee9fc] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                      <span className="text-[#737686]">Don&apos;t see your item?</span>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/assistant/items/new?name=${encodeURIComponent(manualQuery)}`}
                          className="font-bold text-[#004ac6] hover:underline"
                        >
                          + Create New Item
                        </Link>
                        <span className="text-[#c3c6d7]">•</span>
                        <button
                          type="button"
                          onClick={() => setShowLinkExisting(true)}
                          className="font-bold text-[#004ac6] hover:underline"
                        >
                          Update UPC on Existing
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Matching Areas */}
              {!isItemMode && searchResults.areas.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#434655] px-1">
                    Matching Storage Areas ({searchResults.areas.length})
                  </h4>
                  <div className="space-y-2">
                    {searchResults.areas.map((area) => (
                      <Link
                        key={area.id}
                        href={`/assistant/area/${area.id}`}
                        className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-xs border border-[#dee9fc] hover:border-[#006c49] hover:bg-[#eff4ff] transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#6cf8bb]/20 text-[#006c49] flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#121c2a] truncate">
                              {area.name}
                            </p>
                            <p className="text-xs text-[#737686] truncate">
                              {area.locationName} &gt; {area.roomName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#006c49] bg-[#6cf8bb]/30 px-2.5 py-1 rounded-full">
                            {area.itemCount} items
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#737686] group-hover:text-[#006c49]" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Item Actions (When 0 items match OR user wants to link existing) */}
              {!isAreaMode && (searchResults.items.length === 0 || showLinkExisting) ? (
                <div className="bg-white rounded-2xl p-5 border border-[#dee9fc] shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004ac6] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#121c2a]">
                        {searchResults.items.length === 0
                          ? `No item results for "${manualQuery}"`
                          : `Manage barcode "${manualQuery}"`}
                      </h4>
                      <p className="text-xs text-[#737686]">
                        You can register this as a new item or assign it to existing inventory.
                      </p>
                    </div>
                  </div>

                  {/* Action 1: Create New Item */}
                  <Link
                    href={`/assistant/items/new?name=${encodeURIComponent(manualQuery)}`}
                    className="flex items-center justify-between p-3.5 bg-[#eff4ff] hover:bg-[#dbe1ff] border border-[#dbe1ff] rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-5 h-5 text-[#004ac6]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#004ac6]">Create New Item</p>
                        <p className="text-[11px] text-[#434655]">
                          Add a product named &quot;{manualQuery}&quot;
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#004ac6] group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  {/* Action 2: Link to Existing Item */}
                  {!showLinkExisting ? (
                    <button
                      type="button"
                      onClick={() => setShowLinkExisting(true)}
                      className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-neutral-50 border border-[#c3c6d7] rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-[#434655]" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-[#121c2a]">
                            Update UPC on Existing Item
                          </p>
                          <p className="text-[11px] text-[#737686]">
                            Assign &quot;{manualQuery}&quot; as the UPC for an existing item
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#737686] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <div className="p-3.5 bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#121c2a] flex items-center gap-1.5">
                          <LinkIcon className="w-4 h-4 text-[#004ac6]" />
                          Select Item to Attach Code &quot;{manualQuery}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowLinkExisting(false)}
                          className="text-xs text-[#737686] hover:text-[#121c2a]"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-[#737686] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search existing items..."
                          value={existingItemQuery}
                          onChange={(e) => setExistingItemQuery(e.target.value)}
                          className="w-full bg-white border border-[#c3c6d7] rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#004ac6]"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {existingItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            disabled={isLinking}
                            onClick={() => handleLinkBarcode(item.id)}
                            className="w-full p-2 bg-white rounded-lg border border-neutral-200 hover:border-[#004ac6] hover:bg-[#eff4ff] flex items-center justify-between text-left transition-all text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#121c2a] truncate">{item.name}</p>
                              <p className="text-[10px] text-[#737686]">
                                {item.brand ? `${item.brand} • ` : ""}
                                {item.upc ? `Current UPC: ${item.upc}` : "No UPC assigned"}
                              </p>
                            </div>
                            <span className="shrink-0 ml-2 px-2.5 py-1 rounded bg-[#004ac6] text-white text-[10px] font-bold">
                              {isLinking ? "Linking..." : "Link UPC"}
                            </span>
                          </button>
                        ))}
                        {existingItems.length === 0 && (
                          <p className="text-center py-2 text-[11px] text-[#737686]">
                            Type an item name above to find catalog items.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Area Zero-Match Action */}
              {isAreaMode && searchResults.areas.length === 0 ? (
                <div className="bg-white rounded-2xl p-5 border border-[#dee9fc] shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006c49] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#121c2a]">
                        No storage areas found matching &quot;{manualQuery}&quot;
                      </h4>
                      <p className="text-xs text-[#737686]">
                        Create a storage area to organize inventory.
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/assistant/putaway?areaName=${encodeURIComponent(manualQuery)}`}
                    className="flex items-center justify-between p-3.5 bg-[#eff4ff] hover:bg-[#dbe1ff] border border-[#dbe1ff] rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-5 h-5 text-[#006c49]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#006c49]">Create Storage Area</p>
                        <p className="text-[11px] text-[#434655]">
                          Set up area &quot;{manualQuery}&quot;
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#006c49] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default function AssistantScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center text-xs text-[#737686]">
          Loading scanner...
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
