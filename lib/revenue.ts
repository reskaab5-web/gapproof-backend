import type { RevenueModel } from "./types.js";

// Share of total keyword clicks captured at a given average map-pack rank.
// Based on published local-pack CTR benchmarks (pack + local finder ~44% of clicks,
// distributed steeply toward the top 3).
export function ctrForRank(avgRank: number): number {
  if (avgRank <= 1.5) return 0.29;
  if (avgRank <= 3) return 0.18;
  if (avgRank <= 5) return 0.10;
  if (avgRank <= 8) return 0.055;
  if (avgRank <= 12) return 0.028;
  if (avgRank <= 16) return 0.014;
  return 0.006;
}

export function buildRevenueModel(
  avgCustomerValue: number,
  monthlySearches: number,
  avgRank: number,
  conversionRate = 0.11
): RevenueModel {
  const currentCtr = ctrForRank(avgRank);
  const potentialCtr = 0.29; // if they reached top-3 like the category leader
  const lostCustomersPerMonth = Math.max(
    0,
    monthlySearches * (potentialCtr - currentCtr) * conversionRate
  );
  const monthlyLost = lostCustomersPerMonth * avgCustomerValue;
  return {
    avgCustomerValue,
    monthlySearches,
    currentCtr,
    potentialCtr,
    conversionRate,
    lostCustomersPerMonth: Math.round(lostCustomersPerMonth),
    monthlyLost: Math.round(monthlyLost),
    annualLost: Math.round(monthlyLost * 12),
  };
}
