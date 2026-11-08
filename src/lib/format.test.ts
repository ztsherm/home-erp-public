import { describe, expect, it } from "vitest";
import { shortDateTime, transactionRecordName } from "@/lib/format";

describe("transactionRecordName", () => {
  it("formats transaction sequence numbers with the correct prefixes", () => {
    expect(transactionRecordName("item_putaway", 1)).toBe("IP00001");
    expect(transactionRecordName("item_transfer", 42)).toBe("IT00042");
    expect(transactionRecordName("item_consumption", 7)).toBe("IC00007");
    expect(transactionRecordName("item_maintenance", 1234)).toBe("IM01234");
  });

  it("supports event route kinds and enum values", () => {
    expect(transactionRecordName("putaway", 2)).toBe("IP00002");
    expect(transactionRecordName("ITEM_TRANSFER", 3)).toBe("IT00003");
    expect(transactionRecordName("consumption", 5)).toBe("IC00005");
    expect(transactionRecordName("maintenance", "4")).toBe("IM00004");
  });
});

describe("shortDateTime", () => {
  it("includes a seconds-level 12-hour timestamp", () => {
    expect(shortDateTime(new Date("2026-01-02T03:04:05"))).toMatch(/\d{1,2}:\d{2}:\d{2}\s(AM|PM)/);
  });
});
