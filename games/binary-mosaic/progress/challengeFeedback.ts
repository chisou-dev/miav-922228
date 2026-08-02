/**
 * Challenge Feedback (Phase3-3) — local play results for UserLevels only.
 *
 * Separate storage from UserLevel library, Featured list, and public campaign
 * progress (`binary_block_progress`). Does NOT write into UserLevel records,
 * Featured schema, or levels.json.
 *
 * localStorage only — no network / Firebase / login / PII.
 * Does not call Generator / Solver / Evaluator / Pipeline / Session.
 */

import {
  getActiveUserLevelsKv,
  type UserLevelsKv,
} from "@/games/binary-mosaic/progress/userLevels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BINARY_BLOCK_CHALLENGE_FEEDBACK_KEY =
  "binary_block_challenge_feedback" as const;

/** Schema version for the feedback envelope. */
export const CHALLENGE_FEEDBACK_SCHEMA_VERSION = 1 as const;

/**
 * Max stored results. Upsert keeps one record per `userLevelId`; when the
 * total exceeds this cap, oldest-by-`playedAt` entries are dropped.
 */
export const MAX_CHALLENGE_FEEDBACK = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One Challenge play result for a UserLevel.
 * `time` is completion seconds (same unit as PatternResult.completionTimeSec).
 */
export type ChallengeFeedbackRecord = {
  userLevelId: string;
  /** true = Clear; false = Failed (if ever recorded). */
  clear: boolean;
  /** Completion time in seconds. */
  time: number;
  moves: number;
  hintsUsed: number;
  /** ISO-8601 when this result was saved. */
  playedAt: string;
};

export type ChallengeFeedbackStore = {
  schemaVersion: typeof CHALLENGE_FEEDBACK_SCHEMA_VERSION;
  results: ChallengeFeedbackRecord[];
};

export type SaveChallengeFeedbackInput = {
  userLevelId: string;
  clear: boolean;
  time: number;
  moves: number;
  hintsUsed: number;
  /** Optional fixed timestamp (tests); otherwise `new Date().toISOString()`. */
  playedAt?: string;
};

export type SaveChallengeFeedbackResult =
  | { ok: true; record: ChallengeFeedbackRecord }
  | {
      ok: false;
      reason: "INVALID_ID" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" | "QUOTA";
      error: string;
    };
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getKv(): UserLevelsKv | null {
  return getActiveUserLevelsKv();
}

function emptyStore(): ChallengeFeedbackStore {
  return {
    schemaVersion: CHALLENGE_FEEDBACK_SCHEMA_VERSION,
    results: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserLevelId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && !/^\d+$/.test(id);
}

function isValidFeedbackRecord(
  value: unknown,
): value is ChallengeFeedbackRecord {
  if (!isRecord(value)) return false;
  if (!isUserLevelId(value.userLevelId)) return false;
  if (typeof value.clear !== "boolean") return false;
  if (typeof value.time !== "number" || !Number.isFinite(value.time) || value.time < 0) {
    return false;
  }
  if (
    typeof value.moves !== "number" ||
    !Number.isFinite(value.moves) ||
    value.moves < 0
  ) {
    return false;
  }
  if (
    typeof value.hintsUsed !== "number" ||
    !Number.isFinite(value.hintsUsed) ||
    value.hintsUsed < 0
  ) {
    return false;
  }
  if (typeof value.playedAt !== "string" || value.playedAt.length === 0) {
    return false;
  }
  return true;
}

function isValidStore(value: unknown): value is ChallengeFeedbackStore {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== CHALLENGE_FEEDBACK_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.results)) return false;
  return value.results.every(isValidFeedbackRecord);
}

function sortByPlayedAtAsc(
  records: ChallengeFeedbackRecord[],
): ChallengeFeedbackRecord[] {
  return [...records].sort((a, b) => {
    if (a.playedAt < b.playedAt) return -1;
    if (a.playedAt > b.playedAt) return 1;
    return 0;
  });
}

/** Keep latest per userLevelId (by playedAt), then enforce total cap. */
function normalizeResults(
  records: ChallengeFeedbackRecord[],
): ChallengeFeedbackRecord[] {
  const byId = new Map<string, ChallengeFeedbackRecord>();
  for (const record of records) {
    if (!isValidFeedbackRecord(record)) continue;
    const prev = byId.get(record.userLevelId);
    if (!prev || record.playedAt >= prev.playedAt) {
      byId.set(record.userLevelId, {
        userLevelId: record.userLevelId,
        clear: record.clear,
        time: record.time,
        moves: Math.floor(record.moves),
        hintsUsed: Math.floor(record.hintsUsed),
        playedAt: record.playedAt,
      });
    }
  }
  const unique = sortByPlayedAtAsc([...byId.values()]);
  if (unique.length <= MAX_CHALLENGE_FEEDBACK) return unique;
  return unique.slice(unique.length - MAX_CHALLENGE_FEEDBACK);
}

function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  if (err && typeof err === "object" && "name" in err) {
    return (err as { name?: string }).name === "QuotaExceededError";
  }
  return false;
}

function writeStore(
  store: ChallengeFeedbackStore,
):
  | { ok: true }
  | { ok: false; reason: "STORAGE_UNAVAILABLE" | "QUOTA" | "WRITE_FAILED" } {
  const kv = getKv();
  if (!kv) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  try {
    kv.setItem(BINARY_BLOCK_CHALLENGE_FEEDBACK_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { ok: false, reason: "QUOTA" };
    }
    return { ok: false, reason: "WRITE_FAILED" };
  }
}

/** Load the full store. Empty defaults if missing, corrupt, or no storage. */
export function loadChallengeFeedbackStore(): ChallengeFeedbackStore {
  const kv = getKv();
  if (!kv) return emptyStore();
  try {
    const raw = kv.getItem(BINARY_BLOCK_CHALLENGE_FEEDBACK_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStore(parsed)) {
      kv.removeItem?.(BINARY_BLOCK_CHALLENGE_FEEDBACK_KEY);
      return emptyStore();
    }
    return {
      schemaVersion: CHALLENGE_FEEDBACK_SCHEMA_VERSION,
      results: normalizeResults(parsed.results),
    };
  } catch {
    try {
      kv.removeItem?.(BINARY_BLOCK_CHALLENGE_FEEDBACK_KEY);
    } catch {
      /* ignore */
    }
    return emptyStore();
  }
}

// ---------------------------------------------------------------------------
// APIs
// ---------------------------------------------------------------------------

/**
 * Upsert latest result for a UserLevel id.
 * Public numeric ids are rejected. Cap: {@link MAX_CHALLENGE_FEEDBACK}.
 */
export function saveChallengeFeedback(
  input: SaveChallengeFeedbackInput,
): SaveChallengeFeedbackResult {
  if (!isUserLevelId(input.userLevelId)) {
    return {
      ok: false,
      reason: "INVALID_ID",
      error: "Invalid UserLevel id.",
    };
  }
  if (!getKv()) {
    return {
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
      error: "Storage unavailable. Changes could not be saved.",
    };
  }

  const record: ChallengeFeedbackRecord = {
    userLevelId: input.userLevelId,
    clear: input.clear,
    time: Math.max(0, input.time),
    moves: Math.max(0, Math.floor(input.moves)),
    hintsUsed: Math.max(0, Math.floor(input.hintsUsed)),
    playedAt: input.playedAt ?? new Date().toISOString(),
  };

  const store = loadChallengeFeedbackStore();
  const without = store.results.filter(
    (r) => r.userLevelId !== record.userLevelId,
  );
  const next: ChallengeFeedbackStore = {
    schemaVersion: CHALLENGE_FEEDBACK_SCHEMA_VERSION,
    results: normalizeResults([...without, record]),
  };
  const written = writeStore(next);
  if (!written.ok) {
    return {
      ok: false,
      reason: written.reason === "QUOTA" ? "QUOTA" : "WRITE_FAILED",
      error: "Storage is full. Delete an old level and try again.",
    };
  }
  return { ok: true, record };
}

/** Latest feedback for one UserLevel, or null if none. */
export function getChallengeFeedback(
  userLevelId: string,
): ChallengeFeedbackRecord | null {
  if (!isUserLevelId(userLevelId)) return null;
  return (
    loadChallengeFeedbackStore().results.find(
      (r) => r.userLevelId === userLevelId,
    ) ?? null
  );
}

/** All stored results (newest first). */
export function listChallengeFeedback(): ChallengeFeedbackRecord[] {
  return sortByPlayedAtAsc(loadChallengeFeedbackStore().results).reverse();
}

/**
 * Remove feedback for one UserLevel id.
 * Missing id is success (nothing to clear). Does not touch UserLevel / Featured.
 */
export function deleteChallengeFeedback(
  userLevelId: string,
):
  | { ok: true }
  | {
      ok: false;
      reason: "INVALID_ID" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" | "QUOTA";
      error: string;
    } {
  if (!isUserLevelId(userLevelId)) {
    return {
      ok: false,
      reason: "INVALID_ID",
      error: "Invalid UserLevel id.",
    };
  }
  if (!getKv()) {
    return {
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
      error: "Storage unavailable. Changes could not be saved.",
    };
  }

  const store = loadChallengeFeedbackStore();
  const nextResults = store.results.filter(
    (r) => r.userLevelId !== userLevelId,
  );
  if (nextResults.length === store.results.length) {
    return { ok: true };
  }
  const written = writeStore({
    schemaVersion: CHALLENGE_FEEDBACK_SCHEMA_VERSION,
    results: nextResults,
  });
  if (!written.ok) {
    return {
      ok: false,
      reason: written.reason === "QUOTA" ? "QUOTA" : "WRITE_FAILED",
      error: "Storage is full. Delete an old level and try again.",
    };
  }
  return { ok: true };
}
