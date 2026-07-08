// Per-request key resolution for the BYO-key model.
// Each agency supplies their OWN keys from the tool's settings; the frontend sends
// them as request headers. Env vars act only as an optional fallback (e.g. your own
// use or a demo deployment). Keys are used transiently and never persisted or logged.
import type { VercelRequest } from "@vercel/node";

export interface Ctx {
  googleKey: string;
  serpapiKey: string;
  llm: { openai: string; anthropic: string; perplexity: string; gemini: string };
  gridSize: number;
  gridRadiusMi: number;
  leadWebhook: string;
}

function hdr(req: VercelRequest, name: string): string {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v) || "";
}
function clampInt(v: string, dflt: number, lo: number, hi: number): number {
  const n = parseInt(v, 10);
  return isNaN(n) ? dflt : Math.max(lo, Math.min(hi, n));
}

export function buildCtx(req: VercelRequest): Ctx {
  return {
    googleKey: hdr(req, "x-google-key") || process.env.GOOGLE_PLACES_API_KEY || "",
    serpapiKey: hdr(req, "x-serpapi-key") || process.env.SERPAPI_API_KEY || "",
    llm: {
      openai: hdr(req, "x-openai-key") || process.env.OPENAI_API_KEY || "",
      anthropic: hdr(req, "x-anthropic-key") || process.env.ANTHROPIC_API_KEY || "",
      perplexity: hdr(req, "x-perplexity-key") || process.env.PERPLEXITY_API_KEY || "",
      gemini: hdr(req, "x-gemini-key") || process.env.GEMINI_API_KEY || "",
    },
    gridSize: clampInt(hdr(req, "x-grid-size") || process.env.GEO_GRID_SIZE || "", 5, 3, 9),
    gridRadiusMi: Number(hdr(req, "x-grid-radius") || process.env.GEO_GRID_RADIUS_MI || 3),
    leadWebhook: hdr(req, "x-lead-webhook") || process.env.LEAD_WEBHOOK_URL || "",
  };
}

// Returns the human-readable names of any missing REQUIRED keys.
export function missingCoreKeys(ctx: Ctx): string[] {
  const missing: string[] = [];
  if (!ctx.googleKey) missing.push("Google Places");
  if (!ctx.serpapiKey) missing.push("SerpApi");
  return missing;
}
