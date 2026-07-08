import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./config.js";

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origins = env.allowedOrigins();
  const origin = (req.headers.origin as string) || "";
  const allow = origins.includes("*") ? "*" : origins.includes(origin) ? origin : origins[0] || "";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  const requested = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    (Array.isArray(requested) ? requested[0] : requested) ||
      "Content-Type, x-google-key, x-serpapi-key, x-openai-key, x-anthropic-key, x-perplexity-key, x-gemini-key, x-lead-webhook, x-grid-size, x-grid-radius",
  );
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function fail(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}
