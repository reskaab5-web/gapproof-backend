import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, fail } from "../lib/http.js";
import { buildCtx } from "../lib/context.js";
import { autocomplete } from "../lib/google.js";

// Cheaply validates the caller's keys so the onboarding wizard can confirm setup.
// Google: a tiny autocomplete call. SerpApi: the /account endpoint (does NOT consume
// a search credit). Returns per-provider ok/message.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  try {
    const ctx = buildCtx(req);
    const out: Record<string, { ok: boolean; message: string }> = {};

    // Google Places
    if (ctx.googleKey) {
      try {
        await autocomplete("coffee", ctx.googleKey);
        out.google = { ok: true, message: "Google Places key is working." };
      } catch (e: any) {
        out.google = { ok: false, message: cleanErr(e) };
      }
    } else {
      out.google = { ok: false, message: "No Google Places key provided." };
    }

    // SerpApi (account endpoint — no search credit consumed)
    if (ctx.serpapiKey) {
      try {
        const r = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(ctx.serpapiKey)}`);
        if (r.ok) {
          const a = await r.json().catch(() => ({}));
          const left = a?.total_searches_left ?? a?.plan_searches_left;
          out.serpapi = { ok: true, message: left != null ? `SerpApi key valid — ${left} searches left.` : "SerpApi key is valid." };
        } else {
          out.serpapi = { ok: false, message: `SerpApi rejected the key (HTTP ${r.status}).` };
        }
      } catch (e: any) {
        out.serpapi = { ok: false, message: cleanErr(e) };
      }
    } else {
      out.serpapi = { ok: false, message: "No SerpApi key provided." };
    }

    res.status(200).json({ results: out });
  } catch (e: any) {
    fail(res, 500, String(e.message || e));
  }
}

function cleanErr(e: any): string {
  const m = String(e?.message || e);
  if (m.includes("403") || m.toLowerCase().includes("permission")) return "Key rejected (403) — check the key and that Places API (New) is enabled.";
  if (m.includes("400")) return "Bad request — the key may be malformed or missing API access.";
  return m.slice(0, 160);
}
