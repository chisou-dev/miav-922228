import "server-only";

import { getGoogleAccessToken } from "@/features/firebase/googleAccessToken";
import { ensureMiavIdentity } from "@/features/world-memory/trace/identityRest";
import { activityDocumentId } from "@/features/world-memory/trace/activityId";
import {
  isTraceCategory,
  MIAV_WORK_DEFINITIONS,
  type TraceCategory,
} from "@/features/world-memory/trace/works";
import {
  TRACE_ACTIVITIES_COLLECTION,
  type TraceActivityRecord,
  type TracePin,
} from "@/features/world-memory/trace/types";
import { getPlaceById, placeToTraceFields } from "@/features/world-memory/location/places";
import {
  findLocationByNames,
  getLocationById,
  resolveLocationCoords,
} from "@/features/world-memory/location/locations";

export {
  activityDocumentId,
  mergeMemoryPins,
} from "@/features/world-memory/trace/activityId";

type FirestoreValue =
  | { stringValue: string }
  | { doubleValue: number }
  | { integerValue: string }
  | { timestampValue: string }
  | { nullValue: null };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

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

function toActivityRecord(doc: FirestoreDocument): TraceActivityRecord {
  const categoryRaw = readString(doc.fields, "category");
  return {
    id: documentIdFromName(doc.name),
    uid: readString(doc.fields, "uid"),
    miavId: readString(doc.fields, "miavId"),
    category: isTraceCategory(categoryRaw) ? categoryRaw : "read",
    workId: readString(doc.fields, "workId"),
    locationId: readString(doc.fields, "locationId") || null,
    country: readString(doc.fields, "country"),
    region: readString(doc.fields, "region"),
    city: readString(doc.fields, "city"),
    lat: readNumber(doc.fields, "lat"),
    lng: readNumber(doc.fields, "lng"),
    message: readString(doc.fields, "message"),
    createdAt: readTimestamp(doc.fields, "createdAt", doc.createTime),
    updatedAt: readTimestamp(doc.fields, "updatedAt", doc.updateTime),
  };
}

function catalogCoordsForActivity(record: {
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
}) {
  const place = record.locationId
    ? getPlaceById(record.locationId)
    : undefined;
  if (place) return placeToTraceFields(place);

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
    lat: fallback?.lat ?? 20,
    lng: fallback?.lng ?? 0,
  };
}

/** Public pin from Activity — never includes uid. */
export function pinFromActivity(record: TraceActivityRecord): TracePin {
  const coords = catalogCoordsForActivity(record);
  return {
    miavId: record.miavId,
    authType: "google",
    category: record.category,
    workId: record.workId,
    locationId: coords.locationId,
    country: coords.country,
    region: coords.region,
    city: coords.city,
    lat: coords.lat,
    lng: coords.lng,
    message: record.message,
    createdAt: record.createdAt,
  };
}

export async function getActivityByUidWork(
  uid: string,
  workId: string,
): Promise<TraceActivityRecord | null> {
  const id = activityDocumentId(uid, workId);
  const response = await firestoreFetch(
    `documents/${TRACE_ACTIVITIES_COLLECTION}/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to load activity.");
  }
  return toActivityRecord((await response.json()) as FirestoreDocument);
}

async function runActivityQuery(
  structuredQuery: Record<string, unknown>,
): Promise<TraceActivityRecord[]> {
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
        : "Failed to query activities.";
    throw new Error(message);
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toActivityRecord);
}

export async function listActivitiesByLocationId(
  locationId: string,
  limit = 200,
): Promise<TraceActivityRecord[]> {
  return runActivityQuery({
    from: [{ collectionId: TRACE_ACTIVITIES_COLLECTION }],
    where: {
      fieldFilter: {
        field: { fieldPath: "locationId" },
        op: "EQUAL",
        value: { stringValue: locationId },
      },
    },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit,
  });
}

export async function listRecentActivities(
  limit = 20,
): Promise<TraceActivityRecord[]> {
  return runActivityQuery({
    from: [{ collectionId: TRACE_ACTIVITIES_COLLECTION }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit,
  });
}

export async function listAllActivities(): Promise<TraceActivityRecord[]> {
  return runActivityQuery({
    from: [{ collectionId: TRACE_ACTIVITIES_COLLECTION }],
  });
}

/**
 * Works this Google user has already posted (Activities + Legacy Trace workId).
 * Does not invent workIds for unclassified Legacy Traces.
 */
export async function listPostedWorkIds(uid: string): Promise<string[]> {
  const ids = new Set<string>();

  for (const work of MIAV_WORK_DEFINITIONS) {
    const activity = await getActivityByUidWork(uid, work.id);
    if (activity) ids.add(work.id);
  }

  const { getTraceByUid } = await import(
    "@/features/world-memory/trace/traceRest"
  );
  const legacy = await getTraceByUid(uid);
  if (legacy?.authType === "google" && legacy.workId) {
    ids.add(legacy.workId);
  }

  return [...ids];
}

export async function userAlreadyPostedWork(
  uid: string,
  workId: string,
): Promise<boolean> {
  if (await getActivityByUidWork(uid, workId)) return true;
  const { getTraceByUid } = await import(
    "@/features/world-memory/trace/traceRest"
  );
  const legacy = await getTraceByUid(uid);
  return Boolean(legacy?.authType === "google" && legacy.workId === workId);
}

/**
 * Latest public Memory for status UI (newest Activity, else Legacy Trace).
 */
export async function getLatestPublicMemoryForUid(
  uid: string,
): Promise<TracePin | null> {
  let latest: TracePin | null = null;

  for (const work of MIAV_WORK_DEFINITIONS) {
    const activity = await getActivityByUidWork(uid, work.id);
    if (!activity) continue;
    const pin = pinFromActivity(activity);
    if (
      !latest ||
      new Date(pin.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = pin;
    }
  }

  const { getTraceByUid, pinFromRecord } = await import(
    "@/features/world-memory/trace/traceRest"
  );
  const legacy = await getTraceByUid(uid);
  if (legacy?.authType === "google") {
    const pin = pinFromRecord(legacy);
    if (
      !latest ||
      new Date(pin.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = pin;
    }
  }

  return latest;
}

export async function createActivity(input: {
  uid: string;
  category: TraceCategory;
  workId: string;
  locationId: string;
  country: string;
  region: string;
  city: string;
  message: string;
}): Promise<TracePin> {
  if (await userAlreadyPostedWork(input.uid, input.workId)) {
    throw new Error("ACTIVITY_EXISTS");
  }

  const identity = await ensureMiavIdentity(input.uid);

  const place = getPlaceById(input.locationId);
  if (!place) throw new Error("Invalid location.");
  const fieldsPlace = placeToTraceFields(place);

  const now = new Date().toISOString();
  const docId = activityDocumentId(input.uid, input.workId);

  const response = await firestoreFetch(
    `documents/${TRACE_ACTIVITIES_COLLECTION}?documentId=${encodeURIComponent(docId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          uid: { stringValue: input.uid },
          miavId: { stringValue: identity.miavId },
          category: { stringValue: input.category },
          workId: { stringValue: input.workId },
          locationId: { stringValue: fieldsPlace.locationId },
          country: { stringValue: fieldsPlace.country },
          region: { stringValue: fieldsPlace.region },
          city: { stringValue: fieldsPlace.city },
          lat: { doubleValue: fieldsPlace.lat },
          lng: { doubleValue: fieldsPlace.lng },
          message: { stringValue: input.message },
          createdAt: { timestampValue: now },
          updatedAt: { timestampValue: now },
        },
      }),
    },
  );

  if (response.status === 409) throw new Error("ACTIVITY_EXISTS");
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to create activity.");
  }

  const doc = (await response.json()) as FirestoreDocument;
  const record = toActivityRecord(doc);

  const { bumpLocationCount } = await import(
    "@/features/world-memory/trace/traceRest"
  );
  const { invalidateAggregateCache } = await import(
    "@/features/world-memory/trace/aggregateRest"
  );
  invalidateAggregateCache();
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

  return pinFromActivity(record);
}
