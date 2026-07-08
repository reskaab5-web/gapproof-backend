export interface LatLng { lat: number; lng: number; }

// Build an N x N grid of coordinates centered on `c`, spanning +/- radiusMi.
export function buildGrid(c: LatLng, n: number, radiusMi: number): LatLng[] {
  const latDegPerMi = 1 / 69;
  const lngDegPerMi = 1 / (69 * Math.cos((c.lat * Math.PI) / 180) || 1);
  const pts: LatLng[] = [];
  const half = (n - 1) / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dxMi = ((x - half) / half) * radiusMi;
      const dyMi = ((half - y) / half) * radiusMi; // top row = north
      pts.push({ lat: c.lat + dyMi * latDegPerMi, lng: c.lng + dxMi * lngDegPerMi });
    }
  }
  return pts;
}

// Run async tasks with bounded concurrency, preserving order.
export async function mapLimit<T, R>(
  items: T[], limit: number, fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const cur = idx++;
      out[cur] = await fn(items[cur], cur);
    }
  });
  await Promise.all(workers);
  return out;
}

// Loose match: does an AI answer / result title refer to this business?
export function nameMatches(target: string, candidate: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b(the|inc|llc|co|company|group|clinic|and)\b/g, " ").replace(/\s+/g, " ").trim();
  const a = norm(target);
  const b = norm(candidate);
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b)) return true;
  const aw = a.split(" ").filter((w) => w.length > 3);
  const bw = new Set(b.split(" "));
  const overlap = aw.filter((w) => bw.has(w)).length;
  return aw.length > 0 && overlap / aw.length >= 0.6;
}

export function fetchJson(url: string, init?: RequestInit, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...init, signal: ctrl.signal })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url.split("?")[0]}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    })
    .finally(() => clearTimeout(t));
}
