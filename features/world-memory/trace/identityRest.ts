import "server-only";

import { getGoogleAccessToken } from "@/features/firebase/googleAccessToken";
import {
  allocateMiavNumber,
  getTraceByUid,
} from "@/features/world-memory/trace/traceRest";
import {
  formatMiavId,
  MIAV_IDENTITIES_COLLECTION,
  type MiavIdentityRecord,
} from "@/features/world-memory/trace/types";

type FirestoreValue =
  | { stringValue: string }
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

function readTimestamp(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
  fallback?: string,
): string {
  const value = fields?.[key];
  if (value && "timestampValue" in value) return value.timestampValue;
  return fallback || new Date(0).toISOString();
}

function toIdentity(doc: FirestoreDocument): MiavIdentityRecord {
  return {
    uid: documentIdFromName(doc.name),
    miavId: readString(doc.fields, "miavId"),
    createdAt: readTimestamp(doc.fields, "createdAt", doc.createTime),
    updatedAt: readTimestamp(doc.fields, "updatedAt", doc.updateTime),
  };
}

export async function getMiavIdentity(
  uid: string,
): Promise<MiavIdentityRecord | null> {
  const response = await firestoreFetch(
    `documents/${MIAV_IDENTITIES_COLLECTION}/${encodeURIComponent(uid)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to load MIAV identity.");
  }
  return toIdentity((await response.json()) as FirestoreDocument);
}

async function createIdentityDocument(input: {
  uid: string;
  miavId: string;
  createdAt: string;
}): Promise<MiavIdentityRecord | "conflict"> {
  const response = await firestoreFetch(
    `documents/${MIAV_IDENTITIES_COLLECTION}?documentId=${encodeURIComponent(input.uid)}`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          miavId: { stringValue: input.miavId },
          createdAt: { timestampValue: input.createdAt },
          updatedAt: { timestampValue: input.createdAt },
        },
      }),
    },
  );

  if (response.status === 409) return "conflict";
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to create MIAV identity.");
  }
  return toIdentity((await response.json()) as FirestoreDocument);
}

/**
 * Resolve or create the single public MIAV ID for a Google account.
 *
 * Order:
 * 1) Existing Identity
 * 2) Legacy Google Trace miavId (no new number)
 * 3) Allocate new number + create Identity
 *
 * Concurrent creates: loser re-reads winner — never two IDs per UID.
 */
export async function ensureMiavIdentity(
  uid: string,
): Promise<MiavIdentityRecord> {
  const existing = await getMiavIdentity(uid);
  if (existing?.miavId) return existing;

  const legacy = await getTraceByUid(uid);
  const legacyMiavId =
    legacy &&
    legacy.authType === "google" &&
    typeof legacy.miavId === "string" &&
    legacy.miavId.startsWith("MIAV-")
      ? legacy.miavId
      : null;

  const now = new Date().toISOString();
  const miavId =
    legacyMiavId || formatMiavId(await allocateMiavNumber());

  const created = await createIdentityDocument({
    uid,
    miavId,
    createdAt: now,
  });
  if (created !== "conflict") return created;

  const raced = await getMiavIdentity(uid);
  if (raced?.miavId) return raced;
  throw new Error("Failed to resolve MIAV identity after conflict.");
}
