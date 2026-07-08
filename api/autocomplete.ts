import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, fail } from "../lib/http.js";
import { buildCtx } from "../lib/context.js";
import { autocomplete } from "../lib/google.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  try {
    const ctx = buildCtx(req);
    if (!ctx.googleKey) return fail(res, 400, "Add your Google Places API key in the tool settings.");
    const q = (req.query.q as string) || (req.query.input as string) || "";
    if (q.trim().length < 2) return res.status(200).json({ suggestions: [] });
    res.status(200).json({ suggestions: await autocomplete(q.trim(), ctx.googleKey) });
  } catch (e: any) {
    fail(res, 500, String(e.message || e));
  }
}
