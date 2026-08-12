import "server-only";

import {
  aggregateGeographies,
  cityGeographyId,
  computeScopeTotals,
  regionGeographyId,
  type AggregateMemoryRow,
  type AggregateScope,
  type GeographyAggregate,
} from "@/features/world-memory/trace/aggregate";
import { rowFromCategorizedPin } from "@/features/world-memory/trace/aggregateRows";
import {
  findCity,
  findCountry,
  findRegion,
  getLocationById,
} from "@/features/world-memory/location/locations";
import { getPlaceById } from "@/features/world-memory/location/places";
import type { TraceCategory } from "@/features/world-memory/trace/works";
import type { TracePin } from "@/features/world-memory/trace/types";

type CacheEntry = {
  at: number;
  rows: AggregateMemoryRow[];
  pins: TracePin[];
};

const CACHE_TTL_MS = 30_000;
let cache: CacheEntry | null = null;

export { rowFromCategorizedPin };

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
  // Prefer catalog location for 3-part city ids.
  if (geographyId.split(":").length >= 3) {
    const loc = getLocationById(geographyId);
    if (loc) return { lat: loc.lat, lng: loc.lng };
    if (sample.locationId) {
      const bySample = getLocationById(sample.locationId);
      if (bySample) return { lat: bySample.lat, lng: bySample.lng };
      const place = getPlaceById(sample.locationId);
      if (place) return { lat: place.lat, lng: place.lng };
    }
  }

  if (!geographyId.includes(":")) {
    const country = findCountry(geographyId) || findCountry(sample.countryLabel);
    if (country) return { lat: country.lat, lng: country.lng };
    return null;
  }

  const country =
    findCountry(sample.countryCode) || findCountry(sample.countryLabel);
  if (!country) return null;

  // City: CC:region:city
  const parts = geographyId.split(":");
  if (parts.length >= 3) {
    const region = findRegion(country, sample.regionLabel);
    if (region) {
      const city = findCity(region, sample.cityLabel);
      if (city) return { lat: city.lat, lng: city.lng };
      // Known city coords in matching region by slug id suffix.
      for (const c of region.cities) {
        if (c.locationId === geographyId) {
          return { lat: c.lat, lng: c.lng };
        }
      }
    }
    // No invented coords — drop marker if city unknown.
    return null;
  }

  // Region: CC:region
  const region = findRegion(country, sample.regionLabel);
  if (region) return { lat: region.lat, lng: region.lng };

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

  // Last resort for regions only: country centroid (catalog).
  return { lat: country.lat, lng: country.lng };
}

export async function getGeographyAggregates(input: {
  scope: AggregateScope;
  categories: TraceCategory[];
  workIds: string[];
}): Promise<{
  geographies: GeographyAggregate[];
  totals: { peopleCount: number; activityCount: number };
  scope: AggregateScope;
  categories: TraceCategory[];
  workIds: string[];
}> {
  const { rows } = await loadCategorizedSource();
  const geographies = aggregateGeographies(
    rows,
    input.scope,
    input.categories,
    input.workIds,
    resolveGeographyCoords,
  );
  const totals = computeScopeTotals(
    rows,
    input.scope,
    input.categories,
    input.workIds,
  );
  return {
    geographies,
    totals,
    scope: input.scope,
    categories: [...input.categories],
    workIds: [...input.workIds],
  };
}

export async function listMemoriesForGeography(input: {
  countryCode: string;
  regionLabel?: string | null;
  cityLabel?: string | null;
  categories: TraceCategory[];
  workIds: string[];
  limit?: number;
}): Promise<TracePin[]> {
  const { pins } = await loadCategorizedSource();
  const code = input.countryCode.toUpperCase();
  const catSet = new Set(input.categories);
  const workSet = new Set(input.workIds);
  const regionQ = input.regionLabel?.trim().toLowerCase() || null;
  const cityQ = input.cityLabel?.trim().toLowerCase() || null;

  const matched: TracePin[] = [];
  for (const pin of pins) {
    if (!pin.category || !catSet.has(pin.category)) continue;
    if (!pin.workId || !workSet.has(pin.workId)) continue;
    const row = rowFromCategorizedPin(pin);
    if (!row) continue;
    if (row.countryCode !== code) continue;
    if (regionQ && row.regionLabel.toLowerCase() !== regionQ) continue;
    if (cityQ && row.cityLabel.toLowerCase() !== cityQ) continue;
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

export { regionGeographyId, cityGeographyId };
