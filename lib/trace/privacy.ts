/**
 * Privacy helpers for Trace Map API — PII denylist.
 * Policy copy lives in policyCopy.ts.
 */

export { TRACE_PRIVACY_BLURB } from "@/lib/trace/policyCopy";

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
