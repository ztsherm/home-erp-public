"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  DollarSign,
  PackagePlus,
  Sliders,
  Tag,
} from "lucide-react";
import { createAssistantItem } from "@/features/inventory/actions";
import { CameraScanButton } from "@/components/barcode-scanner";
import { AreaSearchOption, AreaSearchSelector, RoomOption } from "@/components/area-search-selector";
import { ItemPhotoCapture } from "@/components/item-photo-capture";

export function CreateItemFlowClient({
  areas,
  rooms = [],
  initialName,
  initialUpc,
  initialAreaId,
}: {
  areas: AreaSearchOption[];
  rooms?: RoomOption[];
  initialName?: string;
  initialUpc?: string;
  initialAreaId?: string;
}) {
  const router = useRouter();
  const [productDetailsOpen, setProductDetailsOpen] = useState(Boolean(initialUpc));
  const [upcValue, setUpcValue] = useState(initialUpc ?? "");
  const [inventorySettingsOpen, setInventorySettingsOpen] = useState(false);
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
          const res = await createAssistantItem(formData);
          if (!res.success) {
            setErrorMessage(res.error);
            setIsSubmitting(false);
          } else {
            router.push(`/assistant/item/${res.itemId}`);
          }
        } catch (err: unknown) {
          console.error("Create item failed:", err);
          setErrorMessage("The request could not be completed. Please check your connection and try again.");
          setIsSubmitting(false);
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="active" value="on" />

      {errorMessage ? (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
          {errorMessage}
        </div>
      ) : null}

      {/* Section 1: Basic Information */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h2 className="text-sm font-bold text-[#121c2a]">Basic Information</h2>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Item Name *
          </label>
          <input
            name="name"
            required
            defaultValue={initialName ?? ""}
            placeholder="e.g. 20V Cordless Drill, AA Batteries 24-pk"
            className="w-full bg-[#f8f9ff] border border-[#c3c6d7] focus:border-[#004ac6] rounded-xl px-4 py-3 text-sm outline-none font-medium transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Initial Quantity
          </label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            defaultValue="1"
            className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm outline-none font-medium focus:border-[#004ac6]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Storage Area
          </label>
          <AreaSearchSelector
            areas={areas}
            rooms={rooms}
            initialAreaId={initialAreaId}
            allowUnassigned={true}
            allowCreate={true}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Item Photo
          </label>
          <ItemPhotoCapture inputName="photo" />
        </div>
      </section>

      {/* Section 2: Collapsible Product Details */}
      <section className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] overflow-hidden">
        <button
          type="button"
          onClick={() => setProductDetailsOpen(!productDetailsOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#eff4ff] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-[#004ac6]" />
            <span className="font-bold text-sm text-[#121c2a]">Product Details & Barcode</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-[#737686] transition-transform ${
              productDetailsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {productDetailsOpen ? (
          <div className="p-5 pt-0 border-t border-[#dee9fc] bg-[#f8f9ff]/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Brand
              </label>
              <input
                name="brand"
                placeholder="e.g. DeWalt, Monoprice"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Model
              </label>
              <input
                name="model"
                placeholder="e.g. DCD771C2"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                UPC / Barcode
              </label>
              <div className="flex gap-2">
                <input
                  name="upc"
                  value={upcValue}
                  onChange={(e) => setUpcValue(e.target.value)}
                  placeholder="e.g. 7890123456"
                  className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
                />
                <CameraScanButton
                  label="Scan UPC"
                  onScan={(code) => setUpcValue(code)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Serial Number
              </label>
              <input
                name="serialNumber"
                placeholder="e.g. SN-8923-X"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Section 3: Collapsible Inventory Settings */}
      <section className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] overflow-hidden">
        <button
          type="button"
          onClick={() => setInventorySettingsOpen(!inventorySettingsOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#eff4ff] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-[#004ac6]" />
            <span className="font-bold text-sm text-[#121c2a]">Reorder Thresholds</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-[#737686] transition-transform ${
              inventorySettingsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {inventorySettingsOpen ? (
          <div className="p-5 pt-0 border-t border-[#dee9fc] bg-[#f8f9ff]/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Reorder Threshold (Min)
              </label>
              <input
                name="minQuantity"
                type="number"
                min="0"
                placeholder="e.g. 5"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Target Quantity (Max)
              </label>
              <input
                name="targetQuantity"
                type="number"
                min="0"
                placeholder="e.g. 20"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Section 4: Collapsible Financial / TCO */}
      <section className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] overflow-hidden">
        <button
          type="button"
          onClick={() => setFinancialsOpen(!financialsOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#eff4ff] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-[#004ac6]" />
            <span className="font-bold text-sm text-[#121c2a]">Purchase & Cost Details</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-[#737686] transition-transform ${
              financialsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {financialsOpen ? (
          <div className="p-5 pt-0 border-t border-[#dee9fc] bg-[#f8f9ff]/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Purchase Price ($)
              </label>
              <input
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                Purchase Date
              </label>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full bg-white border border-[#c3c6d7] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#004ac6]"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#dee9fc] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#004ac6] text-white font-bold text-sm rounded-full shadow-md hover:bg-[#003ea8] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PackagePlus className="w-4 h-4" />
            {isSubmitting ? "Creating Item..." : "Create Item & Putaway"}
          </button>
        </div>
      </div>
    </form>
  );
}
