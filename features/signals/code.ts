import { getSignalDefinitionByPrefix } from "@/features/signals/definitions";
import type { SignalDefinition } from "@/features/signals/types";

/** Full code: MIAV-N14-XXXX-XXXX */
export const SIGNAL_CODE_RE =
  /^(MIAV-[A-Z0-9]+)-([A-F0-9]{4})-([A-F0-9]{4})$/i;

export type ParsedSignalCode = {
  prefix: string;
  checkA: string;
  checkB: string;
  normalized: string;
  definition: SignalDefinition;
};

export function normalizeSignalCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Client-safe format + catalog lookup (no secret).
 * Cryptographic check lives in codeServer / validate API.
 */
export function parseSignalCode(raw: string): ParsedSignalCode | null {
  const normalized = normalizeSignalCode(raw);
  const match = SIGNAL_CODE_RE.exec(normalized);
  if (!match) return null;

  const prefix = match[1]!.toUpperCase();
  const checkA = match[2]!.toUpperCase();
  const checkB = match[3]!.toUpperCase();
  const definition = getSignalDefinitionByPrefix(prefix);
  if (!definition) return null;

  return {
    prefix,
    checkA,
    checkB,
    normalized: `${prefix}-${checkA}-${checkB}`,
    definition,
  };
}

export function formatSignalCode(prefix: string, checksum: string): string {
  const cleanPrefix = prefix.trim().toUpperCase();
  const hex = checksum.replace(/[^A-Fa-f0-9]/g, "").toUpperCase().padEnd(8, "0").slice(0, 8);
  return `${cleanPrefix}-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
