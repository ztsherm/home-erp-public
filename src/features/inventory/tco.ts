export type TcoInput = {
  purchasePrice?: number | string | null;
  purchaseDate?: Date | string | null;
  maintenanceCosts?: Array<number | string | null | undefined> | number | string | null;
  createdAt?: Date | string | null;
  asOfDate?: Date | string | null;
};

export type TcoSummary = {
  purchasePrice: number;
  totalMaintenanceCost: number;
  totalOwnershipCost: number;
  ownershipDays: number;
  ownershipMonths: number;
  ownershipYears: number;
  costPerMonth: number;
  costPerYear: number;
  hasFinancialData: boolean;
};

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateTco(input: TcoInput): TcoSummary {
  const purchasePrice = parseNumber(input.purchasePrice);
  const costsArray = Array.isArray(input.maintenanceCosts)
    ? input.maintenanceCosts
    : input.maintenanceCosts !== undefined
      ? [input.maintenanceCosts]
      : [];
  const totalMaintenanceCost = costsArray.reduce<number>((acc, cost) => acc + parseNumber(cost), 0);
  const totalOwnershipCost = purchasePrice + totalMaintenanceCost;

  const asOf = parseDate(input.asOfDate) ?? new Date();
  const purchaseDate = parseDate(input.purchaseDate);
  const createdAt = parseDate(input.createdAt);
  const effectiveStart = purchaseDate ?? createdAt ?? asOf;

  const diffMs = Math.max(0, asOf.getTime() - effectiveStart.getTime());
  const ownershipDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  
  // Standard accounting months (365.25 / 12 = 30.4375 days per month)
  // We clamp minimum duration to 1 month for sensible amortization rates
  const exactMonths = ownershipDays / 30.4375;
  const ownershipMonths = Math.max(1, exactMonths);
  const exactYears = ownershipDays / 365.25;
  const ownershipYears = Math.max(1 / 12, exactYears);

  const costPerMonth = totalOwnershipCost / ownershipMonths;
  const costPerYear = totalOwnershipCost / ownershipYears;

  const hasFinancialData = purchasePrice > 0 || totalMaintenanceCost > 0;

  return {
    purchasePrice,
    totalMaintenanceCost,
    totalOwnershipCost,
    ownershipDays,
    ownershipMonths,
    ownershipYears,
    costPerMonth,
    costPerYear,
    hasFinancialData,
  };
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
