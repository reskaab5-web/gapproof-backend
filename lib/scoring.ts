import type { BusinessReport, Competitor, GeoPoint, AeoResult } from "./types.js";

export function scoreReviews(
  rating: number, count: number, leaderCount: number, velocity: number, responseRate: number
): number {
  const ratingScore = Math.max(0, (rating - 3) / 2) * 40;
  const volumeScore = Math.min(1, count / Math.max(leaderCount, 1)) * 30;
  const velScore = Math.min(1, velocity / 20) * 15;
  const respScore = responseRate * 15;
  return Math.round(Math.min(100, ratingScore + volumeScore + velScore + respScore));
}

export function summarizeGrid(geoGrid: GeoPoint[]) {
  const ranked = geoGrid.filter((g) => g.rank !== null) as { rank: number }[];
  const avgRank = ranked.length
    ? +(ranked.reduce((s, g) => s + g.rank, 0) / ranked.length).toFixed(1)
    : 20;
  const top3 = geoGrid.filter((g) => g.rank !== null && g.rank <= 3).length;
  const total = geoGrid.length || 1;
  const visibilityScore = Math.round((top3 / total) * 60 + (Math.max(0, 20 - avgRank) / 20) * 40);
  return { avgRank, top3, visibilityScore };
}

export function scoreLead(reviewGapToLeader: number, avgRank: number, monthlyLost: number) {
  const oppFromGap = Math.min(1, reviewGapToLeader / 300) * 45;
  const oppFromRank = Math.min(1, avgRank / 15) * 30;
  const oppFromRev = Math.min(1, monthlyLost / 6000) * 25;
  const leadScore = Math.round(Math.min(100, oppFromGap + oppFromRank + oppFromRev));
  const leadTier: BusinessReport["leadTier"] =
    leadScore >= 70 ? "Hot" : leadScore >= 45 ? "Warm" : "Nurture";
  return { leadScore, leadTier };
}

export function buildNarrative(args: {
  name: string; rating: number; reviewGapToLeader: number; avgRank: number;
  top3: number; total: number; keyword: string; categoryLabel: string;
  aeo: AeoResult[]; aeoScore: number; responseRate: number;
}): { insights: string[]; fixes: string[] } {
  const { name, rating, reviewGapToLeader, avgRank, top3, total, keyword, categoryLabel, aeo, aeoScore, responseRate } = args;
  const notNamed = aeo.filter((a) => !a.mentioned).length;
  const insights = [
    `${name} sits at a ${rating}★ average but is being out-reviewed ${reviewGapToLeader} to nothing by the category leader — the single biggest trust gap a new customer sees on Google.`,
    `Across a ${total}-point geo-grid, the business ranks an average of #${avgRank} for "${keyword}". Only ${top3} of ${total} search points land in the top 3, where ~70% of map-pack clicks happen.`,
    aeoScore < 50
      ? `When buyers ask AI assistants for a "${categoryLabel.toLowerCase()}", ${name} is largely invisible — competitors get named first in ${notNamed} of ${aeo.length} engines tested.`
      : `${name} shows up in AI answers but never as the first recommendation — a fixable positioning gap.`,
    `Only ${Math.round(responseRate * 100)}% of reviews get a reply. Owners who respond signal an active, trusted business and lift conversion on the profile.`,
  ];
  const fixes = [
    `Launch a review-generation system to close the ${reviewGapToLeader}-review gap — target ${Math.max(1, Math.ceil(reviewGapToLeader / 6))} new 5★ reviews/month.`,
    `Optimize the Google Business Profile + citations to move ${top3 < total * 0.2 ? "into the top 3" : "up"} on the map grid for "${keyword}".`,
    `Add FAQ/entity content and structured data so AI engines cite ${name} for "${keyword}" queries.`,
    `Turn on review responses within 24h to lift trust signals and profile conversion.`,
  ];
  return { insights, fixes };
}

export function reviewGap(competitors: Competitor[], reviewCount: number): number {
  const leader = Math.max(...competitors.filter((c) => !c.isYou).map((c) => c.reviews), reviewCount);
  return Math.max(0, leader - reviewCount);
}
