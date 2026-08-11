/**
 * Phase 3 aggregation fixtures — no Firestore / production writes.
 *
 * Run: npx tsx scripts/validate-trace-phase3.ts
 */
import {
  aggregateGeographies,
  computeScopeTotals,
  filterRowsByCategories,
  parseCategoriesParam,
  regionGeographyId,
  type AggregateMemoryRow,
} from "../features/world-memory/trace/aggregate";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const fixture: AggregateMemoryRow[] = [
  {
    miavId: "MIAV-000001",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "tokyo",
    regionLabel: "Tokyo",
    cityKey: "tokyo",
    cityLabel: "Tokyo",
    locationId: "JP:tokyo",
  },
  {
    miavId: "MIAV-000001",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "tokyo",
    regionLabel: "Tokyo",
    cityKey: "tokyo",
    cityLabel: "Tokyo",
    locationId: "JP:tokyo",
  },
  {
    miavId: "MIAV-000002",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "tokyo",
    regionLabel: "Tokyo",
    cityKey: "tokyo",
    cityLabel: "Tokyo",
    locationId: "JP:tokyo",
  },
  {
    miavId: "MIAV-000003",
    category: "apps",
    workId: "writer-memo",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:yokohama",
  },
  {
    miavId: "MIAV-000004",
    category: "read",
    workId: "miav-922228",
    countryCode: "FR",
    countryLabel: "France",
    regionKey: "ile-de-france",
    regionLabel: "Île-de-France",
    cityKey: "paris",
    cityLabel: "Paris",
    locationId: "FR:paris",
  },
];

const coords: Record<string, { lat: number; lng: number }> = {
  JP: { lat: 36.2, lng: 138.25 },
  FR: { lat: 46.2, lng: 2.2 },
  [regionGeographyId("JP", "Tokyo")]: { lat: 35.68, lng: 139.76 },
  [regionGeographyId("JP", "Kanagawa")]: { lat: 35.45, lng: 139.64 },
  [regionGeographyId("FR", "Île-de-France")]: { lat: 48.85, lng: 2.35 },
};

const resolve = (id: string) => coords[id] || null;

const worldAll = aggregateGeographies(
  fixture,
  { level: "world" },
  ["read", "play", "apps"],
  resolve,
);
const japan = worldAll.find((g) => g.geographyId === "JP");
const france = worldAll.find((g) => g.geographyId === "FR");
const worldTotals = computeScopeTotals(
  fixture,
  { level: "world" },
  ["read", "play", "apps"],
);

assert(worldAll.length === 2, "world has Japan + France");
assert(japan?.peopleCount === 3, "Japan peopleCount = 3");
assert(japan?.activityCount === 4, "Japan activityCount = 4");
assert(france?.peopleCount === 1, "France peopleCount = 1");
assert(france?.activityCount === 1, "France activityCount = 1");
assert(worldTotals.peopleCount === 4, "world unique people = 4");
assert(worldTotals.activityCount === 5, "world activities = 5");

const playOnly = aggregateGeographies(
  fixture,
  { level: "world" },
  ["play"],
  resolve,
);
const japanPlay = playOnly.find((g) => g.geographyId === "JP");
assert(japanPlay?.peopleCount === 2, "PLAY filter Japan people = 2");
assert(japanPlay?.activityCount === 2, "PLAY filter Japan activities = 2");
assert(!playOnly.some((g) => g.geographyId === "FR"), "PLAY filter hides France");

const japanRegions = aggregateGeographies(
  fixture,
  { level: "country", countryCode: "JP" },
  ["read", "play", "apps"],
  resolve,
);
const tokyo = japanRegions.find((g) => g.label === "Tokyo");
const kanagawa = japanRegions.find((g) => g.label === "Kanagawa");
assert(tokyo?.peopleCount === 2, "Tokyo people = 2");
assert(tokyo?.activityCount === 3, "Tokyo activities = 3");
assert(kanagawa?.peopleCount === 1, "Kanagawa people = 1");
assert(kanagawa?.activityCount === 1, "Kanagawa activities = 1");

// Same person two regions: country unique still 1 for that person alone
const multiRegion: AggregateMemoryRow[] = [
  {
    miavId: "MIAV-000099",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "tokyo",
    regionLabel: "Tokyo",
    cityKey: "tokyo",
    cityLabel: "Tokyo",
    locationId: "JP:tokyo",
  },
  {
    miavId: "MIAV-000099",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:yokohama",
  },
];
const multiWorld = aggregateGeographies(
  multiRegion,
  { level: "world" },
  ["read", "play"],
  resolve,
);
const multiRegions = aggregateGeographies(
  multiRegion,
  { level: "country", countryCode: "JP" },
  ["read", "play"],
  resolve,
);
assert(multiWorld[0]?.peopleCount === 1, "same miavId country people = 1");
assert(multiWorld[0]?.activityCount === 2, "same miavId country activities = 2");
assert(
  multiRegions.every((r) => r.peopleCount === 1),
  "each region counts same person once locally",
);
assert(multiRegions.length === 2, "two regions for one person");

// Legacy uncategorized must not be mixed (simulate by never adding category-less rows)
const withOnlyCategorized = filterRowsByCategories(fixture, ["read"]);
assert(
  withOnlyCategorized.every((r) => r.category === "read"),
  "filter never invents categories",
);

const bad = parseCategoriesParam("read,hack");
assert("error" in bad, "invalid category rejected");
const good = parseCategoriesParam("play,read");
assert(
  !("error" in good) && good.includes("play") && good.includes("read"),
  "valid categories parsed",
);

const emptyCats = aggregateGeographies(
  fixture,
  { level: "world" },
  [],
  resolve,
);
assert(emptyCats.length === 0, "empty category filter yields no markers");

// Category breakdown on Japan
assert(
  japan?.categories.find((c) => c.category === "read")?.peopleCount === 1,
  "Japan READ people = 1",
);
assert(
  japan?.categories.find((c) => c.category === "play")?.peopleCount === 2,
  "Japan PLAY people = 2",
);
assert(
  japan?.categories.find((c) => c.category === "apps")?.peopleCount === 1,
  "Japan APPS people = 1",
);

if (process.exitCode) {
  console.error("\nSome Phase 3 checks failed");
  process.exit(1);
}
console.log("\nAll Phase 3 local checks passed");
