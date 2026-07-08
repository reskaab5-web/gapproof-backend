// Category demand + keyword mapping (mirrors the frontend demo generator).
export const CATEGORY_DEMAND: Record<string, { demand: number; label: string; kw: string }> = {
  dentist:      { demand: 1900, label: "Dentist",         kw: "dentist near me" },
  medspa:       { demand: 1300, label: "Med Spa",         kw: "med spa" },
  hvac:         { demand: 2400, label: "HVAC Contractor", kw: "hvac repair" },
  plumber:      { demand: 2600, label: "Plumber",         kw: "plumber near me" },
  chiropractor: { demand: 1100, label: "Chiropractor",    kw: "chiropractor" },
  lawyer:       { demand: 1600, label: "Law Firm",        kw: "personal injury lawyer" },
  roofer:       { demand: 1400, label: "Roofing Company", kw: "roofing contractor" },
  salon:        { demand: 1500, label: "Hair Salon",      kw: "hair salon near me" },
  restaurant:   { demand: 3200, label: "Restaurant",      kw: "restaurants near me" },
  auto:         { demand: 2100, label: "Auto Repair",     kw: "auto repair shop" },
  realtor:      { demand: 1200, label: "Real Estate",     kw: "realtor near me" },
  gym:          { demand: 1700, label: "Fitness Studio",  kw: "gym near me" },
  general:      { demand: 1500, label: "Local Business",  kw: "services near me" },
};

// Map a Google "types" array (or a name) to one of our verticals.
export function classify(name: string, googleTypes: string[] = []): keyof typeof CATEGORY_DEMAND {
  const t = googleTypes.join(" ").toLowerCase();
  const typeMap: [string, keyof typeof CATEGORY_DEMAND][] = [
    ["dentist", "dentist"], ["dental", "dentist"],
    ["spa", "medspa"], ["beauty_salon", "salon"], ["hair_care", "salon"],
    ["plumber", "plumber"], ["roofing", "roofer"], ["lawyer", "lawyer"],
    ["physiotherapist", "chiropractor"], ["chiropractor", "chiropractor"],
    ["restaurant", "restaurant"], ["food", "restaurant"], ["cafe", "restaurant"],
    ["car_repair", "auto"], ["real_estate", "realtor"], ["gym", "gym"],
    ["hvac", "hvac"],
  ];
  for (const [k, v] of typeMap) if (t.includes(k)) return v;

  const n = name.toLowerCase();
  const nameMap: [string, keyof typeof CATEGORY_DEMAND][] = [
    ["dent", "dentist"], ["ortho", "dentist"], ["smile", "dentist"],
    ["spa", "medspa"], ["aesthet", "medspa"], ["wellness", "medspa"], ["botox", "medspa"],
    ["hvac", "hvac"], ["heating", "hvac"], ["air", "hvac"], ["cooling", "hvac"],
    ["plumb", "plumber"], ["rooter", "plumber"], ["drain", "plumber"],
    ["chiro", "chiropractor"], ["spine", "chiropractor"],
    ["law", "lawyer"], ["legal", "lawyer"], ["attorney", "lawyer"], ["injury", "lawyer"],
    ["roof", "roofer"], ["salon", "salon"], ["hair", "salon"], ["barber", "salon"], ["beauty", "salon"],
    ["restaurant", "restaurant"], ["grill", "restaurant"], ["cafe", "restaurant"], ["kitchen", "restaurant"], ["pizza", "restaurant"],
    ["auto", "auto"], ["tire", "auto"], ["mechanic", "auto"], ["collision", "auto"],
    ["realty", "realtor"], ["real estate", "realtor"], ["homes", "realtor"],
    ["gym", "gym"], ["fitness", "gym"], ["crossfit", "gym"], ["pilates", "gym"], ["yoga", "gym"],
  ];
  for (const [k, v] of nameMap) if (n.includes(k)) return v;
  return "general";
}

export const env = {
  cacheTtl: () => clampInt(process.env.CACHE_TTL_SECONDS, 86400, 0, 604800),
  allowedOrigins: () => (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()),
};

function clampInt(v: string | undefined, dflt: number, lo: number, hi: number): number {
  const n = parseInt(v || "", 10);
  if (isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
