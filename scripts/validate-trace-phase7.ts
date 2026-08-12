/**
 * Phase 7 — City drill-down aggregation fixtures (no Firestore / production).
 *
 * Run: npx tsx scripts/validate-trace-phase7.ts
 */
import {
  aggregateGeographies,
  cityGeographyId,
  computeScopeTotals,
  filterRowsByCategories,
  parseCategoriesParam,
  regionGeographyId,
  type AggregateMemoryRow,
} from "../features/world-memory/trace/aggregate";
import { rowFromCategorizedPin } from "../features/world-memory/trace/aggregateRows";
import { TRACE_PUBLIC_FORBIDDEN_KEYS } from "../features/world-memory/trace/privacy";
import type { TracePin } from "../features/world-memory/trace/types";
import { getWorkById, listEnabledWorkIds } from "../features/world-memory/trace/works";
import {
  buildLocationId,
  findCountry,
  findRegion,
  findCity,
} from "../features/world-memory/location/locations";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const SHINJUKU = buildLocationId("JP", "Tokyo", "Shinjuku");
const YOKOHAMA = buildLocationId("JP", "Kanagawa", "Yokohama");
const PARIS = buildLocationId("FR", "Île-de-France", "Paris");

assert(SHINJUKU === "JP:tokyo:shinjuku", "catalog Shinjuku id");
assert(YOKOHAMA === "JP:kanagawa:yokohama", "catalog Yokohama id");
assert(PARIS === "FR:ile-de-france:paris", "catalog Paris id");

function row(partial: {
  miavId: string;
  category: "read" | "play" | "apps";
  workId: string;
  countryCode: string;
  countryLabel: string;
  regionLabel: string;
  cityLabel: string;
  locationId: string;
}): AggregateMemoryRow {
  return {
    miavId: partial.miavId,
    category: partial.category,
    workId: partial.workId,
    countryCode: partial.countryCode,
    countryLabel: partial.countryLabel,
    regionKey: partial.regionLabel
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    regionLabel: partial.regionLabel,
    cityKey: partial.cityLabel
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    cityLabel: partial.cityLabel,
    locationId: partial.locationId,
  };
}

/** Spec fixture §26 (+ cross-city same person §32). */
const fixture: AggregateMemoryRow[] = [
  row({
    miavId: "MIAV-000001",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Tokyo",
    cityLabel: "Shinjuku",
    locationId: SHINJUKU,
  }),
  row({
    miavId: "MIAV-000001",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Tokyo",
    cityLabel: "Shinjuku",
    locationId: SHINJUKU,
  }),
  row({
    miavId: "MIAV-000002",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Tokyo",
    cityLabel: "Shinjuku",
    locationId: SHINJUKU,
  }),
  row({
    miavId: "MIAV-000003",
    category: "apps",
    workId: "writer-memo",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Kanagawa",
    cityLabel: "Yokohama",
    locationId: YOKOHAMA,
  }),
  row({
    miavId: "MIAV-000004",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Kanagawa",
    cityLabel: "Yokohama",
    locationId: YOKOHAMA,
  }),
  row({
    miavId: "MIAV-000005",
    category: "read",
    workId: "miav-922228",
    countryCode: "FR",
    countryLabel: "France",
    regionLabel: "Île-de-France",
    cityLabel: "Paris",
    locationId: PARIS,
  }),
];

const crossCity: AggregateMemoryRow[] = [
  row({
    miavId: "MIAV-000099",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Tokyo",
    cityLabel: "Shinjuku",
    locationId: SHINJUKU,
  }),
  row({
    miavId: "MIAV-000099",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionLabel: "Kanagawa",
    cityLabel: "Yokohama",
    locationId: YOKOHAMA,
  }),
];

const coords: Record<string, { lat: number; lng: number }> = {
  JP: { lat: 36.2, lng: 138.25 },
  FR: { lat: 46.2, lng: 2.2 },
  [regionGeographyId("JP", "Tokyo")]: { lat: 35.68, lng: 139.76 },
  [regionGeographyId("JP", "Kanagawa")]: { lat: 35.45, lng: 139.64 },
  [regionGeographyId("FR", "Île-de-France")]: { lat: 48.85, lng: 2.35 },
  [SHINJUKU]: { lat: 35.6938, lng: 139.7034 },
  [YOKOHAMA]: { lat: 35.4437, lng: 139.638 },
  [PARIS]: { lat: 48.8566, lng: 2.3522 },
};

const resolve = (id: string) => coords[id] || null;

const ALL = ["read", "play", "apps"] as const;
const ALL_WORKS = listEnabledWorkIds();

// A — World
const world = aggregateGeographies(fixture, { level: "world" }, ALL, ALL_WORKS, resolve);
const japan = world.find((g) => g.geographyId === "JP");
const france = world.find((g) => g.geographyId === "FR");
const worldTotals = computeScopeTotals(fixture, { level: "world" }, ALL, ALL_WORKS);

assert(world.length === 2, "A world has Japan + France");
assert(japan?.peopleCount === 4, "A Japan people = 4");
assert(
  japan?.activityCount === 5,
  "A Japan activities = 5 (spec §26 rows; not sum of city people)",
);
assert(france?.peopleCount === 1, "A France people = 1");
assert(france?.activityCount === 1, "A France activities = 1");
assert(worldTotals.peopleCount === 5, "A world unique people = 5");
assert(worldTotals.activityCount === 6, "A world activities = 6");

// B — Country (Japan regions)
const japanRegions = aggregateGeographies(
  fixture,
  { level: "country", countryCode: "JP" },
  ALL,
  ALL_WORKS,
  resolve,
);
const tokyo = japanRegions.find((g) => g.label === "Tokyo");
const kanagawa = japanRegions.find((g) => g.label === "Kanagawa");
assert(tokyo?.peopleCount === 2, "B Tokyo people = 2");
assert(tokyo?.activityCount === 3, "B Tokyo activities = 3");
assert(kanagawa?.peopleCount === 2, "B Kanagawa people = 2");
assert(kanagawa?.activityCount === 2, "B Kanagawa activities = 2");
assert(
  computeScopeTotals(fixture, { level: "country", countryCode: "JP" }, ALL, ALL_WORKS)
    .peopleCount === 4,
  "B Japan scope totals people = 4 (not 2+2)",
);

// C — Region → City (Tokyo)
const tokyoCities = aggregateGeographies(
  fixture,
  { level: "region", countryCode: "JP", regionLabel: "Tokyo" },
  ALL,
  ALL_WORKS,
  resolve,
);
const shinjuku = tokyoCities.find((g) => g.label === "Shinjuku");
assert(tokyoCities.length === 1, "C Tokyo has one city marker");
assert(shinjuku?.peopleCount === 2, "C Shinjuku people = 2");
assert(shinjuku?.activityCount === 3, "C Shinjuku activities = 3");
assert(shinjuku?.geographyId === SHINJUKU, "C Shinjuku uses catalog id");
assert(shinjuku?.regionLabel === "Tokyo", "C city carries regionLabel");

// D — Region → City (Kanagawa)
const kanagawaCities = aggregateGeographies(
  fixture,
  { level: "region", countryCode: "JP", regionLabel: "Kanagawa" },
  ALL,
  ALL_WORKS,
  resolve,
);
const yokohama = kanagawaCities.find((g) => g.label === "Yokohama");
assert(yokohama?.peopleCount === 2, "D Yokohama people = 2");
assert(yokohama?.activityCount === 2, "D Yokohama activities = 2");
assert(yokohama?.geographyId === YOKOHAMA, "D Yokohama uses catalog id");

// E / H — unique people dedup + cross-city same person
const crossWorld = aggregateGeographies(
  crossCity,
  { level: "world" },
  ["read", "play"],
  ALL_WORKS,
  resolve,
);
const crossRegions = aggregateGeographies(
  crossCity,
  { level: "country", countryCode: "JP" },
  ["read", "play"],
  ALL_WORKS,
  resolve,
);
const crossTokyo = aggregateGeographies(
  crossCity,
  { level: "region", countryCode: "JP", regionLabel: "Tokyo" },
  ["read", "play"],
  ALL_WORKS,
  resolve,
);
const crossKanagawa = aggregateGeographies(
  crossCity,
  { level: "region", countryCode: "JP", regionLabel: "Kanagawa" },
  ["read", "play"],
  ALL_WORKS,
  resolve,
);
assert(crossWorld[0]?.peopleCount === 1, "E/H country people = 1 across cities");
assert(crossWorld[0]?.activityCount === 2, "E/H country activities = 2");
assert(crossRegions.length === 2, "E/H two regions");
assert(
  crossRegions.every((r) => r.peopleCount === 1),
  "E/H each region local people = 1",
);
assert(crossTokyo[0]?.peopleCount === 1, "H Shinjuku people = 1");
assert(crossKanagawa[0]?.peopleCount === 1, "H Yokohama people = 1");

// F — activity count (same user multi-category)
assert(
  shinjuku?.categories.find((c) => c.category === "read")?.activityCount === 1,
  "F Shinjuku READ activities = 1",
);
assert(
  shinjuku?.categories.find((c) => c.category === "play")?.activityCount === 2,
  "F Shinjuku PLAY activities = 2",
);

// G — PLAY-only filter
const playTokyo = aggregateGeographies(
  fixture,
  { level: "region", countryCode: "JP", regionLabel: "Tokyo" },
  ["play"],
  ALL_WORKS,
  resolve,
);
const playKanagawa = aggregateGeographies(
  fixture,
  { level: "region", countryCode: "JP", regionLabel: "Kanagawa" },
  ["play"],
  ALL_WORKS,
  resolve,
);
assert(playTokyo[0]?.peopleCount === 2, "G PLAY Shinjuku people = 2");
assert(playTokyo[0]?.activityCount === 2, "G PLAY Shinjuku activities = 2");
assert(playKanagawa.length === 0, "G PLAY Yokohama empty");

const emptyCats = aggregateGeographies(
  fixture,
  { level: "world" },
  [],
  ALL_WORKS,
  resolve,
);
assert(emptyCats.length === 0, "G empty filter → no markers");

// I — City memories filter (simulate listMemoriesForGeography matching)
function memoriesForCity(
  pins: TracePin[],
  opts: {
    countryCode: string;
    regionLabel: string;
    cityLabel: string;
    categories: ("read" | "play" | "apps")[];
  },
): TracePin[] {
  const code = opts.countryCode.toUpperCase();
  const catSet = new Set(opts.categories);
  const regionQ = opts.regionLabel.trim().toLowerCase();
  const cityQ = opts.cityLabel.trim().toLowerCase();
  return pins.filter((pin) => {
    if (!pin.category || !catSet.has(pin.category)) return false;
    const r = rowFromCategorizedPin(pin);
    if (!r) return false;
    if (r.countryCode !== code) return false;
    if (r.regionLabel.toLowerCase() !== regionQ) return false;
    if (r.cityLabel.toLowerCase() !== cityQ) return false;
    return true;
  });
}

const memoryPins: TracePin[] = [
  {
    miavId: "MIAV-000001",
    authType: "google",
    category: "read",
    workId: "miav-922228",
    locationId: SHINJUKU,
    country: "Japan",
    region: "Tokyo",
    city: "Shinjuku",
    lat: 35.6938,
    lng: 139.7034,
    message: "read note",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    miavId: "MIAV-000001",
    authType: "google",
    category: "play",
    workId: "binary-block",
    locationId: SHINJUKU,
    country: "Japan",
    region: "Tokyo",
    city: "Shinjuku",
    lat: 35.6938,
    lng: 139.7034,
    message: "play note",
    createdAt: "2026-08-02T00:00:00.000Z",
  },
  {
    miavId: "MIAV-000003",
    authType: "google",
    category: "apps",
    workId: "writer-memo",
    locationId: YOKOHAMA,
    country: "Japan",
    region: "Kanagawa",
    city: "Yokohama",
    lat: 35.4437,
    lng: 139.638,
    message: "apps note",
    createdAt: "2026-08-03T00:00:00.000Z",
  },
];

const shinjukuReadPlay = memoriesForCity(memoryPins, {
  countryCode: "JP",
  regionLabel: "Tokyo",
  cityLabel: "Shinjuku",
  categories: ["read", "play"],
});
assert(shinjukuReadPlay.length === 2, "I Shinjuku READ+PLAY memories = 2");
assert(
  shinjukuReadPlay.every((p) => p.category === "read" || p.category === "play"),
  "I no APPS mixed into READ+PLAY city memories",
);
assert(
  memoriesForCity(memoryPins, {
    countryCode: "JP",
    regionLabel: "Tokyo",
    cityLabel: "Shinjuku",
    categories: ["apps"],
  }).length === 0,
  "I APPS filter on Shinjuku empty",
);

// J — invalid query
const badCat = parseCategoriesParam("read,hack");
assert("error" in badCat, "J unknown category rejected");
assert(!findCountry("ZZ"), "J invalid country unknown");
const jp = findCountry("JP");
assert(Boolean(jp), "J Japan found");
assert(jp ? !findRegion(jp, "NotARegion") : false, "J invalid region unknown");
assert(
  jp
    ? (() => {
        const tokyoRegion = findRegion(jp, "Tokyo");
        return tokyoRegion ? !findCity(tokyoRegion, "NotACity") : false;
      })()
    : false,
  "J invalid city unknown",
);
assert(
  cityGeographyId("JP", "Tokyo", "Shinjuku", SHINJUKU) === SHINJUKU,
  "J cityGeographyId prefers catalog locationId",
);

// K — legacy exclusion (uncategorized never enters AggregateMemoryRow pipeline)
const legacyPin: TracePin = {
  miavId: "MIAV-LEGACY",
  authType: "guest",
  category: undefined,
  workId: undefined,
  locationId: "JP:tokyo",
  country: "Japan",
  region: "",
  city: "Tokyo",
  lat: 35.68,
  lng: 139.76,
  message: "earlier",
  createdAt: "2020-01-01T00:00:00.000Z",
};
assert(rowFromCategorizedPin(legacyPin) === null, "K legacy pin excluded");
assert(
  filterRowsByCategories(fixture, ["read"]).every((r) => r.category === "read"),
  "K filter never invents categories",
);

// L — privacy: public pin shape + forbidden keys
for (const pin of memoryPins) {
  const keys = Object.keys(pin);
  for (const forbidden of TRACE_PUBLIC_FORBIDDEN_KEYS) {
    assert(!keys.includes(forbidden), `L pin lacks ${forbidden}`);
  }
  assert(!("email" in pin), "L no email");
  assert(!("token" in pin), "L no token");
}
assert(
  !("uid" in (rowFromCategorizedPin(memoryPins[0]!) || {})),
  "L aggregate row has no uid",
);

// Work future-proof: works[] retained; luminous disabled
assert(
  shinjuku?.categories
    .find((c) => c.category === "play")
    ?.works.some((w) => w.workId === "binary-block") === true,
  "works breakdown kept on city aggregate",
);
assert(getWorkById("luminous-structure")?.enabled === false, "Luminous disabled");

if (process.exitCode) {
  console.error("\nSome Phase 7 checks failed");
  process.exit(1);
}
console.log("\nAll Phase 7 local checks passed");
