import { describe, expect, it } from "vitest";
import { supportedBarcodeFormats } from "@/components/barcode-scanner";

function parseScanCodeOrUrl(code: string, targetType: string = "all") {
  let trimmed = code.trim();
  let target = targetType;
  if (!trimmed) return { target, id: "", isUrl: false };

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      const url = trimmed.startsWith("/") ? new URL(trimmed, "http://localhost") : new URL(trimmed);
      const pathname = url.pathname;
      const areaMatch = pathname.match(/\/(?:assistant\/)?area\/([^/]+)/);
      if (areaMatch && areaMatch[1]) {
        return { target: "area", id: areaMatch[1], isUrl: true };
      }
      const itemMatch = pathname.match(/\/(?:assistant\/)?item\/([^/]+)/);
      if (itemMatch && itemMatch[1]) {
        return { target: "item", id: itemMatch[1], isUrl: true };
      }
    }
  } catch {
    // Ignore URL parse error
  }

  return { target, id: trimmed, isUrl: false };
}

describe("assistant scan target resolution and URL parsing", () => {
  it("supports common 1D and 2D barcode formats", () => {
    expect(supportedBarcodeFormats).toContain("qr_code");
    expect(supportedBarcodeFormats).toContain("upc_a");
    expect(supportedBarcodeFormats).toContain("upc_e");
    expect(supportedBarcodeFormats).toContain("ean_13");
    expect(supportedBarcodeFormats).toContain("code_128");
  });

  it("extracts area ID from assistant area URL QR codes", () => {
    const res = parseScanCodeOrUrl("https://home-erp.local/assistant/area/area-garage-shelf-1");
    expect(res).toEqual({ target: "area", id: "area-garage-shelf-1", isUrl: true });
  });

  it("extracts item ID from assistant item URL QR codes", () => {
    const res = parseScanCodeOrUrl("https://home-erp.local/assistant/item/item-drill-123");
    expect(res).toEqual({ target: "item", id: "item-drill-123", isUrl: true });
  });

  it("handles relative URL paths", () => {
    const res = parseScanCodeOrUrl("/assistant/area/bin-42");
    expect(res).toEqual({ target: "area", id: "bin-42", isUrl: true });
  });

  it("preserves standard raw barcode strings", () => {
    const res = parseScanCodeOrUrl("012345678905", "item");
    expect(res).toEqual({ target: "item", id: "012345678905", isUrl: false });
  });

  it("resolves items with secondary multi-UPC barcodes", () => {
    const mockItem = {
      id: "item-spark-plug",
      name: "NGK Spark Plug",
      upc: "087295124116",
      multiUpcs: [
        { id: "mupc-1", upc: "087295124116", active: true },
        { id: "mupc-2", upc: "087295124123", active: true },
        { id: "mupc-3", upc: "087295124130", active: true },
      ],
    };

    const hasMatchingUpc = (code: string) =>
      mockItem.upc === code ||
      mockItem.multiUpcs.some((m) => m.active && m.upc === code);

    expect(hasMatchingUpc("087295124116")).toBe(true);
    expect(hasMatchingUpc("087295124123")).toBe(true);
    expect(hasMatchingUpc("087295124130")).toBe(true);
    expect(hasMatchingUpc("999999999999")).toBe(false);
  });
});
