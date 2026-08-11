import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getSignalDefinition } from "@/features/signals/definitions";
import { formatSignalCode, parseSignalCode } from "@/features/signals/code";

/**
 * Server-only Signal Code mint / verify.
 * Secret never ships in the client bundle.
 * Production/preview: SIGNAL_CODE_SECRET is required — no CRON / SA fallbacks.
 */
function getSignalCodeSecret(): string {
  const explicit = process.env.SIGNAL_CODE_SECRET?.trim();
  if (explicit) return explicit;

  if (process.env.NODE_ENV === "development") {
    return "miav-signal-dev-only-not-for-production";
  }

  throw new Error("SIGNAL_CODE_SECRET is not configured.");
}

function checksumForSignal(signalId: string, codePrefix: string): string {
  const secret = getSignalCodeSecret();
  const payload = `v1|${signalId}|${codePrefix.toUpperCase()}`;
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 8);
}

export function issueSignalCode(signalId: string): string {
  const definition = getSignalDefinition(signalId);
  if (!definition) {
    throw new Error(`Unknown signal: ${signalId}`);
  }
  const checksum = checksumForSignal(definition.id, definition.codePrefix);
  return formatSignalCode(definition.codePrefix, checksum);
}

export function verifySignalCode(raw: string):
  | { ok: true; signalId: string; code: string }
  | { ok: false; reason: "INVALID_FORMAT" | "UNKNOWN_SIGNAL" } {
  const parsed = parseSignalCode(raw);
  if (!parsed) {
    const normalized = raw.trim();
    if (!normalized) return { ok: false, reason: "INVALID_FORMAT" };
    // Prefix unknown vs malformed
    const loose = /^(MIAV-[A-Z0-9]+)-([A-F0-9]{4})-([A-F0-9]{4})$/i.test(
      normalized.replace(/\s+/g, ""),
    );
    return {
      ok: false,
      reason: loose ? "UNKNOWN_SIGNAL" : "INVALID_FORMAT",
    };
  }

  const expected = checksumForSignal(
    parsed.definition.id,
    parsed.definition.codePrefix,
  ).toUpperCase();
  const actual = `${parsed.checkA}${parsed.checkB}`;

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return { ok: false, reason: "UNKNOWN_SIGNAL" };
  }

  return {
    ok: true,
    signalId: parsed.definition.id,
    code: parsed.normalized,
  };
}
