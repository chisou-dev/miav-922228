/**
 * Privacy helpers for Trace Map API — PII denylist.
 * Policy copy lives in policyCopy.ts.
 */

export { TRACE_PRIVACY_BLURB } from "@/lib/trace/policyCopy";

export const TRACE_STORED_FIELDS = [
  "uid",
  "miavId",
  "authType",
  "locationId",
  "country",
  "region",
  "city",
  // Catalog representative coords at write time — never device GPS.
  // Public responses always re-resolve from Location Catalog.
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

/**
 * Keys that must never appear on public Memory / TracePin JSON.
 * Document id equals Firebase UID in this project.
 */
export const TRACE_PUBLIC_FORBIDDEN_KEYS = [
  "id",
  "uid",
  "email",
  "displayName",
  "photoURL",
  "ip",
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
