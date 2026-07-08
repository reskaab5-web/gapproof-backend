// Google Places API (New). Key is supplied per-request (BYO-key model).
import { fetchJson, type LatLng } from "./util.js";

const BASE = "https://places.googleapis.com/v1";

export interface Suggestion { placeId: string; text: string; }

export async function autocomplete(input: string, apiKey: string): Promise<Suggestion[]> {
  const data = await fetchJson(`${BASE}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({ input, languageCode: "en" }),
  });
  return (data.suggestions || [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({ placeId: p.placeId, text: p.text?.text || "" }));
}

export interface PlaceDetails {
  placeId: string; name: string; rating: number; reviewCount: number;
  location: LatLng; types: string[]; city: string; photoCount: number;
  reviewVelocity: number; responseRate: number; warnings: string[];
}

export async function placeDetails(placeId: string, apiKey: string): Promise<PlaceDetails> {
  const fields = ["id", "displayName", "rating", "userRatingCount", "location", "types", "addressComponents", "photos", "reviews"].join(",");
  const data = await fetchJson(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fields },
  });
  const warnings: string[] = [];
  const comps = data.addressComponents || [];
  const city =
    comps.find((c: any) => (c.types || []).includes("locality"))?.longText ||
    comps.find((c: any) => (c.types || []).includes("postal_town"))?.longText ||
    comps.find((c: any) => (c.types || []).includes("administrative_area_level_2"))?.longText || "";

  const reviews = data.reviews || [];
  const now = Date.now();
  const recent = reviews.filter((r: any) => {
    const t = r.publishTime ? new Date(r.publishTime).getTime() : 0;
    return t && now - t < 30 * 864e5;
  }).length;
  if (reviews.length < 5) warnings.push("Review velocity estimated from a small sample (Places API returns up to 5 reviews).");
  warnings.push("Review response rate is estimated — the Places API does not expose owner replies. Wire a GBP source for exact figures.");

  return {
    placeId: data.id || placeId,
    name: data.displayName?.text || "Business",
    rating: data.rating || 0,
    reviewCount: data.userRatingCount || 0,
    location: { lat: data.location?.latitude, lng: data.location?.longitude },
    types: data.types || [],
    city,
    photoCount: (data.photos || []).length,
    reviewVelocity: recent,
    responseRate: 0.15,
    warnings,
  };
}

export interface CompetitorRaw { placeId: string; name: string; reviews: number; rating: number; }

export async function nearbyCompetitors(
  keyword: string, center: LatLng, radiusMi: number, excludePlaceId: string, apiKey: string
): Promise<CompetitorRaw[]> {
  const data = await fetchJson(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: keyword,
      maxResultCount: 20,
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusMi * 1609.34 } },
    }),
  });
  return (data.places || [])
    .filter((p: any) => p.id !== excludePlaceId && p.userRatingCount)
    .map((p: any) => ({ placeId: p.id, name: p.displayName?.text || "Competitor", reviews: p.userRatingCount || 0, rating: p.rating || 0 }));
}
