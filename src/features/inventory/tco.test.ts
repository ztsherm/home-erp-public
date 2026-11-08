import { describe, expect, it } from "vitest";
import { calculateTco, formatCurrency } from "./tco";

describe("calculateTco", () => {
  it("calculates total ownership cost with purchase price and maintenance costs", () => {
    const result = calculateTco({
      purchasePrice: 120,
      maintenanceCosts: [30, 20],
      purchaseDate: new Date("2025-01-01"),
      asOfDate: new Date("2026-01-01"),
    });

    expect(result.purchasePrice).toBe(120);
    expect(result.totalMaintenanceCost).toBe(50);
    expect(result.totalOwnershipCost).toBe(170);
    expect(result.hasFinancialData).toBe(true);
    expect(result.ownershipDays).toBe(365);
    expect(Math.round(result.costPerMonth * 100) / 100).toBeCloseTo(14.18, 1);
    expect(Math.round(result.costPerYear * 100) / 100).toBeCloseTo(170.12, 1);
  });

  it("handles zero maintenance and recent purchases without division by zero", () => {
    const today = new Date();
    const result = calculateTco({
      purchasePrice: 60,
      purchaseDate: today,
      asOfDate: today,
    });

    expect(result.totalOwnershipCost).toBe(60);
    expect(result.totalMaintenanceCost).toBe(0);
    expect(result.ownershipMonths).toBe(1);
    expect(result.costPerMonth).toBe(60);
  });

  it("formats currency correctly", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(null)).toBe("$0.00");
  });
});
