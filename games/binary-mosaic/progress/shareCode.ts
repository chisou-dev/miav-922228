/**
 * UserLevel Share Code (Phase2-18 / Phase2-19) — offline paste/copy transfer.
 *
 * Encodes the same single-level Export envelope as Phase2-7
 * (`exportUserLevelJson` / `importUserLevelJson`). Does NOT change
 * UserLevel save schema, LevelData, or call Generator / Solver / Evaluator.
 *
 * Portable (cross-device):
 *   Raw (Phase2-18): `MIAV-BB-` + base64url(compact export JSON)
 *   Grouped (Phase2-19): same payload, displayed as `MIAV-BB-XXXX-XXXX-…`
 *     (payload `-` escaped to `.` so group hyphens can be stripped safely)
 *
 * Same-browser short forms (not portable across devices/browsers):
 *   Legacy fingerprint: `MIAV-BB-` + 6-char id fingerprint (listUserLevels lookup)
 *   Local alias (Phase2-19): `MIAV-BB-XXXX-XXXX` via `binary_block_share_index`
 *     (separate localStorage key — does not change UserLevel record schema)
 */

import {
  DEVELOPER_CREDIT,
  exportUserLevelJson,
  getActiveUserLevelsKv,
  getUserLevel,
  importUserLevelJson,
  listUserLevels,
  normalizeCreatorName,
  type UserLevelRecord,
  type UserLevelsKv,
} from "@/games/binary-mosaic/progress/userLevels";

/** Share-code prefix (display + validation). */
export const USER_LEVEL_SHARE_PREFIX = "MIAV-BB-" as const;

/** Length of the optional same-device fingerprint segment (Phase2-18). */
export const USER_LEVEL_SHARE_FINGERPRINT_LEN = 6 as const;

/** Local short-alias body length (Phase2-19) — displayed as XXXX-XXXX. */
export const USER_LEVEL_SHARE_ALIAS_LEN = 8 as const;

/** Group size for human-friendly portable display. */
export const USER_LEVEL_SHARE_GROUP_SIZE = 4 as const;

/**
 * Separate localStorage key for short-alias → export JSON map.
 * Does NOT live on UserLevelRecord / user_levels store.
 */
export const BINARY_BLOCK_SHARE_INDEX_KEY = "binary_block_share_index" as const;

export const SHARE_INDEX_SCHEMA_VERSION = 1 as const;

/** Crockford Base32 (no I/L/O/U) — human-friendly short aliases. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" as const;

export type ImportShareCodeResult =
  | { ok: true; record: UserLevelRecord; upserted: boolean }
  | {
      ok: false;
      reason:
        | "INVALID_PREFIX"
        | "INVALID_FORMAT"
        | "DECODE_ERROR"
        | "PARSE_ERROR"
        | "INVALID_SHAPE"
        | "UNSUPPORTED_SCHEMA"
        | "NOT_FOUND"
        | "STORAGE_UNAVAILABLE"
        | "SAVE_FAILED"
        | "QUOTA"
        | "LEVEL_LIMIT";
      /** Short user-facing message (never throw / crash). */
      error: string;
    };
export type ShareCodeBundle = {
  /** Human-friendly grouped portable — prefer for Copy / SNS paste. */
  portableGrouped: string;
  /** Legacy Phase2-18 unhyphenated portable. */
  portableRaw: string;
  /**
   * Same-browser short alias `MIAV-BB-XXXX-XXXX`, or null if storage unavailable.
   * Not portable — look up only via {@link BINARY_BLOCK_SHARE_INDEX_KEY}.
   */
  localAlias: string | null;
};

type ShareIndexStore = {
  schemaVersion: typeof SHARE_INDEX_SCHEMA_VERSION;
  /** Uppercase 8-char alias body → compact single-level export JSON. */
  aliases: Record<string, string>;
};

// ---------------------------------------------------------------------------
// base64url (UTF-8) — browser + Node
// ---------------------------------------------------------------------------

function utf8ToBase64Url(text: string): string {
  let binary: string;
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(text);
    let s = "";
    for (let i = 0; i < bytes.length; i++) {
      s += String.fromCharCode(bytes[i]!);
    }
    binary = s;
  } else {
    binary = text;
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(text, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(encoded: string): string | null {
  try {
    const padded =
      encoded.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (encoded.length % 4)) % 4);
    if (typeof atob === "function") {
      const binary = atob(padded);
      if (typeof TextDecoder !== "undefined") {
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      }
      return binary;
    }
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Grouped human-friendly portable (Phase2-19)
// ---------------------------------------------------------------------------

/**
 * Escape base64url so `-` is not confused with group separators:
 * payload `-` → `.` (`.` is not in base64url).
 */
function escapeBase64UrlForGrouping(body: string): string {
  return body.replace(/-/g, ".");
}

/** Inverse of {@link escapeBase64UrlForGrouping}. */
function unescapeGroupedBase64Url(body: string): string {
  return body.replace(/\./g, "-");
}

/** Insert a hyphen every {@link USER_LEVEL_SHARE_GROUP_SIZE} characters. */
export function groupShareBody(
  body: string,
  groupSize: number = USER_LEVEL_SHARE_GROUP_SIZE,
): string {
  if (body.length === 0 || groupSize <= 0) return body;
  const parts: string[] = [];
  for (let i = 0; i < body.length; i += groupSize) {
    parts.push(body.slice(i, i + groupSize));
  }
  return parts.join("-");
}

/**
 * Strip spaces and group hyphens from a share-code body (keeps `_` and `.`).
 */
export function stripShareSeparators(body: string): string {
  return body.replace(/[\s-]/g, "");
}

/**
 * Format a portable share code for human paste (SNS / board).
 * Accepts raw or already-grouped `MIAV-BB-…` input.
 */
export function formatGroupedShareCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed.toUpperCase().startsWith(USER_LEVEL_SHARE_PREFIX)) {
    return trimmed;
  }
  const rawBody = trimmed.slice(USER_LEVEL_SHARE_PREFIX.length).trim();
  // Recover raw base64url whether input was grouped (escaped) or legacy raw.
  const stripped = stripShareSeparators(rawBody);
  const rawPayload = stripped.includes(".")
    ? unescapeGroupedBase64Url(stripped)
    : stripped;
  const escaped = escapeBase64UrlForGrouping(rawPayload);
  return `${USER_LEVEL_SHARE_PREFIX}${groupShareBody(escaped)}`;
}

/**
 * Normalize pasted input → prefix check + separator-stripped body.
 * Does not decode.
 */
export function normalizeShareCodeInput(
  code: string,
):
  | { ok: true; body: string }
  | { ok: false; reason: "INVALID_PREFIX" | "INVALID_FORMAT" } {
  const trimmed = code.trim();
  if (!trimmed.toUpperCase().startsWith(USER_LEVEL_SHARE_PREFIX)) {
    return { ok: false, reason: "INVALID_PREFIX" };
  }
  const body = stripShareSeparators(
    trimmed.slice(USER_LEVEL_SHARE_PREFIX.length).trim(),
  );
  if (body.length === 0) {
    return { ok: false, reason: "INVALID_FORMAT" };
  }
  return { ok: true, body };
}

// ---------------------------------------------------------------------------
// Fingerprint (Phase2-18 same-device short code)
// ---------------------------------------------------------------------------

/**
 * 6-char uppercase fingerprint derived from `userLevelId`
 * (same-device lookup only — not portable across devices).
 */
export function shortUserLevelShareFingerprint(userLevelId: string): string {
  let h = 2166136261;
  for (let i = 0; i < userLevelId.length; i++) {
    h ^= userLevelId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = h >>> 0;
  return n
    .toString(36)
    .toUpperCase()
    .padStart(USER_LEVEL_SHARE_FINGERPRINT_LEN, "0")
    .slice(-USER_LEVEL_SHARE_FINGERPRINT_LEN);
}

function isShortFingerprintBody(body: string): boolean {
  return (
    body.length === USER_LEVEL_SHARE_FINGERPRINT_LEN &&
    /^[0-9A-Z]+$/i.test(body)
  );
}

function findByFingerprint(fp: string): UserLevelRecord | undefined {
  const needle = fp.toUpperCase();
  return listUserLevels().find(
    (r) => shortUserLevelShareFingerprint(r.userLevelId) === needle,
  );
}

// ---------------------------------------------------------------------------
// Local short alias index (Phase2-19) — binary_block_share_index
// ---------------------------------------------------------------------------

function emptyShareIndex(): ShareIndexStore {
  return { schemaVersion: SHARE_INDEX_SCHEMA_VERSION, aliases: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidShareIndex(value: unknown): value is ShareIndexStore {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== SHARE_INDEX_SCHEMA_VERSION) return false;
  if (!isRecord(value.aliases)) return false;
  return Object.values(value.aliases).every((v) => typeof v === "string");
}

function readShareIndex(kv: UserLevelsKv): ShareIndexStore {
  try {
    const raw = kv.getItem(BINARY_BLOCK_SHARE_INDEX_KEY);
    if (!raw) return emptyShareIndex();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidShareIndex(parsed)) {
      kv.removeItem?.(BINARY_BLOCK_SHARE_INDEX_KEY);
      return emptyShareIndex();
    }
    return parsed;
  } catch {
    try {
      kv.removeItem?.(BINARY_BLOCK_SHARE_INDEX_KEY);
    } catch {
      /* ignore */
    }
    return emptyShareIndex();
  }
}

function writeShareIndex(kv: UserLevelsKv, store: ShareIndexStore): boolean {
  try {
    kv.setItem(BINARY_BLOCK_SHARE_INDEX_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function formatLocalAlias(body: string): string {
  const upper = body.toUpperCase();
  return `${USER_LEVEL_SHARE_PREFIX}${groupShareBody(upper)}`;
}

function isLocalAliasBody(body: string): boolean {
  return (
    body.length === USER_LEVEL_SHARE_ALIAS_LEN &&
    /^[0-9A-HJKMNP-TV-Z]+$/i.test(body)
  );
}

function randomAliasBody(): string {
  const chars: string[] = [];
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(USER_LEVEL_SHARE_ALIAS_LEN);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < USER_LEVEL_SHARE_ALIAS_LEN; i++) {
      chars.push(CROCKFORD[bytes[i]! % CROCKFORD.length]!);
    }
  } else {
    for (let i = 0; i < USER_LEVEL_SHARE_ALIAS_LEN; i++) {
      chars.push(
        CROCKFORD[Math.floor(Math.random() * CROCKFORD.length)]!,
      );
    }
  }
  return chars.join("");
}

function compactExportJson(record: UserLevelRecord): string {
  // Parse+stringify guarantees semantic equality with exportUserLevelJson.
  return JSON.stringify(JSON.parse(exportUserLevelJson(record)));
}

function resolveRecord(
  recordOrId: UserLevelRecord | string,
): UserLevelRecord | null {
  if (typeof recordOrId === "string") {
    return getUserLevel(recordOrId) ?? null;
  }
  return recordOrId;
}

function findAliasBodyForUserLevelId(
  store: ShareIndexStore,
  userLevelId: string,
): string | null {
  for (const [body, json] of Object.entries(store.aliases)) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (
        isRecord(parsed) &&
        isRecord(parsed.level) &&
        parsed.level.userLevelId === userLevelId
      ) {
        return body;
      }
    } catch {
      /* skip corrupt entry */
    }
  }
  return null;
}

/**
 * Drop local short-alias index entries that point at this userLevelId.
 * Does not invalidate portable Share Codes already copied elsewhere.
 * Best-effort; missing storage / no aliases → no-op success.
 */
export function removeLocalShareAliasesForUserLevel(
  userLevelId: string,
): boolean {
  if (typeof userLevelId !== "string" || userLevelId.length === 0) {
    return true;
  }
  const kv = getActiveUserLevelsKv();
  if (!kv) return true;
  const store = readShareIndex(kv);
  let changed = false;
  for (const [body, json] of Object.entries(store.aliases)) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (
        isRecord(parsed) &&
        isRecord(parsed.level) &&
        parsed.level.userLevelId === userLevelId
      ) {
        delete store.aliases[body];
        changed = true;
      }
    } catch {
      /* skip corrupt entry */
    }
  }
  if (!changed) return true;
  return writeShareIndex(kv, store);
}

/**
 * Look up an existing local short alias for a user level (same browser only).
 * Returns grouped `MIAV-BB-XXXX-XXXX` or null.
 */
export function getLocalShareAlias(
  recordOrId: UserLevelRecord | string,
): string | null {
  const record = resolveRecord(recordOrId);
  if (!record) return null;
  const kv = getActiveUserLevelsKv();
  if (!kv) return null;
  const body = findAliasBodyForUserLevelId(
    readShareIndex(kv),
    record.userLevelId,
  );
  return body ? formatLocalAlias(body) : null;
}

/**
 * Ensure a local short alias exists for this level (creates one if missing).
 * Portable share is unchanged — alias is same-browser only.
 */
export function ensureLocalShareAlias(
  recordOrId: UserLevelRecord | string,
): string | null {
  const existing = getLocalShareAlias(recordOrId);
  if (existing) return existing;
  return regenerateLocalShareAlias(recordOrId);
}

/**
 * Create or replace the local short alias for this level.
 * Only the local alias changes — portable code is content-deterministic.
 */
export function regenerateLocalShareAlias(
  recordOrId: UserLevelRecord | string,
): string | null {
  const record = resolveRecord(recordOrId);
  if (!record) return null;
  const kv = getActiveUserLevelsKv();
  if (!kv) return null;

  const normalized: UserLevelRecord = {
    ...record,
    creatorName: normalizeCreatorName(record.creatorName),
    developerCredit: DEVELOPER_CREDIT,
  };
  const exportJson = compactExportJson(normalized);
  const store = readShareIndex(kv);

  // Drop previous aliases that pointed at this userLevelId.
  const prev = findAliasBodyForUserLevelId(store, normalized.userLevelId);
  if (prev) {
    delete store.aliases[prev];
  }

  let body = randomAliasBody();
  let guard = 0;
  while (store.aliases[body] !== undefined && guard < 32) {
    body = randomAliasBody();
    guard += 1;
  }
  store.aliases[body] = exportJson;
  if (!writeShareIndex(kv, store)) return null;
  return formatLocalAlias(body);
}

// ---------------------------------------------------------------------------
// Encode / Generate / Import
// ---------------------------------------------------------------------------

/**
 * Encode a portable Share Code from a UserLevel record or stored id.
 *
 * Returns the **human-friendly grouped** form (Phase2-19).
 * Semantically identical to Phase2-18 after separator strip + `.`→`-` unescape.
 * Throws if `id` is not found in local storage.
 */
export function encodeUserLevelShareCode(
  recordOrId: UserLevelRecord | string,
): string {
  const record = resolveRecord(recordOrId);
  if (!record) {
    throw new Error("UserLevel not found");
  }
  const normalized: UserLevelRecord = {
    ...record,
    creatorName: normalizeCreatorName(record.creatorName),
    developerCredit: DEVELOPER_CREDIT,
  };
  const payload = utf8ToBase64Url(compactExportJson(normalized));
  return formatGroupedShareCode(`${USER_LEVEL_SHARE_PREFIX}${payload}`);
}

/**
 * Legacy Phase2-18 unhyphenated portable code (same payload as grouped).
 */
export function encodeUserLevelShareCodeRaw(
  recordOrId: UserLevelRecord | string,
): string {
  const record = resolveRecord(recordOrId);
  if (!record) {
    throw new Error("UserLevel not found");
  }
  const normalized: UserLevelRecord = {
    ...record,
    creatorName: normalizeCreatorName(record.creatorName),
    developerCredit: DEVELOPER_CREDIT,
  };
  const payload = utf8ToBase64Url(compactExportJson(normalized));
  return `${USER_LEVEL_SHARE_PREFIX}${payload}`;
}

/**
 * Short same-device Share Code: `MIAV-BB-` + 6-char fingerprint of id.
 * Useful for local display; import resolves via listUserLevels only.
 * Prefer {@link ensureLocalShareAlias} for the Phase2-19 XXXX-XXXX form.
 */
export function encodeUserLevelShortShareCode(
  recordOrId: UserLevelRecord | string,
): string {
  const id =
    typeof recordOrId === "string" ? recordOrId : recordOrId.userLevelId;
  if (typeof recordOrId === "string" && !getUserLevel(recordOrId)) {
    throw new Error("UserLevel not found");
  }
  return `${USER_LEVEL_SHARE_PREFIX}${shortUserLevelShareFingerprint(id)}`;
}

/**
 * Generate portable (grouped + raw) and ensure a local short alias when possible.
 */
export function generateUserLevelShareCodes(
  recordOrId: UserLevelRecord | string,
): ShareCodeBundle {
  const portableRaw = encodeUserLevelShareCodeRaw(recordOrId);
  const portableGrouped = formatGroupedShareCode(portableRaw);
  const localAlias = ensureLocalShareAlias(recordOrId);
  return { portableGrouped, portableRaw, localAlias };
}

/**
 * Validate share-code shape (prefix + non-empty body after separator strip).
 * Does not decode or look up storage.
 */
export function validateShareCode(code: string): boolean {
  return normalizeShareCodeInput(code).ok;
}

/**
 * Import / restore a UserLevel from a Share Code.
 *
 * Accepts:
 * - Grouped portable (Phase2-19)
 * - Legacy unhyphenated portable (Phase2-18)
 * - Local short alias `MIAV-BB-XXXX-XXXX` (same-browser index)
 * - Legacy 6-char fingerprint (same-device listUserLevels lookup)
 *
 * Does NOT call Generator / Solver / Evaluator.
 */
function shareFail(
  reason: Extract<ImportShareCodeResult, { ok: false }>["reason"],
  error: string,
): ImportShareCodeResult {
  return { ok: false, reason, error };
}

export function importUserLevelFromShareCode(
  code: string,
): ImportShareCodeResult {
  try {
    const normalized = normalizeShareCodeInput(code);
    if (!normalized.ok) {
      if (normalized.reason === "INVALID_PREFIX") {
        return shareFail(
          "INVALID_PREFIX",
          "Share Code must start with MIAV-BB-.",
        );
      }
      return shareFail(
        "INVALID_FORMAT",
        "Share Code format looks invalid.",
      );
    }
    const { body } = normalized;

    // Phase2-19 local short alias (8 Crockford chars)
    if (isLocalAliasBody(body)) {
      const kv = getActiveUserLevelsKv();
      if (!kv) {
        return shareFail(
          "STORAGE_UNAVAILABLE",
          "Storage unavailable. Changes could not be saved.",
        );
      }
      const json = readShareIndex(kv).aliases[body.toUpperCase()];
      if (!json) {
        return shareFail(
          "NOT_FOUND",
          "Short code not found on this device.",
        );
      }
      const imported = importUserLevelJson(json);
      if (!imported.ok) {
        return shareFail(imported.reason, imported.error);
      }
      if (imported.records.length !== 1) {
        return shareFail(
          "INVALID_SHAPE",
          "Share Code payload is not a valid UserLevel.",
        );
      }
      return {
        ok: true,
        record: imported.records[0]!,
        upserted: imported.upserted > 0,
      };
    }

    // Phase2-18 same-device short fingerprint
    if (isShortFingerprintBody(body)) {
      const found = findByFingerprint(body);
      if (!found) {
        return shareFail(
          "NOT_FOUND",
          "Short code not found on this device.",
        );
      }
      return { ok: true, record: found, upserted: false };
    }

    // Portable: grouped (escaped) or legacy raw base64url
    const payload = body.includes(".")
      ? unescapeGroupedBase64Url(body)
      : body;
    if (!/^[A-Za-z0-9_-]+$/.test(payload)) {
      return shareFail(
        "INVALID_FORMAT",
        "Broken Share Code. Could not decode.",
      );
    }
    const json = base64UrlToUtf8(payload);
    if (json === null) {
      return shareFail(
        "DECODE_ERROR",
        "Broken Share Code. Could not decode.",
      );
    }

    const imported = importUserLevelJson(json);
    if (!imported.ok) {
      return shareFail(imported.reason, imported.error);
    }
    if (imported.records.length !== 1) {
      // Share codes encode a single-level envelope only.
      return shareFail(
        "INVALID_SHAPE",
        "Share Code payload is not a valid UserLevel.",
      );
    }
    return {
      ok: true,
      record: imported.records[0]!,
      upserted: imported.upserted > 0,
    };
  } catch {
    return shareFail(
      "DECODE_ERROR",
      "Broken Share Code. Could not decode.",
    );
  }
}
