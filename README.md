## BYO-key model (important)

This backend is built so **each agency brings their own API keys**. You host **one** thin
proxy; every agency that uses the tool enters *their* Google Places, SerpApi, and (optional)
LLM keys in the report tool's **White-label → Your API keys** panel. Those keys are:

- stored only in that agency's **browser** (localStorage), never in your database;
- sent as **request headers** (`x-google-key`, `x-serpapi-key`, `x-openai-key`, …) on each call;
- used by the function **transiently** and never logged or persisted.

The result: **you pay ~$0 in per-report API cost** — every agency pays their own Google/SerpApi
bill. That's what makes a $9–$17 one-time price safe. Your only cost is hosting (Vercel free tier
is plenty) and, optionally, the shared cache (Upstash free tier).

The `.env` keys are an **optional fallback** for your own testing/demo. For resale, leave them
blank and let each agency supply keys. You can hardcode the API base into the tool
(`window.REVIEWROI_API_BASE`) so agencies only ever fill in their keys.

Requests missing the required keys get a clear 400 telling the user to add them in settings.

---

# ReviewROI — Live Data Backend

Serverless backend (Vercel) that powers the ReviewROI report tool with **real** data:
Google Places (New) for the business profile + competitors, **SerpApi** for true Google
Maps map-pack rankings across a geo-grid, optional **LLM** checks for AI-search (AEO)
visibility, a **lead webhook** to your CRM, and response **caching**.

The API key never touches the browser — it lives only in these server functions.

## Endpoints

| Route | Method | Purpose |
|------|--------|---------|
| `/api/autocomplete?q=` | GET | Google Places autocomplete → `{ suggestions: [{ placeId, text }] }` |
| `/api/report` | POST | Full audit. Body: `{ placeId?, name?, avgValue }` → `BusinessReport` |
| `/api/lead` | POST | Forward a captured lead to your CRM webhook |

`/api/report` accepts either a `placeId` (from autocomplete) or a raw `name` (it resolves
the top match). It returns the exact same shape the frontend already renders, plus a
`meta` block with `source: "live" | "partial"` and any `warnings`.

## Quick start

```bash
npm install
cp .env.example .env         # fill in your keys
npx vercel dev               # local dev at http://localhost:3000
```

Then in the report tool, open **White-label → Live data API base URL** and paste your
backend URL (e.g. `http://localhost:3000` locally, or your `*.vercel.app` domain). The
badge flips to **Live** and searches hit real Google data.

## Deploy

```bash
npx vercel            # first deploy (links the project)
npx vercel --prod     # production
```

Add every env var from `.env.example` in **Vercel → Project → Settings → Environment
Variables**, then set the tool's API base to your production URL.

## Environment variables

**Keys (normally supplied per-request via headers; set here only as an optional fallback)**
- `GOOGLE_PLACES_API_KEY` — *Places API (New)*. Each agency enters their own in the tool.
- `SERPAPI_API_KEY` — https://serpapi.com, for true map-pack rank per grid point (agency-supplied).

**Geo-grid tuning**
- `GEO_GRID_SIZE` (default `7`) — N×N points. `7`=49 SerpApi calls/report, `5`=25, `3`=9.
- `GEO_GRID_RADIUS_MI` (default `3`) — half-width of the grid.

**Optional AI-search (only providers with a key run)**
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`
- With no LLM key, the AEO score falls back to a visibility-based proxy and a warning is added.

**Optional lead capture**
- `LEAD_WEBHOOK_URL` — any JSON endpoint (GoHighLevel, HubSpot, Zapier, Make…).

**Optional caching** (else in-memory per-lambda)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — https://upstash.com
- `CACHE_TTL_SECONDS` (default `86400` = 24h)

**CORS**
- `ALLOWED_ORIGINS` — comma-separated origins, or `*` for dev.

## Cost per report (rough)

- Google Places: ~2 calls (Details + Text Search) — pennies, and Google's free tier covers a lot.
- SerpApi: **1 call per grid point** → 49 calls at `GEO_GRID_SIZE=7`. This dominates cost.
  Drop to `5` (25) or `3` (9) to cut it, or lower the radius. Caching means repeat lookups of
  the same business are free within the TTL.
- LLM AEO: 1 short prompt per configured provider (~fractions of a cent each).

Start with `GEO_GRID_SIZE=5` and `CACHE_TTL_SECONDS=86400` to keep spend low while testing.

## Notes / accuracy

- **Review response rate** and **review velocity** are estimated — the Places API returns
  only up to 5 reviews and does not expose owner replies. Both are flagged in `meta.warnings`.
  Wire a GBP data source later for exact figures.
- The revenue model is transparent and identical to the frontend calculator
  (`lib/revenue.ts`): `searches × (top-3 CTR − current CTR) × conversion × value`.
- To swap SerpApi for DataForSEO, reimplement `rankAtPoint()` in `lib/serpapi.ts` — that's
  the only place the rank source is touched.

## Structure

```
api/          autocomplete.ts · report.ts · lead.ts
lib/
  google.ts   Places (New): autocomplete, details, competitors
  serpapi.ts  geo-grid map-pack ranks
  aeo.ts      LLM AI-search checks
  report.ts   assembles everything into a BusinessReport
  revenue.ts  transparent lost-revenue model
  scoring.ts  scores, lead tier, narrative
  cache.ts    Upstash or in-memory
  config.ts   category/keyword map + env
  util.ts     grid math, concurrency, name matching
  http.ts     CORS
  types.ts    shared BusinessReport type
```
