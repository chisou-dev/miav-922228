import "server-only";

import { getGoogleAccessToken } from "@/lib/firebase/googleAccessToken";
import {
  DEFAULT_SITE_CONTROL,
  SITE_CONTROL_COLLECTION,
  SITE_CONTROL_DOC_ID,
  SITE_CONTROL_DOC_PATH,
  type SiteControl,
} from "@/lib/site-control/types";

type FirestoreValue =
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

const CACHE_TTL_MS = 8_000;

let cache: { value: SiteControl; expiresAt: number } | null = null;

function readBoolean(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  const value = fields?.[key];
  if (value && "booleanValue" in value) return value.booleanValue;
  return fallback;
}

function readTimestamp(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): string | null {
  const value = fields?.[key];
  if (value && "timestampValue" in value) return value.timestampValue;
  return null;
}

function toSiteControl(doc: FirestoreDocument | null): SiteControl {
  if (!doc?.fields) return { ...DEFAULT_SITE_CONTROL };
  return {
    traceEnabled: readBoolean(doc.fields, "traceEnabled", true),
    contactEnabled: readBoolean(doc.fields, "contactEnabled", true),
    updatedAt: readTimestamp(doc.fields, "updatedAt"),
  };
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

export function invalidateSiteControlCache() {
  cache = null;
}

/** One Firestore read (cached briefly). Missing doc → both enabled. */
export async function getSiteControl(): Promise<SiteControl> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  try {
    const response = await firestoreFetch(
      `documents/${SITE_CONTROL_DOC_PATH}`,
    );
    if (response.status === 404) {
      const value = { ...DEFAULT_SITE_CONTROL };
      cache = { value, expiresAt: now + CACHE_TTL_MS };
      return value;
    }
    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      throw new Error(err.error?.message || "Failed to load site control.");
    }
    const doc = (await response.json()) as FirestoreDocument;
    const value = toSiteControl(doc);
    cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    // Fail open so literary pages keep working if config is briefly unreachable.
    const value = { ...DEFAULT_SITE_CONTROL };
    cache = { value, expiresAt: now + Math.min(CACHE_TTL_MS, 3_000) };
    return value;
  }
}

export async function setSiteControl(input: {
  traceEnabled: boolean;
  contactEnabled: boolean;
}): Promise<SiteControl> {
  const updatedAt = new Date().toISOString();
  const fields = {
    traceEnabled: { booleanValue: input.traceEnabled },
    contactEnabled: { booleanValue: input.contactEnabled },
    updatedAt: { timestampValue: updatedAt },
  };

  const getRes = await firestoreFetch(`documents/${SITE_CONTROL_DOC_PATH}`);

  if (getRes.status === 404) {
    const createRes = await firestoreFetch(
      `documents/${SITE_CONTROL_COLLECTION}?documentId=${SITE_CONTROL_DOC_ID}`,
      {
        method: "POST",
        body: JSON.stringify({ fields }),
      },
    );
    if (!createRes.ok) {
      const err = (await createRes.json()) as { error?: { message?: string } };
      throw new Error(err.error?.message || "Failed to create site control.");
    }
  } else if (!getRes.ok) {
    const err = (await getRes.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to load site control.");
  } else {
    const patchRes = await firestoreFetch(
      `documents/${SITE_CONTROL_DOC_PATH}?updateMask.fieldPaths=traceEnabled&updateMask.fieldPaths=contactEnabled&updateMask.fieldPaths=updatedAt`,
      {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      },
    );
    if (!patchRes.ok) {
      const err = (await patchRes.json()) as { error?: { message?: string } };
      throw new Error(err.error?.message || "Failed to update site control.");
    }
  }

  const value: SiteControl = {
    traceEnabled: input.traceEnabled,
    contactEnabled: input.contactEnabled,
    updatedAt,
  };
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
