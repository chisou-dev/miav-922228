/**
 * Service-account env parsing without importing firebase-admin.
 * Safe to use from health checks and other lightweight server routes.
 */

export type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function normalizeServiceAccountRaw(raw: string): string {
  let value = raw.trim();

  // Vercel UI sometimes wraps the whole JSON in quotes.
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1).trim();
  }

  // Optional: store as base64 to avoid newline/escaping issues in dashboards.
  if (!value.startsWith("{")) {
    try {
      const decoded = Buffer.from(value, "base64").toString("utf8").trim();
      if (decoded.startsWith("{")) {
        return decoded;
      }
    } catch {
      // Fall through to JSON.parse and surface a clear error.
    }
  }

  return value;
}

export function parseServiceAccountFromEnv(): ServiceAccountJson | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(
      normalizeServiceAccountRaw(raw),
    ) as ServiceAccountJson;
    if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields.",
      );
    }
    return parsed;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("missing required")
    ) {
      throw error;
    }
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

export function isFirebaseAdminEnvConfigured(): boolean {
  try {
    return Boolean(parseServiceAccountFromEnv());
  } catch {
    return false;
  }
}

/**
 * Normalize admin UID values pasted into Vercel / .env
 * (trim, strip BOM / wrapping quotes).
 */
export function normalizeAdminUid(value: string | undefined | null): string | null {
  if (!value) return null;
  let uid = value.trim().replace(/^\uFEFF/, "");
  if (
    (uid.startsWith('"') && uid.endsWith('"')) ||
    (uid.startsWith("'") && uid.endsWith("'"))
  ) {
    uid = uid.slice(1, -1).trim();
  }
  return uid || null;
}

/**
 * All configured admin UIDs (server + public).
 * API auth accepts a token whose uid matches ANY of these.
 */
export function getAdminUidsFromEnv(): string[] {
  const uids = new Set<string>();
  for (const raw of [
    process.env.ADMIN_UID,
    process.env.NEXT_PUBLIC_ADMIN_UID,
  ]) {
    const uid = normalizeAdminUid(raw);
    if (uid) uids.add(uid);
  }
  return [...uids];
}

export function getAdminUidFromEnv(): string | null {
  return getAdminUidsFromEnv()[0] ?? null;
}

export function isAllowedAdminUid(uid: string): boolean {
  const normalized = normalizeAdminUid(uid);
  if (!normalized) return false;
  return getAdminUidsFromEnv().includes(normalized);
}

/** True when both env vars are set and equal after normalization. */
export function areAdminUidEnvVarsAligned(): boolean | null {
  const server = normalizeAdminUid(process.env.ADMIN_UID);
  const pub = normalizeAdminUid(process.env.NEXT_PUBLIC_ADMIN_UID);
  if (!server || !pub) return null;
  return server === pub;
}
