import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, fail } from "../lib/http.js";
import { buildCtx } from "../lib/context.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return fail(res, 405, "POST only");
  try {
    const b = req.body ?? {};
    if (!b.email || !/.+@.+\..+/.test(String(b.email))) return fail(res, 400, "Valid email required.");
    const lead = {
      name: b.name || "", email: b.email, businessName: b.businessName || "", placeId: b.placeId || "",
      leadScore: b.leadScore ?? null, leadTier: b.leadTier || "", reviewGap: b.reviewGap ?? null,
      monthlyLost: b.monthlyLost ?? null, source: "ReviewROI report", capturedAt: new Date().toISOString(),
    };
    const hook = buildCtx(req).leadWebhook;
    let forwarded = false;
    if (hook) {
      const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      forwarded = r.ok;
    }
    res.status(200).json({ ok: true, forwarded, lead });
  } catch (e: any) {
    fail(res, 500, String(e.message || e));
  }
}
