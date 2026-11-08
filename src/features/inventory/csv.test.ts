import { describe, expect, it } from "vitest";
import { inventoryCsv } from "@/features/inventory/csv";

describe("inventory CSV", () => {
  it("escapes commas, quotes, and newlines", () => {
    const csv = inventoryCsv([{ id: "item-1", name: "Drill, cordless", description: "Line one\nLine two", notes: 'Uses 1/4" bits', active: true }]);
    expect(csv).toContain('"Drill, cordless"');
    expect(csv).toContain('"Line one\nLine two"');
    expect(csv).toContain('"Uses 1/4"" bits"');
  });
});
