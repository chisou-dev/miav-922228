/**
 * Featured Challenge curation (Phase3-2) — local showcase list over UserLevels.
 *
 * Separate storage from UserLevel library (`binary_block_user_levels`) and
 * public campaign (`levels.json`). Stores references only (`userLevelId` +
 * `featuredAt`); display resolves live via `getUserLevel` (missing → hide).
 *
 * Does NOT write into UserLevel records or levels.json.
 * Does NOT call Generator / Solver / Evaluator / Pipeline.
 * localStorage only — no network / Firebase / login.
 */

import {
  getActiveUserLevelsKv,
  getUserLevel,
  type UserLevelRecord,
  type UserLevelsKv,
} from "@/games/binary-mosaic/progress/userLevels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BINARY_BLOCK_FEATURED_CHALLENGES_KEY =
  "binary_block_featured_challenges" as const;

/** Schema version for the featured envelope. */
export const FEATURED_CHALLENGES_SCHEMA_VERSION = 1 as const;

/**
 * Max featured entries. When exceeded on add, oldest (by `featuredAt`, then
 * insertion order) are dropped.
 */
export const MAX_FEATURED_CHALLENGES = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One curated reference — resolve via {@link getUserLevel} for display/play. */
export type FeaturedEntry = {
  userLevelId: string;
  /** ISO-8601 when this id was added / re-featured. */
  featuredAt: string;
};

export type FeaturedChallengesStore = {
  schemaVersion: typeof FEATURED_CHALLENGES_SCHEMA_VERSION;
  featured: FeaturedEntry[];
};

export type AddFeaturedResult =
  | { ok: true; entry: FeaturedEntry }
  | {
      ok: false;
      reason: "NOT_FOUND" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" | "QUOTA";
      error: string;
    };

export type RemoveFeaturedResult =
  | { ok: true }
  | {
      ok: false;
      reason: "NOT_FOUND" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" | "QUOTA";
      error: string;
    };
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getKv(): UserLevelsKv | null {
  return getActiveUserLevelsKv();
}

function emptyStore(): FeaturedChallengesStore {
  return {
    schemaVersion: FEATURED_CHALLENGES_SCHEMA_VERSION,
    featured: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserLevelId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && !/^\d+$/.test(id);
}

function isValidEntry(value: unknown): value is FeaturedEntry {
  if (!isRecord(value)) return false;
  if (!isUserLevelId(value.userLevelId)) return false;
  if (typeof value.featuredAt !== "string" || value.featuredAt.length === 0) {
    return false;
  }
  return true;
}

function isValidStore(value: unknown): value is FeaturedChallengesStore {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== FEATURED_CHALLENGES_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.featured)) return false;
  return value.featured.every(isValidEntry);
}

function sortByFeaturedAtAsc(entries: FeaturedEntry[]): FeaturedEntry[] {
  return [...entries].sort((a, b) => {
    if (a.featuredAt < b.featuredAt) return -1;
    if (a.featuredAt > b.featuredAt) return 1;
    return 0;
  });
}

function enforceCap(entries: FeaturedEntry[]): FeaturedEntry[] {
  if (entries.length <= MAX_FEATURED_CHALLENGES) return entries;
  return sortByFeaturedAtAsc(entries).slice(
    entries.length - MAX_FEATURED_CHALLENGES,
  );
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
  store: FeaturedChallengesStore,
):
  | { ok: true }
  | { ok: false; reason: "STORAGE_UNAVAILABLE" | "QUOTA" | "WRITE_FAILED" } {
  const kv = getKv();
  if (!kv) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  try {
    kv.setItem(BINARY_BLOCK_FEATURED_CHALLENGES_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { ok: false, reason: "QUOTA" };
    }
    return { ok: false, reason: "WRITE_FAILED" };
  }
}

/** Load the full store. Empty defaults if missing, corrupt, or no storage. */
export function loadFeaturedChallenges(): FeaturedChallengesStore {
  const kv = getKv();
  if (!kv) return emptyStore();
  try {
    const raw = kv.getItem(BINARY_BLOCK_FEATURED_CHALLENGES_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStore(parsed)) {
      kv.removeItem?.(BINARY_BLOCK_FEATURED_CHALLENGES_KEY);
      return emptyStore();
    }
    return {
      schemaVersion: FEATURED_CHALLENGES_SCHEMA_VERSION,
      featured: enforceCap(parsed.featured.filter(isValidEntry)),
    };
  } catch {
    try {
      kv.removeItem?.(BINARY_BLOCK_FEATURED_CHALLENGES_KEY);
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
 * List featured references (newest first).
 * Does not resolve UserLevels — use {@link listFeaturedLevels} for display.
 */
export function listFeatured(): FeaturedEntry[] {
  return sortByFeaturedAtAsc(loadFeaturedChallenges().featured).reverse();
}

/**
 * Resolve featured ids via {@link getUserLevel}.
 * Missing / deleted UserLevels are skipped (hidden).
 * Newest featured first.
 */
export function listFeaturedLevels(): UserLevelRecord[] {
  const out: UserLevelRecord[] = [];
  for (const entry of listFeatured()) {
    const record = getUserLevel(entry.userLevelId);
    if (record) out.push(record);
  }
  return out;
}

/** Whether `userLevelId` is currently in the featured list. */
export function isFeatured(userLevelId: string): boolean {
  if (!isUserLevelId(userLevelId)) return false;
  return loadFeaturedChallenges().featured.some(
    (e) => e.userLevelId === userLevelId,
  );
}

/**
 * Add (or re-feature) a UserLevel by id.
 * Requires the id to exist in the UserLevel library.
 * Cap: drops oldest when over {@link MAX_FEATURED_CHALLENGES}.
 */
export function addFeatured(userLevelId: string): AddFeaturedResult {
  if (!isUserLevelId(userLevelId)) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      error: "UserLevel not found.",
    };
  }
  if (!getUserLevel(userLevelId)) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      error: "UserLevel not found.",
    };
  }
  if (!getKv()) {
    return {
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
      error: "Storage unavailable. Changes could not be saved.",
    };
  }

  const entry: FeaturedEntry = {
    userLevelId,
    featuredAt: new Date().toISOString(),
  };
  const store = loadFeaturedChallenges();
  const without = store.featured.filter((e) => e.userLevelId !== userLevelId);
  const next: FeaturedChallengesStore = {
    schemaVersion: FEATURED_CHALLENGES_SCHEMA_VERSION,
    featured: enforceCap([...without, entry]),
  };
  const written = writeStore(next);
  if (!written.ok) {
    return {
      ok: false,
      reason: written.reason === "QUOTA" ? "QUOTA" : "WRITE_FAILED",
      error: "Storage is full. Delete an old level and try again.",
    };
  }
  return { ok: true, entry };
}

/**
 * Remove one featured reference.
 * Does not delete the underlying UserLevel.
 */
export function removeFeatured(userLevelId: string): RemoveFeaturedResult {
  if (!isUserLevelId(userLevelId)) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      error: "UserLevel not found.",
    };
  }
  const store = loadFeaturedChallenges();
  const nextFeatured = store.featured.filter(
    (e) => e.userLevelId !== userLevelId,
  );
  if (nextFeatured.length === store.featured.length) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      error: "Not in Featured.",
    };
  }
  const written = writeStore({
    schemaVersion: FEATURED_CHALLENGES_SCHEMA_VERSION,
    featured: nextFeatured,
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