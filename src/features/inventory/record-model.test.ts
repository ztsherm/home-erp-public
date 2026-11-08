import { describe, expect, it } from "vitest";

function transferQuantity(sourceQuantity: number, requestedQuantity: number) {
  if (requestedQuantity <= 0) throw new Error("Quantity must be greater than zero");
  if (requestedQuantity > sourceQuantity) throw new Error("Transfer quantity exceeds available quantity");
  return {
    sourceQuantity: sourceQuantity - requestedQuantity,
    destinationIncrement: requestedQuantity,
  };
}

describe("item location transaction rules", () => {
  it("moves quantity from one item location to another", () => {
    expect(transferQuantity(5, 2)).toEqual({ sourceQuantity: 3, destinationIncrement: 2 });
  });

  it("rejects transfers with no available quantity", () => {
    expect(() => transferQuantity(1, 2)).toThrow("exceeds");
  });

  it("rejects non-positive transfer quantities", () => {
    expect(() => transferQuantity(1, 0)).toThrow("greater than zero");
  });
});
