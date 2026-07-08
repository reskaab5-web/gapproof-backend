// Two-tier cache: Upstash Redis (REST) if configured, else per-lambda memory.
import { env } from "./config.js";

const mem = new Map<string, { v: unknown; exp: number }>();

const UP_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasUpstash = !!(UP_URL && UP_TOKEN);

async function upstash(cmd: (string | number)[]): Promise<any> {
  const res = await fetch(UP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${UP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}`);
  return res.json();
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (hasUpstash) {
      const r = await upstash(["GET", key]);
      return r?.result ? (JSON.parse(r.result) as T) : null;
    }
    const hit = mem.get(key);
    if (hit && hit.exp > Date.now()) return hit.v as T;
    if (hit) mem.delete(key);
    return null;
  } catch {
    return null; // cache must never break the request
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = env.cacheTtl()): Promise<void> {
  try {
    if (ttlSec <= 0) return;
    if (hasUpstash) {
      await upstash(["SET", key, JSON.stringify(value), "EX", ttlSec]);
      return;
    }
    mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  } catch {
    /* ignore */
  }
}

export function cacheKey(...parts: (string | number)[]): string {
  return "rroi:" + parts.map((p) => String(p).toLowerCase().replace(/\s+/g, "-")).join(":");
}
