/**
 * Work filter aggregation + catalog validation (no Firestore / production).
 *
 * Run: npx tsx scripts/validate-trace-work-filter.ts
 */
import {
  aggregateGeographies,
  computeScopeTotals,
  filterRowsByWorkIds,
  type AggregateMemoryRow,
} from "../features/world-memory/trace/aggregate";
import { rowFromCategorizedPin } from "../features/world-memory/trace/aggregateRows";
import { resolveInitialMapFilter } from "../features/world-memory/map/mapFilter";
import {
  getWorkById,
  listEnabledWorkIds,
  parseWorkIdsParam,
  validateCategoryWork,
} from "../features/world-memory/trace/works";
import type { TracePin } from "../features/world-memory/trace/types";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok  ", label);
  }
}

const ALL = ["read", "play", "apps"] as const;
const ALL_WORKS = listEnabledWorkIds();
const resolve = () => ({ lat: 35.68, lng: 139.76 });

// Catalog
const japan = getWorkById("japan-8000hz");
assert(Boolean(japan?.enabled), "japan-8000hz READ enabled");
assert(japan?.category === "read", "japan-8000hz category read");
const fourth = getWorkById("fourth-period");
assert(Boolean(fourth?.enabled), "fourth-period exists enabled");
assert(fourth?.category === "read", "fourth-period category = read");
assert(Boolean(fourth?.markerColor), "fourth-period has markerColor");
const luminous = getWorkById("luminous-structure");
assert(luminous?.enabled === false, "luminous-structure disabled");

const readWorks = listEnabledWorkIds().filter(
  (id) => getWorkById(id)?.category === "read",
);
assert(readWorks.includes("miav-922228"), "READ has miav-922228");
assert(readWorks.includes("japan-8000hz"), "READ has japan-8000hz");
assert(readWorks.includes("fourth-period"), "READ has fourth-period");
assert(readWorks.length === 3, "READ enabled works = 3");

// parseWorkIdsParam
const allParsed = parseWorkIdsParam(null, ALL);
assert(!("error" in allParsed), "empty workIds → all enabled in categories");
assert(
  !("error" in allParsed) && allParsed.includes("japan-8000hz"),
  "default includes japan-8000hz",
);
assert(
  !("error" in allParsed) && allParsed.includes("fourth-period"),
  "default includes fourth-period",
);

const known = parseWorkIdsParam("japan-8000hz,binary-block", ALL);
assert(
  !("error" in known) &&
    known.includes("japan-8000hz") &&
    known.includes("binary-block"),
  "known work filter",
);

const fourthOnly = parseWorkIdsParam("fourth-period", ["read"]);
assert(
  !("error" in fourthOnly) &&
    fourthOnly.length === 1 &&
    fourthOnly[0] === "fourth-period",
  "Fourth Period only filter",
);

const fourthJapan = parseWorkIdsParam("fourth-period,japan-8000hz", ["read"]);
assert(
  !("error" in fourthJapan) &&
    fourthJapan.includes("fourth-period") &&
    fourthJapan.includes("japan-8000hz") &&
    fourthJapan.length === 2,
  "Fourth Period + JAPAN 8000Hz filter",
);

const allRead = parseWorkIdsParam(
  "miav-922228,japan-8000hz,fourth-period",
  ["read"],
);
assert(
  !("error" in allRead) && allRead.length === 3,
  "all 3 READ works filter",
);

const unknown = parseWorkIdsParam("unknown-work", ALL);
assert("error" in unknown, "unknown workId → error");

const disabled = parseWorkIdsParam("luminous-structure", ALL);
assert("error" in disabled, "disabled work filter → error");

const mismatch = parseWorkIdsParam("japan-8000hz", ["play"]);
assert("error" in mismatch, "work/category mismatch → error");

// Deep-link helper
const dlKnown = resolveInitialMapFilter("japan-8000hz");
assert(
  dlKnown.workIds.length === 1 && dlKnown.workIds[0] === "japan-8000hz",
  "deep-link known work",
);
assert(dlKnown.formWorkId === "japan-8000hz", "deep-link form preselect");

const dlFourth = resolveInitialMapFilter("fourth-period");
assert(
  dlFourth.workIds.length === 1 && dlFourth.workIds[0] === "fourth-period",
  "Fourth Period deep-link",
);
assert(dlFourth.formWorkId === "fourth-period", "Fourth Period form preselect");

const dlUnknown = resolveInitialMapFilter("unknown");
assert(
  dlUnknown.workIds.length === ALL_WORKS.length,
  "deep-link unknown → default all",
);

const dlLuminous = resolveInitialMapFilter("luminous-structure");
assert(
  dlLuminous.workIds.length === ALL_WORKS.length,
  "deep-link disabled luminous → default",
);

// POST validation
const postOk = validateCategoryWork("read", "japan-8000hz");
assert(postOk.ok === true, "POST validate japan-8000hz");
const postFourth = validateCategoryWork("read", "fourth-period");
assert(postFourth.ok === true, "POST validate fourth-period");

const postDisabled = validateCategoryWork("play", "luminous-structure");
assert(postDisabled.ok === false, "POST reject luminous");

// Aggregation fixture — same person, two works, one city
const yokohama: AggregateMemoryRow[] = [
  {
    miavId: "MIAV-000200",
    category: "read",
    workId: "japan-8000hz",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
  {
    miavId: "MIAV-000200",
    category: "play",
    workId: "binary-block",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
  {
    miavId: "MIAV-000201",
    category: "apps",
    workId: "writer-memo",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
];

const twoWorks = ["japan-8000hz", "binary-block"] as const;
const cityAll = aggregateGeographies(
  yokohama,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ALL,
  ALL_WORKS,
  resolve,
);
const yokohamaGeo = cityAll.find((g) => g.label === "Yokohama");
assert(yokohamaGeo?.peopleCount === 2, "city all works people = 2");
assert(yokohamaGeo?.activityCount === 3, "city all works activities = 3");

const cityTwoWorks = aggregateGeographies(
  yokohama,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ALL,
  [...twoWorks],
  resolve,
);
const yokohamaTwo = cityTwoWorks.find((g) => g.label === "Yokohama");
assert(yokohamaTwo?.peopleCount === 1, "same user two works → 1 person");
assert(yokohamaTwo?.activityCount === 2, "same user two works → 2 activities");

const readOnly = aggregateGeographies(
  yokohama,
  { level: "world" },
  ["read"],
  ["japan-8000hz"],
  () => ({ lat: 36.2, lng: 138.25 }),
);
assert(readOnly[0]?.peopleCount === 1, "READ work-only world filter");

// Same MIAV ID / 3 READ works → 1 person / 3 activities
const threeRead: AggregateMemoryRow[] = [
  {
    miavId: "MIAV-000001",
    category: "read",
    workId: "miav-922228",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
  {
    miavId: "MIAV-000001",
    category: "read",
    workId: "japan-8000hz",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
  {
    miavId: "MIAV-000001",
    category: "read",
    workId: "fourth-period",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
];
const threeReadWorks = ["miav-922228", "japan-8000hz", "fourth-period"];
const threeAgg = aggregateGeographies(
  threeRead,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ["read"],
  threeReadWorks,
  resolve,
);
const threeCity = threeAgg.find((g) => g.label === "Yokohama");
assert(threeCity?.peopleCount === 1, "same MIAV ID / 3 READ → 1 person");
assert(threeCity?.activityCount === 3, "same MIAV ID / 3 READ → 3 activities");
const threeBreakdown =
  threeCity?.categories.find((c) => c.category === "read")?.works ?? [];
assert(threeBreakdown.length === 3, "3 READ work breakdown rows");
assert(
  threeBreakdown.every((w) => w.peopleCount === 1 && w.activityCount === 1),
  "each READ work breakdown 1 person · 1 activity",
);

// Fourth Period only filter — hides other READ works
const fourthOnlyAgg = aggregateGeographies(
  threeRead,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ["read"],
  ["fourth-period"],
  resolve,
);
const fourthCity = fourthOnlyAgg.find((g) => g.label === "Yokohama");
assert(fourthCity?.peopleCount === 1, "Fourth Period only people = 1");
assert(fourthCity?.activityCount === 1, "Fourth Period only activities = 1");
assert(
  Boolean(
    fourthCity?.categories.every((c) =>
      c.works.every((w) => w.workId === "fourth-period"),
    ),
  ),
  "Fourth Period only stars / breakdown",
);

// Cross-user Fourth Period same city
const crossFourth: AggregateMemoryRow[] = [
  {
    miavId: "MIAV-000001",
    category: "read",
    workId: "fourth-period",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
  {
    miavId: "MIAV-000002",
    category: "read",
    workId: "fourth-period",
    countryCode: "JP",
    countryLabel: "Japan",
    regionKey: "kanagawa",
    regionLabel: "Kanagawa",
    cityKey: "yokohama",
    cityLabel: "Yokohama",
    locationId: "JP:kanagawa:yokohama",
  },
];
const crossAgg = aggregateGeographies(
  crossFourth,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ["read"],
  ["fourth-period"],
  resolve,
);
const crossCity = crossAgg.find((g) => g.label === "Yokohama");
assert(crossCity?.peopleCount === 2, "cross-user Fourth Period people = 2");
assert(
  crossCity?.activityCount === 2,
  "cross-user Fourth Period activities = 2",
);
const crossWork = crossCity?.categories
  .flatMap((c) => c.works)
  .find((w) => w.workId === "fourth-period");
assert(crossWork?.peopleCount === 2, "Fourth Period breakdown people = 2");
assert(
  crossWork?.activityCount === 2,
  "Fourth Period breakdown activities = 2",
);

// Fourth Period City Memories filter contract (workIds)
const cityMemoriesFilter = parseWorkIdsParam("fourth-period", ["read"]);
assert(
  !("error" in cityMemoriesFilter) &&
    cityMemoriesFilter[0] === "fourth-period",
  "Fourth Period City Memories workIds",
);

// Legacy exclusion
const legacyPin: TracePin = {
  miavId: "MIAV-000999",
  message: "Earlier",
  country: "Japan",
  region: "",
  city: "Tokyo",
  locationId: "JP:tokyo:shinjuku",
  lat: 35.69,
  lng: 139.7,
  createdAt: new Date().toISOString(),
  authType: "google",
};
assert(rowFromCategorizedPin(legacyPin) === null, "legacy uncategorized excluded");

// Work breakdown present
const breakdown = yokohamaGeo?.categories.flatMap((c) => c.works) ?? [];
assert(
  breakdown.some((w) => w.workId === "japan-8000hz"),
  "breakdown includes japan-8000hz",
);

const filteredRows = filterRowsByWorkIds(yokohama, ["binary-block"]);
assert(filteredRows.length === 1, "filterRowsByWorkIds");

const totals = computeScopeTotals(
  yokohama,
  {
    level: "region",
    countryCode: "JP",
    regionLabel: "Kanagawa",
  },
  ALL,
  [...twoWorks],
);
assert(totals.peopleCount === 1, "scope totals dedup two works");
assert(totals.activityCount === 2, "scope totals activity count");

console.log(
  process.exitCode ? "validate-trace-work-filter: FAILED" : "validate-trace-work-filter: OK",
);
