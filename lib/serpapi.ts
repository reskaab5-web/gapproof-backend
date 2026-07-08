// True Google Maps map-pack rank per grid point via SerpApi. Key supplied per-request.
import type { GeoPoint } from "./types.js";
import { buildGrid, mapLimit, nameMatches, fetchJson, type LatLng } from "./util.js";

const RESULTS_SCAN = 20;

async function rankAtPoint(keyword: string, pt: LatLng, placeId: string, name: string, apiKey: string): Promise<number | null> {
  const params = new URLSearchParams({
    engine: "google_maps", type: "search", q: keyword,
    ll: `@${pt.lat},${pt.lng},14z`, api_key: apiKey,
  });
  try {
    const data = await fetchJson(`https://serpapi.com/search.json?${params.toString()}`, {}, 15000);
    const results: any[] = data.local_results || [];
    for (let i = 0; i < Math.min(results.length, RESULTS_SCAN); i++) {
      const r = results[i];
      if ((r.place_id && placeId && r.place_id === placeId) || nameMatches(name, r.title || "")) {
        return r.position || i + 1;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function geoGridRanks(
  keyword: string, center: LatLng, placeId: string, name: string,
  opts: { serpapiKey: string; gridSize: number; gridRadiusMi: number }
): Promise<{ geoGrid: GeoPoint[]; warnings: string[] }> {
  const grid = buildGrid(center, opts.gridSize, opts.gridRadiusMi);
  const warnings: string[] = [];
  if (!opts.serpapiKey) {
    warnings.push("No SerpApi key — geo-grid ranking unavailable.");
    return { geoGrid: grid.map(() => ({ rank: null })), warnings };
  }
  const ranks = await mapLimit(grid, 6, (pt) => rankAtPoint(keyword, pt, placeId, name, opts.serpapiKey));
  if (ranks.every((r) => r === null)) warnings.push("All geo-grid points returned no rank — check the SerpApi key/quota or the keyword.");
  return { geoGrid: ranks.map((r) => ({ rank: r })), warnings };
}
