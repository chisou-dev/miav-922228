import "server-only";

import { getGoogleAccessToken } from "@/lib/firebase/googleAccessToken";
import {
  ANONYMOUS_TRACE_TTL_MS,
  formatMiavId,
  isTraceAuthType,
  toTracePin,
  TRACE_COLLECTION,
  type TraceAuthType,
  type TracePin,
  type TraceRecord,
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

async function allocateMiavNumber(): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const getRes = await firestoreFetch("documents/meta/miav_counter");
    let lastNumber = 0;
    let updateTime: string | undefined;

    if (getRes.status === 404) {
      const createRes = await firestoreFetch("documents/meta?documentId=miav_counter", {
        method: "POST",
        body: JSON.stringify({
          fields: {
            lastNumber: { integerValue: "1" },
          },
        }),
      });
      if (createRes.ok) return 1;
      // Race: another request created it — retry read/patch.
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
    if (patchRes.status === 400 || patchRes.status === 409 || patchRes.status === 412) {
      continue;
    }
    const err = (await patchRes.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to allocate MIAV ID.");
  }

  throw new Error("Failed to allocate MIAV ID after retries.");
}

export async function listTracePins(): Promise<TracePin[]> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: TRACE_COLLECTION }],
        orderBy: [
          {
            field: { fieldPath: "createdAt" },
            direction: "DESCENDING",
          },
        ],
      },
    }),
  });

  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
    error?: { message?: string };
  }>;

  if (!response.ok) {
    const message =
      Array.isArray(rows) && rows[0]?.error?.message
        ? rows[0].error.message
        : "Failed to list traces.";
    throw new Error(message);
  }

  if (!Array.isArray(rows)) return [];

  const now = Date.now();
  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toTraceRecord)
    .filter((trace) => {
      if (trace.authType !== "anonymous" || !trace.expiresAt) return true;
      return new Date(trace.expiresAt).getTime() > now;
    })
    .map(toTracePin);
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
  return toTraceRecord(doc);
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
  return toTraceRecord(doc);
}

/** Upgrade anonymous → permanent (Google) without changing miavId / createdAt. */
export async function upgradeTraceToPermanent(uid: string): Promise<TraceRecord> {
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
  return toTraceRecord(doc);
}

export async function deleteExpiredAnonymousTraces(): Promise<number> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: TRACE_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: "authType" },
            op: "EQUAL",
            value: { stringValue: "anonymous" },
          },
        },
      },
    }),
  });

  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;

  if (!response.ok || !Array.isArray(rows)) {
    throw new Error("Failed to query anonymous traces.");
  }

  const now = Date.now();
  let deleted = 0;

  for (const row of rows) {
    if (!row.document?.name) continue;
    const trace = toTraceRecord(row.document);
    if (!trace.expiresAt) continue;
    if (new Date(trace.expiresAt).getTime() > now) continue;

    const del = await firestoreFetch(
      `documents/${TRACE_COLLECTION}/${encodeURIComponent(trace.id)}`,
      { method: "DELETE" },
    );
    if (del.ok || del.status === 404) deleted += 1;
  }

  // MIAV numbers are never reused — counter is not decremented.
  return deleted;
}
