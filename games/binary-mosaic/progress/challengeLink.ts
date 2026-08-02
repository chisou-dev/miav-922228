/**
 * Direct Challenge Link — portable Share Code payload in a URL fragment.
 *
 * Format: `https://miav-games.vercel.app/game/binary-mosaic#challenge={rawShareCode}`
 * Data lives in `#` only (no query params, no server, no short IDs).
 * Decode validates via the same Import path as Share Code (without auto-save).
 */

import {
  decodePortableShareCodeToJson,
  encodeUserLevelShareCodeRaw,
  USER_LEVEL_SHARE_PREFIX,
} from "@/games/binary-mosaic/progress/shareCode";
import {
  CHALLENGE_LINK_COPY_FAILED_MESSAGE,
  CHALLENGE_LINK_INVALID_MESSAGE,
  CHALLENGE_LINK_TOO_LARGE_MESSAGE,
  parseUserLevelJson,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

/** Production origin used when building absolute share URLs. */
export const CHALLENGE_LINK_ORIGIN = "https://miav-games.vercel.app" as const;

/** Play route that receives `#challenge=` fragments. */
export const CHALLENGE_LINK_PATH = "/game/binary-mosaic" as const;

/** Fragment key — must stay in `#`, never query string. */
export const CHALLENGE_FRAGMENT_KEY = "challenge" as const;

/**
 * Max absolute Challenge Link length (chars).
 * Chosen to stay under common messaging-app / proxy URL limits while leaving
 * room for typical portable payloads (~1.5–3.5k). Measured in smoke tests.
 */
export const MAX_CHALLENGE_LINK_LENGTH = 6000;

export const CHALLENGE_SHARE_TITLE = "Binary Block Challenge" as const;
export const CHALLENGE_SHARE_TEXT =
  "Can you solve this Binary Block challenge?" as const;

export type BuildChallengeLinkResult =
  | { ok: true; url: string; payload: string; length: number }
  | {
      ok: false;
      reason: "ENCODE_ERROR" | "TOO_LARGE";
      error: string;
    };

export type DecodeChallengeLinkResult =
  | { ok: true; record: UserLevelRecord }
  | {
      ok: false;
      reason:
        | "MISSING"
        | "INVALID_PREFIX"
        | "INVALID_FORMAT"
        | "DECODE_ERROR"
        | "PARSE_ERROR"
        | "INVALID_SHAPE"
        | "UNSUPPORTED_SCHEMA"
        | "NOT_PORTABLE";
      error: string;
    };

function challengeFail(
  reason: Extract<DecodeChallengeLinkResult, { ok: false }>["reason"],
  error: string = CHALLENGE_LINK_INVALID_MESSAGE,
): DecodeChallengeLinkResult {
  return { ok: false, reason, error };
}

/**
 * Absolute Challenge Link base (origin + path), no fragment.
 * Prefers current origin in the browser; falls back to production URL.
 */
export function challengeLinkBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${CHALLENGE_LINK_PATH}`;
  }
  return `${CHALLENGE_LINK_ORIGIN}${CHALLENGE_LINK_PATH}`;
}

/**
 * Build `#challenge={portableRaw}` fragment from a UserLevel.
 * Uses {@link encodeUserLevelShareCodeRaw} (MIAV-BB- + base64url, no group hyphens).
 */
export function buildChallengeLink(
  record: UserLevelRecord,
  options?: { baseUrl?: string },
): BuildChallengeLinkResult {
  try {
    const payload = encodeUserLevelShareCodeRaw(record);
    const base = (options?.baseUrl ?? challengeLinkBaseUrl()).replace(
      /\/$/,
      "",
    );
    const url = `${base}#${CHALLENGE_FRAGMENT_KEY}=${payload}`;
    if (url.length > MAX_CHALLENGE_LINK_LENGTH) {
      return {
        ok: false,
        reason: "TOO_LARGE",
        error: CHALLENGE_LINK_TOO_LARGE_MESSAGE,
      };
    }
    return { ok: true, url, payload, length: url.length };
  } catch {
    return {
      ok: false,
      reason: "ENCODE_ERROR",
      error: CHALLENGE_LINK_INVALID_MESSAGE,
    };
  }
}

/**
 * Read `challenge` value from a location hash (client-only).
 * Returns null when absent / empty.
 */
export function readChallengePayloadFromHash(
  hash: string | null | undefined,
): string | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const value = params.get(CHALLENGE_FRAGMENT_KEY);
    if (value == null || value.trim() === "") return null;
    return value.trim();
  } catch {
    return null;
  }
}

/**
 * Decode + validate a Challenge Link payload without saving to My levels.
 * Accepts portable raw / grouped Share Codes (same body as export encode).
 */
export function decodeChallengeLinkPayload(
  encoded: string,
): DecodeChallengeLinkResult {
  try {
    const trimmed = encoded.trim();
    if (!trimmed) {
      return challengeFail("MISSING");
    }

    const code = trimmed.toUpperCase().startsWith(USER_LEVEL_SHARE_PREFIX)
      ? trimmed
      : `${USER_LEVEL_SHARE_PREFIX}${trimmed}`;

    const decoded = decodePortableShareCodeToJson(code);
    if (!decoded.ok) {
      return challengeFail(
        decoded.reason === "NOT_PORTABLE"
          ? "NOT_PORTABLE"
          : decoded.reason,
      );
    }

    const parsed = parseUserLevelJson(decoded.json);
    if (!parsed.ok) {
      return challengeFail(parsed.reason);
    }
    if (parsed.records.length !== 1) {
      return challengeFail("INVALID_SHAPE");
    }
    return { ok: true, record: parsed.records[0]! };
  } catch {
    return challengeFail("DECODE_ERROR");
  }
}

/**
 * True when the Web Share API is available (typically mobile browsers).
 * Client-only — safe to call after mount.
 */
export function canUseWebShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  );
}

/**
 * Remove `#challenge=…` (and any other hash) without navigation loops.
 * Client-only.
 */
export function clearChallengeFragment(): void {
  if (typeof window === "undefined") return;
  try {
    if (!window.location.hash) return;
    const next = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * Copy text to clipboard (clipboard API + textarea fallback).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export type ShareChallengeLinkOutcome =
  | { status: "shared" }
  | { status: "copied" }
  | { status: "aborted" }
  | { status: "failed"; error: string }
  | { status: "too_large"; error: string };

/**
 * Share via `navigator.share` when available; otherwise copy the Challenge Link.
 * Abort/cancel of the share sheet → `{ status: "aborted" }` (no error toast).
 */
export async function shareOrCopyChallengeLink(
  record: UserLevelRecord,
  options?: { baseUrl?: string },
): Promise<ShareChallengeLinkOutcome> {
  const built = buildChallengeLink(record, options);
  if (!built.ok) {
    if (built.reason === "TOO_LARGE") {
      return { status: "too_large", error: built.error };
    }
    return { status: "failed", error: built.error };
  }

  if (canUseWebShare()) {
    try {
      await navigator.share({
        title: CHALLENGE_SHARE_TITLE,
        text: CHALLENGE_SHARE_TEXT,
        url: built.url,
      });
      return { status: "shared" };
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "AbortError"
      ) {
        return { status: "aborted" };
      }
      // Fall back to copy on share failure (unsupported payload, etc.)
    }
  }

  const copied = await copyTextToClipboard(built.url);
  if (copied) return { status: "copied" };
  return {
    status: "failed",
    error: CHALLENGE_LINK_COPY_FAILED_MESSAGE,
  };
}
