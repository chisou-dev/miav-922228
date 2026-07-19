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
  type TraceFirstSummary,
  type TraceLatestSummary,
  type TraceLocationCluster,
  type TracePin,
  type TraceRecord,
  type TraceStats,
} from "@/lib/trace/types";
import { resolveLocationCoords } from "@/lib/trace/locations";

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
  return {
    id: documentIdFromName(doc.name),
    miavId: readString(doc.fields, "miavId"),
    uid: readString(doc.fields, "uid"),
    authType: isTraceAuthType(authRaw) ? authRaw : "anonymous",
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

async function runTraceQuery(structuredQuery: Record<string, unknown>) {
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

  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toTraceRecord)
    .filter((trace) => isActiveTrace(trace));
}

async function bumpLocationCount(
  location: { country: string; region: string; city: string; lat: number; lng: number },
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
    `documents/${TRACE_LOCATIONS_COLLECTION}/${id}?updateMask.fieldPaths=count&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          count: { integerValue: String(next) },
          lat: { doubleValue: location.lat },
          lng: { doubleValue: location.lng },
        },
      }),
    },
  );
}

function emptyStats(): TraceStats {
  return {
    countryCount: 0,
    cityCount: 0,
    permanentCount: 0,
    temporaryCount: 0,
    first: null,
    latest: null,
  };
}

function statsFromRecords(records: TraceRecord[]): TraceStats {
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
    first: first
      ? { miavId: first.miavId, createdAt: first.createdAt }
      : null,
    latest: latest
      ? {
          miavId: latest.miavId,
          country: latest.country,
          city: latest.city,
          messagePreview: previewMessage(latest.message),
          createdAt: latest.createdAt,
        }
      : null,
  };
}

async function writeTraceStats(stats: TraceStats) {
  const fields: Record<string, FirestoreValue> = {
    countryCount: { integerValue: String(stats.countryCount) },
    cityCount: { integerValue: String(stats.cityCount) },
    permanentCount: { integerValue: String(stats.permanentCount) },
    temporaryCount: { integerValue: String(stats.temporaryCount) },
    firstMiavId: stats.first
      ? { stringValue: stats.first.miavId }
      : { nullValue: null },
    firstCreatedAt: stats.first
      ? { timestampValue: stats.first.createdAt }
      : { nullValue: null },
    latestMiavId: stats.latest
      ? { stringValue: stats.latest.miavId }
      : { nullValue: null },
    latestCountry: stats.latest
      ? { stringValue: stats.latest.country }
      : { nullValue: null },
    latestCity: stats.latest
      ? { stringValue: stats.latest.city }
      : { nullValue: null },
    latestMessagePreview: stats.latest
      ? { stringValue: stats.latest.messagePreview }
      : { nullValue: null },
    latestCreatedAt: stats.latest
      ? { timestampValue: stats.latest.createdAt }
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

async function rebuildAggregatesFromTraces(): Promise<{
  stats: TraceStats;
  locations: TraceLocationCluster[];
}> {
  const records = await runTraceQuery({
    from: [{ collectionId: TRACE_COLLECTION }],
  });
  const stats = statsFromRecords(records);
  await writeTraceStats(stats);

  const byCity = new Map<string, TraceLocationCluster>();
  for (const trace of records) {
    const key = locationDocId(trace);
    const current = byCity.get(key);
    if (current) {
      current.count += 1;
    } else {
      byCity.set(key, {
        country: trace.country,
        region: trace.region,
        city: trace.city,
        lat: trace.lat,
        lng: trace.lng,
        count: 1,
      });
    }
  }

  for (const cluster of byCity.values()) {
    await bumpLocationCount(cluster, 0); // ensure write via set
    const id = locationDocId(cluster);
    await firestoreFetch(
      `documents/${TRACE_LOCATIONS_COLLECTION}?documentId=${id}`,
      {
        method: "POST",
        body: JSON.stringify({
          fields: {
            country: { stringValue: cluster.country },
            region: { stringValue: cluster.region },
            city: { stringValue: cluster.city },
            lat: { doubleValue: cluster.lat },
            lng: { doubleValue: cluster.lng },
            count: { integerValue: String(cluster.count) },
          },
        }),
      },
    ).catch(async () => {
      await firestoreFetch(
        `documents/${TRACE_LOCATIONS_COLLECTION}/${id}?updateMask.fieldPaths=count&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=country&updateMask.fieldPaths=region&updateMask.fieldPaths=city`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fields: {
              country: { stringValue: cluster.country },
              region: { stringValue: cluster.region },
              city: { stringValue: cluster.city },
              lat: { doubleValue: cluster.lat },
              lng: { doubleValue: cluster.lng },
              count: { integerValue: String(cluster.count) },
            },
          }),
        },
      );
    });
  }

  return { stats, locations: [...byCity.values()] };
}

async function readTraceStatsDoc(): Promise<TraceStats | null> {
  const response = await firestoreFetch(`documents/${TRACE_STATS_DOC}`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const doc = (await response.json()) as FirestoreDocument;
  const firstMiavId = readString(doc.fields, "firstMiavId");
  const latestMiavId = readString(doc.fields, "latestMiavId");
  const first: TraceFirstSummary | null = firstMiavId
    ? {
        miavId: firstMiavId,
        createdAt: readTimestamp(doc.fields, "firstCreatedAt"),
      }
    : null;
  const latest: TraceLatestSummary | null = latestMiavId
    ? {
        miavId: latestMiavId,
        country: readString(doc.fields, "latestCountry"),
        city: readString(doc.fields, "latestCity"),
        messagePreview: readString(doc.fields, "latestMessagePreview"),
        createdAt: readTimestamp(doc.fields, "latestCreatedAt"),
      }
    : null;

  return {
    countryCount: readNumber(doc.fields, "countryCount"),
    cityCount: readNumber(doc.fields, "cityCount"),
    permanentCount: readNumber(doc.fields, "permanentCount"),
    temporaryCount: readNumber(doc.fields, "temporaryCount"),
    first,
    latest,
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
    .map((doc) => ({
      country: readString(doc.fields, "country"),
      region: readString(doc.fields, "region"),
      city: readString(doc.fields, "city"),
      lat: readNumber(doc.fields, "lat"),
      lng: readNumber(doc.fields, "lng"),
      count: readNumber(doc.fields, "count"),
    }))
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
      .map((doc) => ({
        country: readString(doc.fields, "country"),
        region: readString(doc.fields, "region"),
        city: readString(doc.fields, "city"),
        lat: readNumber(doc.fields, "lat"),
        lng: readNumber(doc.fields, "lng"),
        count: readNumber(doc.fields, "count"),
      }))
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
  const { findCountry } = await import("@/lib/trace/locations");
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
  Array<{ name: string; lat: number; lng: number; count: number }>
> {
  const { findCountry, findRegion } = await import("@/lib/trace/locations");
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

  return region.cities.map((city) => ({
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    count: countByCity.get(city.name) || 0,
  }));
}

export async function getTraceStats(): Promise<TraceStats> {
  const existing = await readTraceStatsDoc();
  if (existing) return existing;
  const rebuilt = await rebuildAggregatesFromTraces();
  return rebuilt.stats;
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
    where: {
      compositeFilter: {
        op: "AND",
        filters,
      },
    },
    orderBy: [
      {
        field: { fieldPath: "createdAt" },
        direction: "DESCENDING",
      },
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
      traces: page.map(toTracePin),
      nextCursor: hasMore && last ? last.createdAt : null,
      hasMore,
    };
  } catch {
    // Fallback when composite index is missing — still scoped, never full scan.
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
      traces: page.map(toTracePin),
      nextCursor: hasMore && last ? last.createdAt : null,
      hasMore,
    };
  }
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
    return records.map(toTracePin);
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
      .map(toTracePin);
  }
}

async function refreshStatsAfterMutation(changed: TraceRecord) {
  const stats = await getTraceStats();
  const next = { ...stats };

  if (!next.first) {
    next.first = { miavId: changed.miavId, createdAt: changed.createdAt };
  } else if (
    new Date(changed.createdAt).getTime() <
    new Date(next.first.createdAt).getTime()
  ) {
    next.first = { miavId: changed.miavId, createdAt: changed.createdAt };
  }

  if (
    !next.latest ||
    new Date(changed.updatedAt || changed.createdAt).getTime() >=
      new Date(next.latest.createdAt).getTime() ||
    changed.miavId === next.latest.miavId
  ) {
    next.latest = {
      miavId: changed.miavId,
      country: changed.country,
      city: changed.city,
      messagePreview: previewMessage(changed.message),
      createdAt: changed.createdAt,
    };
  }

  // Recompute counts from location docs when possible; else light rebuild.
  const locations = await listTraceLocations();
  next.cityCount = locations.length;
  next.countryCount = new Set(locations.map((l) => l.country)).size;
  await writeTraceStats(next);
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
}): Promise<TraceRecord> {
  const existing = await getTraceByUid(input.uid);
  if (existing) {
    throw new Error("TRACE_EXISTS");
  }

  const coords = resolveLocationCoords({
    country: input.country,
    region: input.region,
    city: input.city,
  });
  if (!coords) {
    throw new Error("Invalid location.");
  }

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
    country: { stringValue: input.country },
    region: { stringValue: input.region },
    city: { stringValue: input.city },
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
      country: record.country,
      region: record.region,
      city: record.city,
      lat: record.lat,
      lng: record.lng,
    },
    1,
  );

  const stats = (await readTraceStatsDoc()) || emptyStats();
  stats.permanentCount += record.authType === "google" ? 1 : 0;
  stats.temporaryCount += record.authType === "anonymous" ? 1 : 0;
  if (!stats.first) {
    stats.first = { miavId: record.miavId, createdAt: record.createdAt };
  }
  stats.latest = {
    miavId: record.miavId,
    country: record.country,
    city: record.city,
    messagePreview: previewMessage(record.message),
    createdAt: record.createdAt,
  };
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
}): Promise<TraceRecord> {
  const existing = await getTraceByUid(input.uid);
  if (!existing) throw new Error("NOT_FOUND");

  const coords = resolveLocationCoords({
    country: input.country,
    region: input.region,
    city: input.city,
  });
  if (!coords) throw new Error("Invalid location.");

  const locationChanged =
    existing.country !== input.country ||
    existing.region !== input.region ||
    existing.city !== input.city;

  const updatedAt = new Date().toISOString();
  const response = await firestoreFetch(
    `documents/${TRACE_COLLECTION}/${encodeURIComponent(input.uid)}?updateMask.fieldPaths=country&updateMask.fieldPaths=region&updateMask.fieldPaths=city&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=message&updateMask.fieldPaths=updatedAt`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          country: { stringValue: input.country },
          region: { stringValue: input.region },
          city: { stringValue: input.city },
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
    const stats = (await readTraceStatsDoc()) || emptyStats();
    stats.temporaryCount = Math.max(0, stats.temporaryCount - 1);
    stats.permanentCount += 1;
    await writeTraceStats(stats);
  }

  return record;
}

export async function deleteExpiredAnonymousTraces(): Promise<number> {
  const records = await runTraceQuery({
    from: [{ collectionId: TRACE_COLLECTION }],
    where: {
      fieldFilter: {
        field: { fieldPath: "authType" },
        op: "EQUAL",
        value: { stringValue: "anonymous" },
      },
    },
  });

  const now = Date.now();
  let deleted = 0;

  for (const trace of records) {
    if (!trace.expiresAt) continue;
    if (new Date(trace.expiresAt).getTime() > now) continue;

    const del = await firestoreFetch(
      `documents/${TRACE_COLLECTION}/${encodeURIComponent(trace.id)}`,
      { method: "DELETE" },
    );
    if (del.ok || del.status === 404) {
      deleted += 1;
      await bumpLocationCount(
        {
          country: trace.country,
          region: trace.region,
          city: trace.city,
          lat: trace.lat,
          lng: trace.lng,
        },
        -1,
      );
    }
  }

  if (deleted > 0) {
    await rebuildAggregatesFromTraces();
  }

  return deleted;
}

export async function deleteTraceById(id: string): Promise<boolean> {
  const existing = await getTraceByUid(id);
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

  if (existing) {
    await bumpLocationCount(
      {
        country: existing.country,
        region: existing.region,
        city: existing.city,
        lat: existing.lat,
        lng: existing.lng,
      },
      -1,
    );
    await rebuildAggregatesFromTraces();
  }

  return true;
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
  return records.map(toTracePin);
}
