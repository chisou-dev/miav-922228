import "server-only";

import {
  aggregateGeographies,
  computeScopeTotals,
  regionGeographyId,
  type AggregateMemoryRow,
  type AggregateScope,
  type GeographyAggregate,
} from "@/features/world-memory/trace/aggregate";
import {
  findCountry,
  findRegion,
  getLocationById,
} from "@/features/world-memory/location/locations";
import { getPlaceById } from "@/features/world-memory/location/places";
import {
  isTraceCategory,
  type TraceCategory,
} from "@/features/world-memory/trace/works";
import type { TracePin } from "@/features/world-memory/trace/types";

type CacheEntry = {
  at: number;
  rows: AggregateMemoryRow[];
  pins: TracePin[];
};

const CACHE_TTL_MS = 30_000;
let cache: CacheEntry | null = null;

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve country code + region labels from catalog — never invent category.
 * Returns null when the row cannot be placed safely on the geography map.
 */
export function rowFromCategorizedPin(pin: TracePin): AggregateMemoryRow | null {
  if (!pin.category || !isTraceCategory(pin.category) || !pin.workId) {
    return null;
  }
  if (!pin.miavId?.startsWith("MIAV-")) return null;

  let countryCode = "";
  let countryLabel = pin.country || "";
  let regionLabel = pin.region || "";

  if (pin.locationId) {
    const loc = getLocationById(pin.locationId);
    if (loc) {
      countryCode = loc.countryCode;
      countryLabel = loc.country;
      if (!regionLabel) regionLabel = loc.region;
    } else {
      const place = getPlaceById(pin.locationId);
      if (place) {
        countryLabel = place.country || countryLabel;
        const fromPlace = findCountry(place.country);
        if (fromPlace) countryCode = fromPlace.code;
        const prefix = pin.locationId.split(":")[0]?.toUpperCase();
        if (!countryCode && prefix && /^[A-Z]{2}$/.test(prefix)) {
          countryCode = prefix;
        }
      }
    }
  }

  if (!countryCode) {
    const country = findCountry(pin.country);
    if (country) {
      countryCode = country.code;
      countryLabel = country.name;
    }
  }

  if (!countryCode) return null;

  if (!regionLabel) {
    regionLabel = pin.city || "Unknown";
  }

  return {
    miavId: pin.miavId,
    category: pin.category,
    workId: pin.workId,
    countryCode: countryCode.toUpperCase(),
    countryLabel: countryLabel || countryCode,
    regionKey: slugPart(regionLabel) || "unknown",
    regionLabel,
    locationId: pin.locationId,
  };
}

async function loadCategorizedSource(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache;

  const { listAllActivities, pinFromActivity } = await import(
    "@/features/world-memory/trace/activityRest"
  );
  const { listAllTraceRecords, pinFromRecord } = await import(
    "@/features/world-memory/trace/traceRest"
  );

  const [activities, legacy] = await Promise.all([
    listAllActivities(),
    listAllTraceRecords().catch(() => []),
  ]);

  const pins: TracePin[] = [
    ...activities.map(pinFromActivity),
    ...legacy.map(pinFromRecord),
  ];

  const rows: AggregateMemoryRow[] = [];
  for (const pin of pins) {
    const row = rowFromCategorizedPin(pin);
    if (row) rows.push(row);
  }

  cache = { at: now, rows, pins };
  return cache;
}

/** Test / admin helper — drop short cache after writes. */
export function invalidateAggregateCache() {
  cache = null;
}

function resolveGeographyCoords(
  geographyId: string,
  sample: AggregateMemoryRow,
): { lat: number; lng: number } | null {
  if (!geographyId.includes(":")) {
    const country = findCountry(geographyId) || findCountry(sample.countryLabel);
    if (country) return { lat: country.lat, lng: country.lng };
    return null;
  }

  const country =
    findCountry(sample.countryCode) || findCountry(sample.countryLabel);
  if (!country) return null;

  const region = findRegion(country, sample.regionLabel);
  if (region) return { lat: region.lat, lng: region.lng };

  // Prefer a known city/place in this region over averaging.
  if (sample.locationId) {
    const place = getPlaceById(sample.locationId);
    if (place) return { lat: place.lat, lng: place.lng };
    const loc = getLocationById(sample.locationId);
    if (loc) return { lat: loc.lat, lng: loc.lng };
  }

  for (const city of country.regions.flatMap((r) =>
    r.name.toLowerCase() === sample.regionLabel.toLowerCase() ? r.cities : [],
  )) {
    return { lat: city.lat, lng: city.lng };
  }

  // Last resort: country centroid (catalog), never invented sea coords.
  return { lat: country.lat, lng: country.lng };
}

export async function getGeographyAggregates(input: {
  scope: AggregateScope;
  categories: TraceCategory[];
}): Promise<{
  geographies: GeographyAggregate[];
  totals: { peopleCount: number; activityCount: number };
  scope: AggregateScope;
  categories: TraceCategory[];
}> {
  const { rows } = await loadCategorizedSource();
  const geographies = aggregateGeographies(
    rows,
    input.scope,
    input.categories,
    resolveGeographyCoords,
  );
  const totals = computeScopeTotals(rows, input.scope, input.categories);
  return {
    geographies,
    totals,
    scope: input.scope,
    categories: [...input.categories],
  };
}

export async function listMemoriesForGeography(input: {
  countryCode: string;
  regionLabel?: string | null;
  categories: TraceCategory[];
  limit?: number;
}): Promise<TracePin[]> {
  const { pins } = await loadCategorizedSource();
  const code = input.countryCode.toUpperCase();
  const catSet = new Set(input.categories);
  const regionQ = input.regionLabel?.trim().toLowerCase() || null;

  const matched: TracePin[] = [];
  for (const pin of pins) {
    if (!pin.category || !catSet.has(pin.category)) continue;
    const row = rowFromCategorizedPin(pin);
    if (!row) continue;
    if (row.countryCode !== code) continue;
    if (regionQ && row.regionLabel.toLowerCase() !== regionQ) continue;
    matched.push(pin);
  }

  matched.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.min(Math.max(1, Math.floor(input.limit)), 200)
      : 100;
  return matched.slice(0, limit);
}

export { regionGeographyId };
