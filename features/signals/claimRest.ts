import "server-only";

import { getGoogleAccessToken } from "@/features/firebase/googleAccessToken";
import { signalClaimDocumentId } from "@/features/signals/claimId";
import { getSignalDefinition } from "@/features/signals/definitions";
import { issueSignalCode } from "@/features/signals/codeServer";
import { isAcquirableSignal } from "@/features/signals/definitions";
import { getMiavIdentity } from "@/features/world-memory/trace/identityRest";
import type { PublicMySignal } from "@/features/signals/types";

export const MIAV_SIGNAL_CLAIMS_COLLECTION = "miav_signal_claims";

export type MiavSignalClaimRecord = {
  id: string;
  uid: string;
  signalId: string;
  claimedAt: string;
  version: number;
};

export type { PublicMySignal };

type FirestoreValue =
  | { stringValue: string }
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

function readInt(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): number {
  const value = fields?.[key];
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

function toClaim(doc: FirestoreDocument): MiavSignalClaimRecord {
  return {
    id: documentIdFromName(doc.name),
    uid: readString(doc.fields, "uid"),
    signalId: readString(doc.fields, "signalId"),
    claimedAt: readTimestamp(doc.fields, "claimedAt", doc.createTime),
    version: readInt(doc.fields, "version") || 1,
  };
}

export async function getSignalClaim(
  uid: string,
  signalId: string,
): Promise<MiavSignalClaimRecord | null> {
  const id = signalClaimDocumentId(uid, signalId);
  const response = await firestoreFetch(
    `documents/${MIAV_SIGNAL_CLAIMS_COLLECTION}/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to load signal claim.");
  }
  return toClaim((await response.json()) as FirestoreDocument);
}

async function createSignalClaim(input: {
  uid: string;
  signalId: string;
  claimedAt: string;
}): Promise<MiavSignalClaimRecord | "conflict"> {
  const id = signalClaimDocumentId(input.uid, input.signalId);
  const response = await firestoreFetch(
    `documents/${MIAV_SIGNAL_CLAIMS_COLLECTION}?documentId=${encodeURIComponent(id)}`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          uid: { stringValue: input.uid },
          signalId: { stringValue: input.signalId },
          claimedAt: { timestampValue: input.claimedAt },
          version: { integerValue: "1" },
        },
      }),
    },
  );
  if (response.status === 409) return "conflict";
  if (!response.ok) {
    const err = (await response.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message || "Failed to create signal claim.");
  }
  return toClaim((await response.json()) as FirestoreDocument);
}

export async function listSignalClaimsForUid(
  uid: string,
): Promise<MiavSignalClaimRecord[]> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: MIAV_SIGNAL_CLAIMS_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: "uid" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
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
        : "Failed to query signal claims.";
    throw new Error(message);
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toClaim)
    .sort(
      (a, b) =>
        new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime(),
    );
}

function toPublicMySignal(claim: MiavSignalClaimRecord): PublicMySignal | null {
  const definition = getSignalDefinition(claim.signalId);
  if (!definition) return null;
  let code: string;
  try {
    code = issueSignalCode(claim.signalId);
  } catch {
    return null;
  }
  return {
    signalId: claim.signalId,
    title: definition.title,
    ...(definition.description
      ? { description: definition.description }
      : {}),
    source: definition.source,
    claimedAt: claim.claimedAt,
    code,
    rewardTargets: [...definition.rewardTargets],
  };
}

export type ClaimSignalsResult = {
  claimed: PublicMySignal[];
  alreadyClaimed: PublicMySignal[];
  rejected: Array<{ signalId: string; reason: string }>;
};

/**
 * Claim discoveries for a Google user who already has a MIAV Identity.
 * Does not allocate Identity. Idempotent per (uid, signalId).
 */
export async function claimSignalsForUid(
  uid: string,
  signalIds: string[],
): Promise<ClaimSignalsResult | { error: "MIAV_ID_REQUIRED" }> {
  const identity = await getMiavIdentity(uid);
  if (!identity?.miavId) {
    return { error: "MIAV_ID_REQUIRED" };
  }

  const claimed: PublicMySignal[] = [];
  const alreadyClaimed: PublicMySignal[] = [];
  const rejected: Array<{ signalId: string; reason: string }> = [];
  const now = new Date().toISOString();

  const unique = [...new Set(signalIds.map((id) => id.trim()).filter(Boolean))];

  for (const signalId of unique) {
    const definition = getSignalDefinition(signalId);
    if (!definition) {
      rejected.push({ signalId, reason: "UNKNOWN_SIGNAL" });
      continue;
    }
    if (!isAcquirableSignal(signalId)) {
      rejected.push({ signalId, reason: "NOT_ACQUIRABLE" });
      continue;
    }

    const existing = await getSignalClaim(uid, signalId);
    if (existing) {
      const pub = toPublicMySignal(existing);
      if (pub) alreadyClaimed.push(pub);
      continue;
    }

    const created = await createSignalClaim({
      uid,
      signalId,
      claimedAt: now,
    });
    if (created === "conflict") {
      const raced = await getSignalClaim(uid, signalId);
      if (raced) {
        const pub = toPublicMySignal(raced);
        if (pub) alreadyClaimed.push(pub);
      }
      continue;
    }

    const pub = toPublicMySignal(created);
    if (pub) claimed.push(pub);
  }

  return { claimed, alreadyClaimed, rejected };
}

/** Read-only list of claimed signals with server-generated codes. */
export async function listMySignalsForUid(
  uid: string,
): Promise<PublicMySignal[]> {
  const claims = await listSignalClaimsForUid(uid);
  const out: PublicMySignal[] = [];
  for (const claim of claims) {
    const pub = toPublicMySignal(claim);
    if (pub) out.push(pub);
  }
  return out;
}
