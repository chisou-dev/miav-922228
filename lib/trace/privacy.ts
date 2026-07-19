/**
 * Privacy policy copy for Trace Map — kept in one place for UI consistency.
 * Google Sign-In is identity-only; no Google profile fields are persisted.
 */

export const TRACE_STORED_FIELDS = [
  "uid",
  "miavId",
  "authType",
  "country",
  "region",
  "city",
  "lat",
  "lng",
  "message",
  "createdAt",
  "updatedAt",
  "expiresAt",
] as const;

/** Fields that must never be accepted or written for traces. */
export const TRACE_FORBIDDEN_PII_KEYS = [
  "email",
  "displayName",
  "photoURL",
  "phoneNumber",
  "name",
  "picture",
  "profile",
  "ip",
  "userAgent",
] as const;

export const TRACE_PRIVACY_BLURB = [
  "Google Sign-In is used only to identify your Trace.",
  "No personal information is stored.",
  "Only you can edit your Trace.",
  "The site does not edit user content.",
] as const;

export function bodyContainsForbiddenPii(
  body: Record<string, unknown>,
): string | null {
  for (const key of TRACE_FORBIDDEN_PII_KEYS) {
    if (key in body && body[key] != null && body[key] !== "") {
      return key;
    }
  }
  return null;
}
