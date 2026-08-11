/**
 * Phase 3 — pure geography aggregation (no Firestore).
 * peopleCount = unique miavId; activityCount = row count.
 * Legacy uncategorized rows must never enter this pipeline.
 */

import {
  TRACE_CATEGORIES,
  type TraceCategory,
} from "@/features/world-memory/trace/works";

export type AggregateWorkBreakdown = {
  workId: string;
  peopleCount: number;
  activityCount: number;
};

export type CategoryAggregate = {
  category: TraceCategory;
  peopleCount: number;
  activityCount: number;
  /** Retained for future Work filters — UI may omit. */
  works: AggregateWorkBreakdown[];
};

export type GeographyAggregate = {
  /** Stable id: country code (JP) or countryCode:regionSlug. */
  geographyId: string;
  label: string;
  lat: number;
  lng: number;
  peopleCount: number;
  activityCount: number;
  categories: CategoryAggregate[];
  /** Present on region aggregates. */
  countryCode?: string;
  countryLabel?: string;
};

/** One categorized Memory row used for aggregation (no Firebase UID). */
export type AggregateMemoryRow = {
  miavId: string;
  category: TraceCategory;
  workId: string;
  countryCode: string;
  countryLabel: string;
  regionKey: string;
  regionLabel: string;
  locationId: string | null;
};

export type AggregateScope =
  | { level: "world" }
  | { level: "country"; countryCode: string };

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function regionGeographyId(
  countryCode: string,
  regionLabel: string,
): string {
  const slug = slugPart(regionLabel) || "unknown";
  return `${countryCode.toUpperCase()}:${slug}`;
}

export function parseCategoriesParam(
  raw: string | null | undefined,
): TraceCategory[] | { error: string } {
  if (raw == null || raw.trim() === "") {
    return [...TRACE_CATEGORIES];
  }
  const parts = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return [...TRACE_CATEGORIES];

  const out: TraceCategory[] = [];
  for (const part of parts) {
    if (part !== "read" && part !== "play" && part !== "apps") {
      return { error: `Unknown category: ${part}` };
    }
    if (!out.includes(part)) out.push(part);
  }
  return out;
}

export function filterRowsByCategories(
  rows: AggregateMemoryRow[],
  categories: readonly TraceCategory[],
): AggregateMemoryRow[] {
  if (categories.length === 0) return [];
  const set = new Set(categories);
  return rows.filter((row) => set.has(row.category));
}

type Bucket = {
  geographyId: string;
  label: string;
  countryCode: string;
  countryLabel: string;
  rows: AggregateMemoryRow[];
};

function uniquePeople(rows: AggregateMemoryRow[]): number {
  return new Set(rows.map((r) => r.miavId)).size;
}

function buildCategoryAggregates(
  rows: AggregateMemoryRow[],
  categories: readonly TraceCategory[],
): CategoryAggregate[] {
  const result: CategoryAggregate[] = [];
  for (const category of TRACE_CATEGORIES) {
    if (!categories.includes(category)) continue;
    const catRows = rows.filter((r) => r.category === category);
    if (catRows.length === 0) continue;

    const workMap = new Map<string, AggregateMemoryRow[]>();
    for (const row of catRows) {
      const list = workMap.get(row.workId) || [];
      list.push(row);
      workMap.set(row.workId, list);
    }

    const works: AggregateWorkBreakdown[] = [...workMap.entries()]
      .map(([workId, workRows]) => ({
        workId,
        peopleCount: uniquePeople(workRows),
        activityCount: workRows.length,
      }))
      .sort((a, b) => a.workId.localeCompare(b.workId));

    result.push({
      category,
      peopleCount: uniquePeople(catRows),
      activityCount: catRows.length,
      works,
    });
  }
  return result;
}

function finalizeBucket(
  bucket: Bucket,
  categories: readonly TraceCategory[],
  coords: { lat: number; lng: number },
  includeCountryFields: boolean,
): GeographyAggregate {
  return {
    geographyId: bucket.geographyId,
    label: bucket.label,
    lat: coords.lat,
    lng: coords.lng,
    peopleCount: uniquePeople(bucket.rows),
    activityCount: bucket.rows.length,
    categories: buildCategoryAggregates(bucket.rows, categories),
    ...(includeCountryFields
      ? {
          countryCode: bucket.countryCode,
          countryLabel: bucket.countryLabel,
        }
      : {}),
  };
}

export type GeographyCoordResolver = (
  geographyId: string,
  sample: AggregateMemoryRow,
) => { lat: number; lng: number } | null;

/**
 * Aggregate categorized memories for map markers.
 * Coord resolver must use catalog / known place coords — never raw averages to sea.
 */
export function aggregateGeographies(
  rows: AggregateMemoryRow[],
  scope: AggregateScope,
  categories: readonly TraceCategory[],
  resolveCoords: GeographyCoordResolver,
): GeographyAggregate[] {
  const filtered = filterRowsByCategories(rows, categories);
  const buckets = new Map<string, Bucket>();

  for (const row of filtered) {
    if (scope.level === "country") {
      if (row.countryCode.toUpperCase() !== scope.countryCode.toUpperCase()) {
        continue;
      }
      const geographyId = regionGeographyId(row.countryCode, row.regionLabel);
      const existing = buckets.get(geographyId);
      if (existing) {
        existing.rows.push(row);
      } else {
        buckets.set(geographyId, {
          geographyId,
          label: row.regionLabel || row.locationId || geographyId,
          countryCode: row.countryCode.toUpperCase(),
          countryLabel: row.countryLabel,
          rows: [row],
        });
      }
      continue;
    }

    const geographyId = row.countryCode.toUpperCase();
    const existing = buckets.get(geographyId);
    if (existing) {
      existing.rows.push(row);
    } else {
      buckets.set(geographyId, {
        geographyId,
        label: row.countryLabel,
        countryCode: geographyId,
        countryLabel: row.countryLabel,
        rows: [row],
      });
    }
  }

  const out: GeographyAggregate[] = [];
  for (const bucket of buckets.values()) {
    const sample = bucket.rows[0];
    if (!sample) continue;
    const coords = resolveCoords(bucket.geographyId, sample);
    if (!coords) continue;
    out.push(
      finalizeBucket(
        bucket,
        categories,
        coords,
        scope.level === "country",
      ),
    );
  }

  return out.sort(
    (a, b) =>
      b.peopleCount - a.peopleCount ||
      b.activityCount - a.activityCount ||
      a.label.localeCompare(b.label),
  );
}

/** Scope totals with correct unique people across geographies. */
export function computeScopeTotals(
  rows: AggregateMemoryRow[],
  scope: AggregateScope,
  categories: readonly TraceCategory[],
): { peopleCount: number; activityCount: number } {
  let filtered = filterRowsByCategories(rows, categories);
  if (scope.level === "country") {
    const code = scope.countryCode.toUpperCase();
    filtered = filtered.filter((r) => r.countryCode.toUpperCase() === code);
  }
  return {
    peopleCount: uniquePeople(filtered),
    activityCount: filtered.length,
  };
}
