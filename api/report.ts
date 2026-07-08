import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, fail } from "../lib/http.js";
import { buildCtx, missingCoreKeys } from "../lib/context.js";
import { buildLiveReport } from "../lib/report.js";
import { autocomplete } from "../lib/google.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  try {
    const ctx = buildCtx(req);
    const missing = missingCoreKeys(ctx);
    if (missing.length) return fail(res, 400, `Missing API key(s): ${missing.join(", ")}. Add them in the tool settings.`);

    const body = req.method === "POST" ? (req.body ?? {}) : req.query;
    let placeId = (body.placeId as string) || "";
    const name = (body.name as string) || "";
    const avgValue = Math.max(50, Math.min(5000, Number(body.avgValue ?? body.avgCustomerValue ?? 250)));

    if (!placeId && name) {
      const s = await autocomplete(name, ctx.googleKey);
      if (!s.length) return fail(res, 404, `No business found for "${name}".`);
      placeId = s[0].placeId;
    }
    if (!placeId) return fail(res, 400, "Provide a placeId or a business name.");

    res.status(200).json(await buildLiveReport(placeId, avgValue, ctx));
  } catch (e: any) {
    fail(res, 500, String(e.message || e));
  }
}
