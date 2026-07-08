import type { BusinessReport, Competitor } from "./types.js";
import type { Ctx } from "./context.js";
import { CATEGORY_DEMAND, classify } from "./config.js";
import { placeDetails, nearbyCompetitors } from "./google.js";
import { geoGridRanks } from "./serpapi.js";
import { aeoChecks } from "./aeo.js";
import { buildRevenueModel } from "./revenue.js";
import { scoreReviews, summarizeGrid, scoreLead, buildNarrative, reviewGap } from "./scoring.js";
import { cacheGet, cacheSet, cacheKey } from "./cache.js";

export async function buildLiveReport(placeId: string, avgCustomerValue: number, ctx: Ctx): Promise<BusinessReport> {
  const key = cacheKey("report", placeId, avgCustomerValue, ctx.gridSize);
  const cached = await cacheGet<BusinessReport>(key);
  if (cached) return cached;

  const warnings: string[] = [];

  const d = await placeDetails(placeId, ctx.googleKey);
  warnings.push(...d.warnings);
  const catKey = classify(d.name, d.types);
  const cat = CATEGORY_DEMAND[catKey];

  const [comps, grid, aeoRes] = await Promise.all([
    nearbyCompetitors(cat.kw, d.location, ctx.gridRadiusMi, d.placeId, ctx.googleKey).catch((e) => {
      warnings.push(`Competitor lookup failed: ${String(e.message || e).slice(0, 120)}`);
      return [] as Awaited<ReturnType<typeof nearbyCompetitors>>;
    }),
    geoGridRanks(cat.kw, d.location, d.placeId, d.name, { serpapiKey: ctx.serpapiKey, gridSize: ctx.gridSize, gridRadiusMi: ctx.gridRadiusMi }),
    aeoChecks(d.name, cat.label, d.city, ctx.llm),
  ]);
  warnings.push(...grid.warnings, ...aeoRes.warnings);

  const top = comps.sort((a, b) => b.reviews - a.reviews).slice(0, 4);
  const competitors: Competitor[] = [
    ...top.map((c) => ({ name: c.name, reviews: c.reviews, rating: c.rating })),
    { name: d.name, reviews: d.reviewCount, rating: d.rating, isYou: true },
  ].sort((a, b) => b.reviews - a.reviews);
  const reviewGapToLeader = reviewGap(competitors, d.reviewCount);

  const { avgRank, top3, visibilityScore } = summarizeGrid(grid.geoGrid);
  const leaderReviews = Math.max(...competitors.filter((c) => !c.isYou).map((c) => c.reviews), d.reviewCount);
  const reviewScore = scoreReviews(d.rating, d.reviewCount, leaderReviews, d.reviewVelocity, d.responseRate);

  let aeoScore = aeoRes.aeoScore;
  if (aeoRes.aeo.length === 0) aeoScore = Math.max(0, visibilityScore - 20);
  const overallScore = Math.round(reviewScore * 0.4 + visibilityScore * 0.4 + aeoScore * 0.2);

  const revenue = buildRevenueModel(avgCustomerValue, cat.demand, avgRank);
  const { leadScore, leadTier } = scoreLead(reviewGapToLeader, avgRank, revenue.monthlyLost);
  const { insights, fixes } = buildNarrative({
    name: d.name, rating: d.rating, reviewGapToLeader, avgRank, top3,
    total: grid.geoGrid.length, keyword: cat.kw, categoryLabel: cat.label,
    aeo: aeoRes.aeo, aeoScore, responseRate: d.responseRate,
  });

  const report: BusinessReport = {
    businessName: d.name, category: cat.label, city: d.city, rating: d.rating,
    reviewCount: d.reviewCount, reviewVelocity: d.reviewVelocity, responseRate: d.responseRate,
    photoCount: d.photoCount, reviewScore, visibilityScore, aeoScore, overallScore,
    geoGrid: grid.geoGrid, avgRank, keyword: cat.kw, competitors, reviewGapToLeader,
    revenue, aeo: aeoRes.aeo, leadScore, leadTier, insights, fixes,
    meta: { source: warnings.length ? "partial" : "live", placeId: d.placeId, generatedAt: new Date().toISOString(), warnings },
  };
  await cacheSet(key, report);
  return report;
}
