import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./config.js";

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origins = env.allowedOrigins();
  const origin = (req.headers.origin as string) || "";
  const allow = origins.includes("*") ? "*" : origins.includes(origin) ? origin : origins[0] || "";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function fail(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}
