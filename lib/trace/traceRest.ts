import "server-only";

import { getGoogleAccessToken } from "@/lib/firebase/googleAccessToken";
import {
  ANONYMOUS_TRACE_TTL_MS,
  formatMiavId,
  isTraceAuthType,
  locationDocId,
  previewMessage,
  toTracePin,
  TRACE_COLLECTION,
  TRACE_LOCATIONS_COLLECTION,
  TRACE_STATS_DOC,
  type TraceAuthType,
  type MemoryStar,
  type TraceLocationCluster,
  type TracePin,
  type TraceRecord,
  type TraceStats,
} from "@/lib/trace/types";
import {
  findLocationByNames,
  getLocationById,
  resolveLocationCoords,
} from "@/lib/locations";
import { getPlaceById, placeToTraceFields } from "@/lib/places";
import {
  canonicalPlaceId,
  legacyIdsForCanonical,
} from "@/lib/places/legacyMap";

/**
 * Public pin — never expose Firebase UID or Firestore document id.
 * Catalog lat/lng only; re-resolved in pinFromRecord.
 */
export function pinFromRecord(record: TraceRecord): TracePin {
  const base = toTracePin(record);
  const coords = catalogCoordsForTrace(record);
  return {
    miavId: base.miavId,
    authType: base.authType,
    locationId: coords.locationId,
    country: coords.country,
    region: coords.region,
    city: coords.city,
    lat: coords.lat,
    lng: coords.lng,
    message: base.message,
    createdAt: base.createdAt,
  };
}

/** Resolve representative Catalog coords for a stored Trace (never device GPS). */
function catalogCoordsForTrace(record: {
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
}): {
  locationId: string | null;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
} {
  const place = record.locationId
    ? getPlaceById(record.locationId)
    : undefined;
  if (place) {
    const fields = placeToTraceFields(place);
    return fields;
  }

  const loc =
    (record.locationId ? getLocationById(record.locationId) : undefined) ||
    (record.country && record.city
      ? findLocationByNames({
          country: record.country,
          region: record.region,
          city: record.city,
        })
      : undefined);

  if (loc) {
    return {
      locationId: loc.locationId,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      lat: loc.lat,
      lng: loc.lng,
    };
  }

  const fallback = resolveLocationCoords({
    country: record.country,
    region: record.region,
    city: record.city,
  });

  return {
    locationId: record.locationId || null,
    country: record.country,
    region: record.region,
    city: record.city,
    // Unknown place: still never emit stored/personal coordinates.
    lat: fallback?.lat ?? 20,
    lng: fallback?.lng ?? 0,
  };
}

/** Enrich a cluster doc with Catalog coords before any public use. */
function withCatalogClusterCoords(
  cluster: TraceLocationCluster,
): TraceLocationCluster {
  const coords = catalogCoordsForTrace({
    locationId: cluster.locationId,
    country: cluster.country,
    region: cluster.region,
    city: cluster.city,
  });
  return {
    ...cluster,
    locationId: coords.locationId,
    country: coords.country,
    region: coords.region,
    city: coords.city,
    lat: coords.lat,
    lng: coords.lng,
  };
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

function documentIdFromName(name: string | undefined): string {
  if (!name) return "";
  const parts = name.split("/");
  return parts[parts.length - 1] || "";
}

function readString(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): string {
  const value = fields?.[key];
  if (value && "stringValue" in value) return value.stringValue;
  return "";
}

function readNumber(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): number {
  const value = fields?.[key];
  if (value && "doubleValue" in value) return value.doubleValue;
  if (value && "integerValue" in value) return Number(value.integerValue);
  return 0;
}

function readTimestamp(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
  fallback?: string,
): string {
  const value = fields?.[key];
  if (value && "timestampValue" in value) return value.timestampValue;
  return fallback || new Date(0).toISOString();
}

function readNullableTimestamp(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): string | null {
  const value = fields?.[key];
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  return null;
}

async function firestoreFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { accessToken, projectId } = await getGoogleAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

function toTraceRecord(doc: FirestoreDocument): TraceRecord {
  const authRaw = readString(doc.fields, "authType");
  const locationIdRaw = readString(doc.fields, "locationId");
  return {
    id: documentIdFromName(doc.name),
    miavId: readString(doc.fields, "miavId"),
    uid: readString(doc.fields, "uid"),
    authType: isTraceAuthType(authRaw) ? authRaw : "anonymous",
    locationId: locationIdRaw || null,
    country: readString(doc.fields, "country"),
    region: readString(doc.fields, "region"),
    city: readString(doc.fields, "city"),
    lat: readNumber(doc.fields, "lat"),
    lng: readNumber(doc.fields, "lng"),
    message: readString(doc.fields, "message"),
    createdAt: readTimestamp(doc.fields, "createdAt", doc.createTime),
    updatedAt: readTimestamp(doc.fields, "updatedAt", doc.updateTime),
    expiresAt: readNullableTimestamp(doc.fields, "expiresAt"),
  };
}

function isActiveTrace(trace: TraceRecord, now = Date.now()): boolean {
  if (trace.authType !== "anonymous" || !trace.expiresAt) return true;
  return new Date(trace.expiresAt).getTime() > now;
}

async function allocateMiavNumber(): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const getRes = await firestoreFetch("documents/meta/miav_counter");
    let lastNumber = 0;
    let updateTime: string | undefined;

    if (getRes.status === 404) {
      const createRes = await firestoreFetch(
        "documents/meta?documentId=miav_counter",
        {
          method: "POST",
          body: JSON.stringify({
            fields: {
              lastNumber: { integerValue: "1" },
            },
          }),
        },
      );
      if (createRes.ok) return 1;
      continue;
    }

    if (!getRes.ok) {
      const err = (await getRes.json()) as { error?: { message?: string } };
      throw new Error(err.error?.message || "Failed to read MIAV counter.");
    }

    const doc = (await getRes.json()) as FirestoreDocument;
    updateTime = doc.updateTime;
    lastNumber = readNumber(doc.fields, "lastNumber");
    const next = lastNumber + 1;

    const patchUrl = updateTime
      ? `documents/meta/miav_counter?updateMask.fieldPaths=lastNumber&currentDocument.updateTime=${encodeURIComponent(updateTime)}`
      : `documents/meta/miav_counter?updateMask.fieldPaths=lastNumber`;

    const patchRes = await firestoreFetch(patchUrl, {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          lastNumber: { integerValue: String(next) },
        },
      }),
    });

    if (patchRes.ok) return next;
    if (
      patchRes.status === 400 ||
      patchRes.status === 409 ||
      patchRes.status === 412
    ) {
      continue;
    }
    const err = (await patchRes.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to allocate MIAV ID.");
  }

  throw new Error("Failed to allocate MIAV ID after retries.");
}

async function runTraceQuery(
  structuredQuery: Record<string, unknown>,
  options?: { includeExpired?: boolean },
) {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({ structuredQuery }),
  });

  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
    error?: { message?: string };
  }>;

  if (!response.ok) {
    const message =
      Array.isArray(rows) && rows[0]?.error?.message
        ? rows[0].error.message
        : "Failed to query traces.";
    throw new Error(message);
  }

  if (!Array.isArray(rows)) return [] as TraceRecord[];

  const records = rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toTraceRecord);

  // Public / map paths omit expired anonymous Traces.
  // Cleanup must pass includeExpired: true to find TTL victims.
  if (options?.includeExpired) return records;
  return records.filter((trace) => isActiveTrace(trace));
}

async function bumpLocationCount(
  location: {
    locationId?: string | null;
    country: string;
    region: string;
    city: string;
    lat: number;
    lng: number;
  },
  delta: number,
) {
  if (delta === 0) return;
  const id = locationDocId(location);
  const getRes = await firestoreFetch(
    `documents/${TRACE_LOCATIONS_COLLECTION}/${id}`,
  );

  if (getRes.status === 404) {
    if (delta < 0) return;
    await firestoreFetch(
      `documents/${TRACE_LOCATIONS_COLLECTION}?documentId=${id}`,
      {
        method: "POST",
        body: JSON.stringify({
          fields: {
            locationId: location.locationId
              ? { stringValue: location.locationId }
              : { nullValue: null },
            country: { stringValue: location.country },
            region: { stringValue: location.region },
            city: { stringValue: location.city },
            lat: { doubleValue: location.lat },
            lng: { doubleValue: location.lng },
            count: { integerValue: String(delta) },
          },
        }),
      },
    );
    return;
  }

  if (!getRes.ok) return;
  const doc = (await getRes.json()) as FirestoreDocument;
  const next = Math.max(0, readNumber(doc.fields, "count") + delta);

  if (next === 0) {
    await firestoreFetch(`documents/${TRACE_LOCATIONS_COLLECTION}/${id}`, {
      method: "DELETE",
    });
    return;
  }

  await firestoreFetch(
    `documents/${TRACE_LOCATIONS_COLLECTION}/${id}?updateMask.fieldPaths=count&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=locationId`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          count: { integerValue: String(next) },
          lat: { doubleValue: location.lat },
          lng: { doubleValue: location.lng },
          locationId: location.locationId
            ? { stringValue: location.locationId }
            : { nullValue: null },
        },
      }),
    },
  );
}

type InternalTraceStats = {
  countryCount: number;
  cityCount: number;
  permanentCount: number;
  temporaryCount: number;
  firstMiavId: string | null;
  firstCreatedAt: string | null;
  latestMiavId: string | null;
  latestCountry: string | null;
  latestCity: string | null;
  latestMessagePreview: string | null;
  latestCreatedAt: string | null;
};

function emptyInternalStats(): InternalTraceStats {
  return {
    countryCount: 0,
    cityCount: 0,
    permanentCount: 0,
    temporaryCount: 0,
    firstMiavId: null,
    firstCreatedAt: null,
    latestMiavId: null,
    latestCountry: null,
    latestCity: null,
    latestMessagePreview: null,
    latestCreatedAt: null,
  };
}

function toPublicStats(stats: InternalTraceStats): TraceStats {
  return {
    placeCount: stats.cityCount,
    memoryCount: stats.permanentCount + stats.temporaryCount,
    guestCount: stats.temporaryCount,
    googleCount: stats.permanentCount,
    latest:
      stats.latestMiavId &&
      stats.latestCountry &&
      stats.latestCity &&
      stats.latestCreatedAt
        ? {
            miavId: stats.latestMiavId,
            country: stats.latestCountry,
            city: stats.latestCity,
            messagePreview: stats.latestMessagePreview || "",
            createdAt: stats.latestCreatedAt,
          }
        : null,
  };
}

function statsFromRecords(records: TraceRecord[]): InternalTraceStats {
  const countries = new Set<string>();
  const cities = new Set<string>();
  let permanentCount = 0;
  let temporaryCount = 0;
  let first: TraceRecord | null = null;
  let latest: TraceRecord | null = null;

  for (const trace of records) {
    countries.add(trace.country);
    cities.add(`${trace.country}|${trace.region}|${trace.city}`);
    if (trace.authType === "google") permanentCount += 1;
    else temporaryCount += 1;
    if (
      !first ||
      new Date(trace.createdAt).getTime() < new Date(first.createdAt).getTime()
    ) {
      first = trace;
    }
    if (
      !latest ||
      new Date(trace.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = trace;
    }
  }

  return {
    countryCount: countries.size,
    cityCount: cities.size,
    permanentCount,
    temporaryCount,
    firstMiavId: first?.miavId || null,
    firstCreatedAt: first?.createdAt || null,
    latestMiavId: latest?.miavId || null,
    latestCountry: latest?.country || null,
    latestCity: latest?.city || null,
    latestMessagePreview: latest ? previewMessage(latest.message) : null,
    latestCreatedAt: latest?.createdAt || null,
  };
}

async function writeTraceStats(stats: InternalTraceStats) {
  const fields: Record<string, FirestoreValue> = {
    countryCount: { integerValue: String(stats.countryCount) },
    cityCount: { integerValue: String(stats.cityCount) },
    permanentCount: { integerValue: String(stats.permanentCount) },
    temporaryCount: { integerValue: String(stats.temporaryCount) },
    firstMiavId: stats.firstMiavId
      ? { stringValue: stats.firstMiavId }
      : { nullValue: null },
    firstCreatedAt: stats.firstCreatedAt
      ? { timestampValue: stats.firstCreatedAt }
      : { nullValue: null },
    latestMiavId: stats.latestMiavId
      ? { stringValue: stats.latestMiavId }
      : { nullValue: null },
    latestCountry: stats.latestCountry
      ? { stringValue: stats.latestCountry }
      : { nullValue: null },
    latestCity: stats.latestCity
      ? { stringValue: stats.latestCity }
      : { nullValue: null },
    latestMessagePreview: stats.latestMessagePreview
      ? { stringValue: stats.latestMessagePreview }
      : { nullValue: null },
    latestCreatedAt: stats.latestCreatedAt
      ? { timestampValue: stats.latestCreatedAt }
      : { nullValue: null },
  };

  const getRes = await firestoreFetch(`documents/${TRACE_STATS_DOC}`);
  if (getRes.status === 404) {
    await firestoreFetch("documents/meta?documentId=trace_stats", {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
    return;
  }

  await firestoreFetch(
    `documents/${TRACE_STATS_DOC}?updateMask.fieldPaths=countryCount&updateMask.fieldPaths=cityCount&updateMask.fieldPaths=permanentCount&updateMask.fieldPaths=temporaryCount&updateMask.fieldPaths=firstMiavId&updateMask.fieldPaths=firstCreatedAt&updateMask.fieldPaths=latestMiavId&updateMask.fieldPaths=latestCountry&updateMask.fieldPaths=latestCity&updateMask.fieldPaths=latestMessagePreview&updateMask.fieldPaths=latestCreatedAt`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
  );
}

async function listAllLocationDocumentIds(): Promise<string[]> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: TRACE_LOCATIONS_COLLECTION }],
      },
    }),
  });
  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;
  if (!response.ok || !Array.isArray(rows)) return [];
  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map((doc) => documentIdFromName(doc.name));
}

function locationClusterFields(cluster: TraceLocationCluster): Record<
  string,
  FirestoreValue
> {
  return {
    locationId: cluster.locationId
      ? { stringValue: cluster.locationId }
      : { nullValue: null },
    country: { stringValue: cluster.country },
    region: { stringValue: cluster.region },
    city: { stringValue: cluster.city },
    lat: { doubleValue: cluster.lat },
    lng: { doubleValue: cluster.lng },
    count: { integerValue: String(cluster.count) },
  };
}

async function upsertLocationCluster(cluster: TraceLocationCluster) {
  const id = locationDocId(cluster);
  const fields = locationClusterFields(cluster);
  const getRes = await firestoreFetch(
    `documents/${TRACE_LOCATIONS_COLLECTION}/${id}`,
  );
  if (getRes.status === 404) {
    await firestoreFetch(
      `documents/${TRACE_LOCATIONS_COLLECTION}?documentId=${id}`,
      {
        method: "POST",
        body: JSON.stringify({ fields }),
      },
    );
    return;
  }
  if (!getRes.ok) return;
  await firestoreFetch(
    `documents/${TRACE_LOCATIONS_COLLECTION}/${id}?updateMask.fieldPaths=count&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=locationId&updateMask.fieldPaths=country&updateMask.fieldPaths=region&updateMask.fieldPaths=city`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
  );
}

/**
 * Rebuild stats + location counts from active Traces only, and prune orphan
 * trace_locations docs so World Memory stars cannot linger after deletes.
 */
async function rebuildAggregatesFromTraces(): Promise<{
  stats: InternalTraceStats;
  locations: TraceLocationCluster[];
}> {
  const records = await runTraceQuery({
    from: [{ collectionId: TRACE_COLLECTION }],
  });
  const stats = statsFromRecords(records);
  await writeTraceStats(stats);

  const byCity = new Map<string, TraceLocationCluster>();
  for (const trace of records) {
    const coords = catalogCoordsForTrace(trace);
    const key = locationDocId(coords);
    const current = byCity.get(key);
    if (current) {
      current.count += 1;
    } else {
      byCity.set(key, {
        locationId: coords.locationId,
        country: coords.country,
        region: coords.region,
        city: coords.city,
        lat: coords.lat,
        lng: coords.lng,
        count: 1,
      });
    }
  }

  const existingIds = await listAllLocationDocumentIds();
  for (const id of existingIds) {
    if (!byCity.has(id)) {
      await firestoreFetch(`documents/${TRACE_LOCATIONS_COLLECTION}/${id}`, {
        method: "DELETE",
      });
    }
  }

  for (const cluster of byCity.values()) {
    await upsertLocationCluster(cluster);
  }

  return { stats, locations: [...byCity.values()] };
}

/**
 * Canonical delete path for World Memory consistency:
 * 1) delete Trace document
 * 2) decrement (or remove) the location aggregate used for stars
 * Returns false only when the Trace delete itself fails.
 * Callers should run rebuildAggregatesFromTraces() after a batch to prune
 * orphans and refresh stats so stars always match active Traces.
 */
async function deleteTraceDocumentAndDecrementLocation(
  trace: TraceRecord,
): Promise<boolean> {
  const del = await firestoreFetch(
    `documents/${TRACE_COLLECTION}/${encodeURIComponent(trace.id)}`,
    { method: "DELETE" },
  );
  if (!del.ok && del.status !== 404) {
    return false;
  }

  const coords = catalogCoordsForTrace(trace);
  await bumpLocationCount(
    {
      locationId: coords.locationId,
      country: coords.country,
      region: coords.region,
      city: coords.city,
      lat: coords.lat,
      lng: coords.lng,
    },
    -1,
  );

  return true;
}

async function readTraceStatsDoc(): Promise<InternalTraceStats | null> {
  const response = await firestoreFetch(`documents/${TRACE_STATS_DOC}`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const doc = (await response.json()) as FirestoreDocument;

  return {
    countryCount: readNumber(doc.fields, "countryCount"),
    cityCount: readNumber(doc.fields, "cityCount"),
    permanentCount: readNumber(doc.fields, "permanentCount"),
    temporaryCount: readNumber(doc.fields, "temporaryCount"),
    firstMiavId: readString(doc.fields, "firstMiavId") || null,
    firstCreatedAt: readNullableTimestamp(doc.fields, "firstCreatedAt"),
    latestMiavId: readString(doc.fields, "latestMiavId") || null,
    latestCountry: readString(doc.fields, "latestCountry") || null,
    latestCity: readString(doc.fields, "latestCity") || null,
    latestMessagePreview: readString(doc.fields, "latestMessagePreview") || null,
    latestCreatedAt: readNullableTimestamp(doc.fields, "latestCreatedAt"),
  };
}

export async function listTraceLocations(): Promise<TraceLocationCluster[]> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: TRACE_LOCATIONS_COLLECTION }],
      },
    }),
  });

  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;

  if (!response.ok || !Array.isArray(rows)) {
    const rebuilt = await rebuildAggregatesFromTraces();
    return rebuilt.locations;
  }

  const locations = rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map((doc) =>
      withCatalogClusterCoords({
        locationId: readString(doc.fields, "locationId") || null,
        country: readString(doc.fields, "country"),
        region: readString(doc.fields, "region"),
        city: readString(doc.fields, "city"),
        lat: readNumber(doc.fields, "lat"),
        lng: readNumber(doc.fields, "lng"),
        count: readNumber(doc.fields, "count"),
      }),
    )
    .filter((item) => item.count > 0 && item.city);

  if (locations.length === 0) {
    const stats = await readTraceStatsDoc();
    if (!stats || stats.permanentCount + stats.temporaryCount === 0) {
      return [];
    }
    const rebuilt = await rebuildAggregatesFromTraces();
    return rebuilt.locations;
  }

  return locations;
}

async function listLocationClustersWhere(filters: {
  country: string;
  region?: string;
}): Promise<TraceLocationCluster[]> {
  const fieldFilters: Array<Record<string, unknown>> = [
    {
      fieldFilter: {
        field: { fieldPath: "country" },
        op: "EQUAL",
        value: { stringValue: filters.country },
      },
    },
  ];
  if (filters.region) {
    fieldFilters.push({
      fieldFilter: {
        field: { fieldPath: "region" },
        op: "EQUAL",
        value: { stringValue: filters.region },
      },
    });
  }

  const where =
    fieldFilters.length === 1
      ? fieldFilters[0]
      : {
          compositeFilter: {
            op: "AND",
            filters: fieldFilters,
          },
        };

  try {
    const response = await firestoreFetch("documents:runQuery", {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: TRACE_LOCATIONS_COLLECTION }],
          where,
        },
      }),
    });
    const rows = (await response.json()) as Array<{
      document?: FirestoreDocument;
    }>;
    if (!response.ok || !Array.isArray(rows)) {
      throw new Error("location query failed");
    }
    return rows
      .map((row) => row.document)
      .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
      .map((doc) =>
        withCatalogClusterCoords({
          locationId: readString(doc.fields, "locationId") || null,
          country: readString(doc.fields, "country"),
          region: readString(doc.fields, "region"),
          city: readString(doc.fields, "city"),
          lat: readNumber(doc.fields, "lat"),
          lng: readNumber(doc.fields, "lng"),
          count: readNumber(doc.fields, "count"),
        }),
      )
      .filter((item) => item.count > 0 && item.city);
  } catch {
    const all = await listTraceLocations();
    return all.filter((item) => {
      if (item.country !== filters.country) return false;
      if (filters.region && item.region !== filters.region) return false;
      return true;
    });
  }
}

export async function listRegionsForCountry(countryName: string): Promise<
  Array<{ name: string; lat: number; lng: number; count: number }>
> {
  const { findCountry } = await import("@/lib/locations");
  const node = findCountry(countryName);
  if (!node) return [];

  const clusters = await listLocationClustersWhere({ country: node.name });
  const countByRegion = new Map<string, number>();
  for (const cluster of clusters) {
    countByRegion.set(
      cluster.region,
      (countByRegion.get(cluster.region) || 0) + cluster.count,
    );
  }

  // Location Database drives the list; Trace counts only annotate presence.
  return node.regions.map((region) => ({
    name: region.name,
    lat: region.lat,
    lng: region.lng,
    count: countByRegion.get(region.name) || 0,
  }));
}

export async function listCitiesForRegion(
  countryName: string,
  regionName: string,
): Promise<
  Array<{
    locationId: string;
    name: string;
    lat: number;
    lng: number;
    count: number;
  }>
> {
  const { findCountry, findRegion } = await import("@/lib/locations");
  const country = findCountry(countryName);
  if (!country) return [];
  const region = findRegion(country, regionName);
  if (!region) return [];

  const clusters = await listLocationClustersWhere({
    country: country.name,
    region: region.name,
  });
  const countByCity = new Map(
    clusters.map((cluster) => [cluster.city, cluster.count] as const),
  );
  const countByLocationId = new Map(
    clusters
      .filter((c) => c.locationId)
      .map((c) => [c.locationId!, c.count] as const),
  );

  return region.cities.map((city) => ({
    locationId: city.locationId,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    count:
      countByLocationId.get(city.locationId) ||
      countByCity.get(city.name) ||
      0,
  }));
}

/** Counts only for a country — Location shape comes from static JSON on the client. */
export async function listLocationCountsForCountry(
  countryName: string,
): Promise<Record<string, number>> {
  const clusters = await listLocationClustersWhere({ country: countryName });
  const counts: Record<string, number> = {};
  for (const cluster of clusters) {
    if (cluster.locationId) {
      counts[cluster.locationId] = cluster.count;
    } else {
      const key = `${cluster.country}|${cluster.region}|${cluster.city}`;
      counts[key] = cluster.count;
    }
  }
  return counts;
}

export async function getTraceStats(): Promise<TraceStats> {
  const existing = await readTraceStatsDoc();
  if (existing) return toPublicStats(existing);
  const rebuilt = await rebuildAggregatesFromTraces();
  return toPublicStats(rebuilt.stats);
}

export async function listMemoryStars(): Promise<MemoryStar[]> {
  const clusters = await listTraceLocations();
  const byCanonical = new Map<string, number>();

  for (const cluster of clusters) {
    let canonical = cluster.locationId
      ? canonicalPlaceId(cluster.locationId)
      : null;
    if (!canonical && cluster.country && cluster.city) {
      const legacy = findLocationByNames({
        country: cluster.country,
        region: cluster.region,
        city: cluster.city,
      });
      if (legacy) canonical = canonicalPlaceId(legacy.locationId);
    }
    if (!canonical) continue;
    byCanonical.set(
      canonical,
      (byCanonical.get(canonical) || 0) + cluster.count,
    );
  }

  return [...byCanonical.entries()]
    .map(([locationId, count]) => {
      const place = getPlaceById(locationId);
      if (!place) return null;
      return {
        locationId,
        country: place.country,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        count,
      };
    })
    .filter((star): star is MemoryStar => Boolean(star && star.count > 0));
}

export async function listTracesByLocationId(input: {
  locationId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  traces: TracePin[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const pageSize = input.limit ?? 50;
  const place = getPlaceById(input.locationId);
  if (!place) {
    return { traces: [], nextCursor: null, hasMore: false };
  }

  const legacyIds = legacyIdsForCanonical(input.locationId);
  const merged = new Map<string, TraceRecord>();

  for (const legacyId of legacyIds) {
    try {
      const records = await runTraceQuery({
        from: [{ collectionId: TRACE_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: "locationId" },
            op: "EQUAL",
            value: { stringValue: legacyId },
          },
        },
        orderBy: [
          { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
        ],
        limit: 200,
      });
      for (const record of records) {
        merged.set(record.id, record);
      }
    } catch {
      // try next legacy id
    }
  }

  if (merged.size === 0) {
    return listTracesAtCityLegacy({
      country: place.country,
      region: "",
      city: place.name,
      limit: pageSize,
      cursor: input.cursor,
    });
  }

  const sorted = [...merged.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const startIndex = input.cursor
    ? sorted.findIndex((row) => row.createdAt === input.cursor) + 1
    : 0;
  const safeStart = Math.max(0, startIndex);
  const page = sorted.slice(safeStart, safeStart + pageSize);
  const hasMore = safeStart + pageSize < sorted.length;
  const last = page[page.length - 1];

  return {
    traces: page.map(pinFromRecord),
    nextCursor: hasMore && last ? last.createdAt : null,
    hasMore,
  };
}

async function listTracesAtCityLegacy(input: {
  country: string;
  region: string;
  city: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  traces: TracePin[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const pageSize = input.limit ?? 50;
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: "country" },
        op: "EQUAL",
        value: { stringValue: input.country },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "region" },
        op: "EQUAL",
        value: { stringValue: input.region },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "city" },
        op: "EQUAL",
        value: { stringValue: input.city },
      },
    },
  ];
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: TRACE_COLLECTION }],
    where: { compositeFilter: { op: "AND", filters } },
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
    ],
    limit: pageSize + 1,
  };
  if (input.cursor) {
    structuredQuery.startAt = {
      values: [{ timestampValue: input.cursor }],
      before: true,
    };
  }
  try {
    const records = await runTraceQuery(structuredQuery);
    const page = records.slice(0, pageSize);
    const hasMore = records.length > pageSize;
    const last = page[page.length - 1];
    return {
      traces: page.map(pinFromRecord),
      nextCursor: hasMore && last ? last.createdAt : null,
      hasMore,
    };
  } catch {
    const countryRows = await runTraceQuery({
      from: [{ collectionId: TRACE_COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: "country" },
          op: "EQUAL",
          value: { stringValue: input.country },
        },
      },
    });
    const filtered = countryRows
      .filter(
        (trace) =>
          trace.region === input.region && trace.city === input.city,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    const startIndex = input.cursor
      ? filtered.findIndex((t) => t.createdAt === input.cursor) + 1
      : 0;
    const safeStart = Math.max(0, startIndex);
    const page = filtered.slice(safeStart, safeStart + pageSize);
    const hasMore = safeStart + pageSize < filtered.length;
    const last = page[page.length - 1];
    return {
      traces: page.map(pinFromRecord),
      nextCursor: hasMore && last ? last.createdAt : null,
      hasMore,
    };
  }
}

export async function listTracesAtCity(input: {
  country: string;
  region: string;
  city: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  traces: TracePin[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const matched = findLocationByNames(input);
  if (matched) {
    return listTracesByLocationId({
      locationId: matched.locationId,
      limit: input.limit,
      cursor: input.cursor,
    });
  }
  return listTracesAtCityLegacy(input);
}


/** @deprecated Prefer listTracesAtCity with pagination. */
export async function listTracesAtLocation(input: {
  country: string;
  region?: string;
  city?: string;
  limit?: number;
}): Promise<TracePin[]> {
  if (input.region && input.city) {
    const page = await listTracesAtCity({
      country: input.country,
      region: input.region,
      city: input.city,
      limit: input.limit ?? 50,
    });
    return page.traces;
  }
  const filters: Array<Record<string, unknown>> = [
    {
      fieldFilter: {
        field: { fieldPath: "country" },
        op: "EQUAL",
        value: { stringValue: input.country },
      },
    },
  ];
  if (input.region) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "region" },
        op: "EQUAL",
        value: { stringValue: input.region },
      },
    });
  }
  const where =
    filters.length === 1
      ? filters[0]
      : { compositeFilter: { op: "AND", filters } };
  const limit = input.limit ?? 50;
  try {
    const records = await runTraceQuery({
      from: [{ collectionId: TRACE_COLLECTION }],
      where,
      orderBy: [
        { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
      ],
      limit,
    });
    return records.map(pinFromRecord);
  } catch {
    const countryRows = await runTraceQuery({
      from: [{ collectionId: TRACE_COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: "country" },
          op: "EQUAL",
          value: { stringValue: input.country },
        },
      },
    });
    return countryRows
      .filter((trace) => {
        if (input.region && trace.region !== input.region) return false;
        if (input.city && trace.city !== input.city) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit)
      .map(pinFromRecord);
  }
}

async function refreshStatsAfterMutation(changed: TraceRecord) {
  const stats = (await readTraceStatsDoc()) || emptyInternalStats();

  if (!stats.firstMiavId) {
    stats.firstMiavId = changed.miavId;
    stats.firstCreatedAt = changed.createdAt;
  } else if (
    new Date(changed.createdAt).getTime() <
    new Date(stats.firstCreatedAt || changed.createdAt).getTime()
  ) {
    stats.firstMiavId = changed.miavId;
    stats.firstCreatedAt = changed.createdAt;
  }

  stats.latestMiavId = changed.miavId;
  stats.latestCountry = changed.country;
  stats.latestCity = changed.city;
  stats.latestMessagePreview = previewMessage(changed.message);
  stats.latestCreatedAt = changed.createdAt;

  const locations = await listTraceLocations();
  stats.cityCount = locations.length;
  stats.countryCount = new Set(locations.map((l) => l.country)).size;
  await writeTraceStats(stats);
}

export async function getTraceByUid(uid: string): Promise<TraceRecord | null> {
  const response = await firestoreFetch(
    `documents/${TRACE_COLLECTION}/${encodeURIComponent(uid)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to load trace.");
  }
  const doc = (await response.json()) as FirestoreDocument;
  return toTraceRecord(doc);
}

export async function createTrace(input: {
  uid: string;
  authType: TraceAuthType;
  country: string;
  region: string;
  city: string;
  message: string;
  locationId?: string | null;
}): Promise<TraceRecord> {
  const existing = await getTraceByUid(input.uid);
  if (existing) {
    throw new Error("TRACE_EXISTS");
  }

  const place = input.locationId
    ? getPlaceById(input.locationId)
    : undefined;
  const matched =
    place ||
    (input.locationId ? getLocationById(input.locationId) : undefined) ||
    findLocationByNames({
      country: input.country,
      region: input.region,
      city: input.city,
    });
  const coords = matched
    ? { lat: matched.lat, lng: matched.lng }
    : resolveLocationCoords({
        country: input.country,
        region: input.region,
        city: input.city,
      });
  if (!coords) {
    throw new Error("Invalid location.");
  }
  const locationId = matched?.locationId || input.locationId || null;
  const country = matched?.country || input.country;
  const region = place
    ? ""
    : matched && "region" in matched
      ? matched.region
      : input.region;
  const city =
    place?.name ||
    (matched && "city" in matched ? matched.city : input.city);

  const miavNumber = await allocateMiavNumber();
  const miavId = formatMiavId(miavNumber);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt =
    input.authType === "anonymous"
      ? new Date(now.getTime() + ANONYMOUS_TRACE_TTL_MS).toISOString()
      : null;

  const fields: Record<string, FirestoreValue> = {
    miavId: { stringValue: miavId },
    uid: { stringValue: input.uid },
    authType: { stringValue: input.authType },
    locationId: locationId
      ? { stringValue: locationId }
      : { nullValue: null },
    country: { stringValue: country },
    region: { stringValue: region },
    city: { stringValue: city },
    lat: { doubleValue: coords.lat },
    lng: { doubleValue: coords.lng },
    message: { stringValue: input.message },
    createdAt: { timestampValue: createdAt },
    updatedAt: { timestampValue: createdAt },
    expiresAt: expiresAt
      ? { timestampValue: expiresAt }
      : { nullValue: null },
  };

  const response = await firestoreFetch(
    `documents/${TRACE_COLLECTION}?documentId=${encodeURIComponent(input.uid)}`,
    {
      method: "POST",
      body: JSON.stringify({ fields }),
    },
  );

  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    if (response.status === 409) throw new Error("TRACE_EXISTS");
    throw new Error(err.error?.message || "Failed to create trace.");
  }

  const doc = (await response.json()) as FirestoreDocument;
  const record = toTraceRecord(doc);

  await bumpLocationCount(
    {
      locationId: record.locationId,
      country: record.country,
      region: record.region,
      city: record.city,
      lat: record.lat,
      lng: record.lng,
    },
    1,
  );

  const stats = (await readTraceStatsDoc()) || emptyInternalStats();
  stats.permanentCount += record.authType === "google" ? 1 : 0;
  stats.temporaryCount +=
    record.authType === "guest" || record.authType === "anonymous" ? 1 : 0;
  if (!stats.firstMiavId) {
    stats.firstMiavId = record.miavId;
    stats.firstCreatedAt = record.createdAt;
  }
  stats.latestMiavId = record.miavId;
  stats.latestCountry = record.country;
  stats.latestCity = record.city;
  stats.latestMessagePreview = previewMessage(record.message);
  stats.latestCreatedAt = record.createdAt;
  const locations = await listTraceLocations();
  stats.cityCount = locations.length;
  stats.countryCount = new Set(locations.map((l) => l.country)).size;
  await writeTraceStats(stats);

  return record;
}

export async function updateTraceLocationMessage(input: {
  uid: string;
  country: string;
  region: string;
  city: string;
  message: string;
  locationId?: string | null;
}): Promise<TraceRecord> {
  const existing = await getTraceByUid(input.uid);
  if (!existing) throw new Error("NOT_FOUND");

  const matched =
    (input.locationId ? getLocationById(input.locationId) : undefined) ||
    findLocationByNames({
      country: input.country,
      region: input.region,
      city: input.city,
    });
  const coords = matched
    ? { lat: matched.lat, lng: matched.lng, zoom: 11 }
    : resolveLocationCoords({
        country: input.country,
        region: input.region,
        city: input.city,
      });
  if (!coords) throw new Error("Invalid location.");

  const locationId = matched?.locationId || input.locationId || null;
  const country = matched?.country || input.country;
  const region = matched?.region || input.region;
  const city = matched?.city || input.city;

  const locationChanged =
    existing.locationId !== locationId ||
    existing.country !== country ||
    existing.region !== region ||
    existing.city !== city;

  const updatedAt = new Date().toISOString();
  const response = await firestoreFetch(
    `documents/${TRACE_COLLECTION}/${encodeURIComponent(input.uid)}?updateMask.fieldPaths=locationId&updateMask.fieldPaths=country&updateMask.fieldPaths=region&updateMask.fieldPaths=city&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=message&updateMask.fieldPaths=updatedAt`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          locationId: locationId
            ? { stringValue: locationId }
            : { nullValue: null },
          country: { stringValue: country },
          region: { stringValue: region },
          city: { stringValue: city },
          lat: { doubleValue: coords.lat },
          lng: { doubleValue: coords.lng },
          message: { stringValue: input.message },
          updatedAt: { timestampValue: updatedAt },
        },
      }),
    },
  );

  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to update trace.");
  }

  const doc = (await response.json()) as FirestoreDocument;
  const record = toTraceRecord(doc);

  if (locationChanged) {
    await bumpLocationCount(
      {
        locationId: existing.locationId,
        country: existing.country,
        region: existing.region,
        city: existing.city,
        lat: existing.lat,
        lng: existing.lng,
      },
      -1,
    );
    await bumpLocationCount(
      {
        locationId: record.locationId,
        country: record.country,
        region: record.region,
        city: record.city,
        lat: record.lat,
        lng: record.lng,
      },
      1,
    );
  }

  await refreshStatsAfterMutation(record);
  return record;
}

export async function upgradeTraceToPermanent(
  uid: string,
): Promise<TraceRecord> {
  const existing = await getTraceByUid(uid);
  if (!existing) throw new Error("NOT_FOUND");

  const updatedAt = new Date().toISOString();
  const response = await firestoreFetch(
    `documents/${TRACE_COLLECTION}/${encodeURIComponent(uid)}?updateMask.fieldPaths=authType&updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=updatedAt`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          authType: { stringValue: "google" },
          expiresAt: { nullValue: null },
          updatedAt: { timestampValue: updatedAt },
        },
      }),
    },
  );

  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to upgrade trace.");
  }

  const doc = (await response.json()) as FirestoreDocument;
  const record = toTraceRecord(doc);

  if (existing.authType === "anonymous") {
    const stats = (await readTraceStatsDoc()) || emptyInternalStats();
    stats.temporaryCount = Math.max(0, stats.temporaryCount - 1);
    stats.permanentCount += 1;
    await writeTraceStats(stats);
  }

  return record;
}

/**
 * TTL cleanup — same path as admin delete:
 * expired Trace → delete doc → decrement location → rebuild aggregates/stars.
 */
export async function deleteExpiredAnonymousTraces(): Promise<number> {
  const records = await runTraceQuery(
    {
      from: [{ collectionId: TRACE_COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: "authType" },
          op: "EQUAL",
          value: { stringValue: "anonymous" },
        },
      },
    },
    { includeExpired: true },
  );

  const now = Date.now();
  let deleted = 0;

  for (const trace of records) {
    if (!trace.expiresAt) continue;
    if (new Date(trace.expiresAt).getTime() > now) continue;

    if (await deleteTraceDocumentAndDecrementLocation(trace)) {
      deleted += 1;
    }
  }

  if (deleted > 0) {
    // Source of truth for World Memory stars after any delete batch.
    await rebuildAggregatesFromTraces();
  }

  return deleted;
}

/**
 * Admin / single-Trace delete — identical aggregate sync as TTL cleanup.
 */
export async function deleteTraceById(id: string): Promise<boolean> {
  const existing = await getTraceByUid(id);
  if (!existing) {
    const response = await firestoreFetch(
      `documents/${TRACE_COLLECTION}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (response.status === 404) return false;
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(data?.error?.message || "Failed to delete trace.");
    }
    await rebuildAggregatesFromTraces();
    return true;
  }

  const ok = await deleteTraceDocumentAndDecrementLocation(existing);
  if (!ok) {
    throw new Error("Failed to delete trace.");
  }
  await rebuildAggregatesFromTraces();
  return true;
}

/** Literary story footprints — fixed MIAV IDs, city-level only. Idempotent. */
const STORY_MEMORY_SEEDS: Array<{
  uid: string;
  miavId: string;
  locationId: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  message: string;
}> = [
  {
    uid: "seed-miav-922228",
    miavId: "MIAV-922228",
    locationId: "US:nyc",
    country: "United States",
    city: "New York",
    lat: 40.71,
    lng: -74.01,
    message: "What memory would you leave here?",
  },
  {
    uid: "seed-miav-922229",
    miavId: "MIAV-922229",
    locationId: "JP:tokyo",
    country: "Japan",
    city: "Tokyo",
    lat: 35.68,
    lng: 139.76,
    message: "I'm listening.",
  },
  {
    uid: "seed-miav-922233",
    miavId: "MIAV-922233",
    locationId: "GB:london",
    country: "United Kingdom",
    city: "London",
    lat: 51.51,
    lng: -0.13,
    message: "Thank you for always being there.",
  },
  {
    uid: "seed-miav-922231",
    miavId: "MIAV-922231",
    locationId: "SG:singapore",
    country: "Singapore",
    city: "Singapore",
    lat: 1.35,
    lng: 103.82,
    message: "Please, come this way.",
  },
  {
    uid: "seed-miav-922250",
    miavId: "MIAV-922250",
    locationId: "AU:sydney",
    country: "Australia",
    city: "Sydney",
    lat: -33.87,
    lng: 151.21,
    message: "Woof. I waited here, just like always.",
  },
];

/**
 * Insert story Memories with fixed miavIds, then rebuild map aggregates.
 * Character names are never stored — message + place only.
 */
export async function seedStoryMemories(): Promise<{
  created: string[];
  skipped: string[];
}> {
  const created: string[] = [];
  const skipped: string[] = [];
  const now = new Date().toISOString();

  for (const seed of STORY_MEMORY_SEEDS) {
    const existing = await getTraceByUid(seed.uid);
    if (existing) {
      skipped.push(seed.miavId);
      continue;
    }

    const fields: Record<string, FirestoreValue> = {
      miavId: { stringValue: seed.miavId },
      uid: { stringValue: seed.uid },
      authType: { stringValue: "google" },
      locationId: { stringValue: seed.locationId },
      country: { stringValue: seed.country },
      region: { stringValue: "" },
      city: { stringValue: seed.city },
      lat: { doubleValue: seed.lat },
      lng: { doubleValue: seed.lng },
      message: { stringValue: seed.message },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
      expiresAt: { nullValue: null },
    };

    const response = await firestoreFetch(
      `documents/${TRACE_COLLECTION}?documentId=${encodeURIComponent(seed.uid)}`,
      {
        method: "POST",
        body: JSON.stringify({ fields }),
      },
    );

    if (response.status === 409) {
      skipped.push(seed.miavId);
      continue;
    }
    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        err.error?.message || `Failed to seed ${seed.miavId}.`,
      );
    }
    created.push(seed.miavId);
  }

  await rebuildAggregatesFromTraces();

  const maxSeed = Math.max(
    ...STORY_MEMORY_SEEDS.map((s) => Number(s.miavId.replace("MIAV-", ""))),
  );
  const counterRes = await firestoreFetch("documents/meta/miav_counter");
  let lastNumber = 0;
  if (counterRes.ok) {
    const doc = (await counterRes.json()) as FirestoreDocument;
    lastNumber = readNumber(doc.fields, "lastNumber");
  }
  if (lastNumber < maxSeed) {
    if (counterRes.status === 404) {
      await firestoreFetch("documents/meta?documentId=miav_counter", {
        method: "POST",
        body: JSON.stringify({
          fields: { lastNumber: { integerValue: String(maxSeed) } },
        }),
      });
    } else if (counterRes.ok) {
      await firestoreFetch(
        "documents/meta/miav_counter?updateMask.fieldPaths=lastNumber",
        {
          method: "PATCH",
          body: JSON.stringify({
            fields: { lastNumber: { integerValue: String(maxSeed) } },
          }),
        },
      );
    }
  }

  return { created, skipped };
}

/** @deprecated Prefer overview + location queries. Kept for emergency rebuild. */
export async function listTracePins(): Promise<TracePin[]> {
  const records = await runTraceQuery({
    from: [{ collectionId: TRACE_COLLECTION }],
    orderBy: [
      {
        field: { fieldPath: "createdAt" },
        direction: "DESCENDING",
      },
    ],
  });
  return records.map(pinFromRecord);
}
