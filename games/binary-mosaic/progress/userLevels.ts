/**
 * User-created level persistence (Phase2-5) + local Export/Import (Phase2-7)
 * + credit metadata (Phase2-16) + publish metadata (UserLevel-only).
 *
 * Share Code (Phase2-18/19) lives in sibling `progress/shareCode.ts` and reuses
 * this Export/Import envelope — no UserLevel schema migration.
 * Phase2-19 local short aliases use a separate key (`binary_block_share_index`).
 *
 * Separate from public campaign L1–30 (`levels.json` / `core/levelData`).
 * Separate from campaign progress (`binary_block_progress` / clearedLevels numbers).
 *
 * localStorage only — no network / Firebase / login.
 * Does not mutate LevelData format or merge into levels.json.
 *
 * Credits (`creatorName` / `developerCredit`) and publish fields
 * (`title` / `description` / `published` / `publishedAt`) live on
 * UserLevelRecord only — never on LevelData / Core. Public campaign play
 * has no credit or publish UI.
 *
 * Optional `hintLimit` (0–5) is also UserLevel-only. Missing → {@link DEFAULT_HINT_LIMIT} (3).
 * User Challenge play uses random 3-cell reveals; Campaign L1–30 hint rules are unchanged.
 *
 * `title` here is publish/showcase display title (not `levelData.title`).
 * Display preference: record.title → levelData.title → {@link DEFAULT_PUBLISH_TITLE}.
 *
 * publishedAt: set to ISO now when `published` becomes true (first publish or
 * re-publish). Prefer keep last publishedAt when unpublishing (`published` → false).
 *
 * Export/Import is local-only JSON (foundation for future share/cloud).
 * Import upserts by `userLevelId` (same id → overwrite; new id → append).
 * Import does NOT call Generator / Solver / Evaluator.
 * Missing credit / publish fields on old imports are filled with defaults (schema v1).
 *
 * Phase2-10 clear: playing a UserLevel shows ClearSequence / score only.
 * Does NOT write `binary_block_progress.clearedLevels` (public numeric ids only).
 * No unlock-next-public on user clear — return to level select.
 */

import type { CreatorIntent } from "@/games/binary-mosaic/core/generator";
import type {
  EvaluationProfile,
  EvaluatorResult,
} from "@/games/binary-mosaic/core/evaluator";
import type { LevelData } from "@/games/binary-mosaic/core/levelData";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BINARY_BLOCK_USER_LEVELS_KEY = "binary_block_user_levels";

/** Schema version for the stored envelope. */
export const USER_LEVELS_SCHEMA_VERSION = 1 as const;

/**
 * Max stored user levels. When exceeded on save, oldest records
 * (by `createdAt`, then insertion order) are dropped.
 */
export const MAX_USER_LEVELS = 50;

/**
 * Export/Import JSON format id (Phase2-7).
 * Envelope: `{ schemaVersion, format, level }` or `{ schemaVersion, format, levels }`.
 */
export const USER_LEVEL_EXPORT_FORMAT = "binary-block-user-level" as const;

/** Schema version for Export/Import envelopes (independent of storage store version). */
export const USER_LEVEL_EXPORT_SCHEMA_VERSION = 1 as const;

/** Default Creator Name when UI input is empty / missing on old imports. */
export const DEFAULT_CREATOR_NAME = "MIAV-1118";

/** Fixed developer credit — always set on save; not configurable. */
export const DEVELOPER_CREDIT = "MIAV-922228";

/**
 * Official MIAV homepage (repo: `components/GameLibrary.tsx` brand link).
 * Used for UserLevel Developer credit links only — not on Public play.
 */
export const DEVELOPER_HOME_URL = "https://www.miav-922228.com/" as const;

/** Default publish title when empty / missing on create or legacy coerce. */
export const DEFAULT_PUBLISH_TITLE = "Untitled Challenge";

/**
 * Import-side size limits only (do not change Generator / LevelData schema).
 * Conservative headroom above public L1–30 (max rows 11, cols 8, target 11,
 * pieces 22, cells 88) and AutoIntent pieceCount clamp (≤20).
 */
export const IMPORT_MAX_TARGET_TEXT_LENGTH = 32;
export const IMPORT_MAX_BOARD_ROWS = 24;
export const IMPORT_MAX_BOARD_COLS = 16;
export const IMPORT_MAX_CELLS = 192;
export const IMPORT_MAX_PIECE_COUNT = 32;

/** User-facing clipboard success (portable Share Code). */
export const SHARE_CODE_COPIED_MESSAGE = "Share Code copied.";

/** User-facing clipboard failure (Share Code / Export copy). */
export const CLIPBOARD_COPY_FAILED_MESSAGE =
  "Copy failed. Please select and copy the code manually.";

/** User-facing Challenge Link clipboard success (SHARE fallback). */
export const CHALLENGE_LINK_COPIED_MESSAGE =
  "Link copied.\nPaste it into LINE, X, Reddit, or another app.";

/** User-facing Challenge Link clipboard / share failure. */
export const CHALLENGE_LINK_COPY_FAILED_MESSAGE =
  "Sharing is not supported in this browser. Please select and copy the Challenge Link manually.";

/** User-facing Challenge Link too long for a direct URL. */
export const CHALLENGE_LINK_TOO_LARGE_MESSAGE =
  "This challenge is too large for a direct link. Use Copy Share Code instead.";

/** User-facing invalid / unsupported Challenge Link. */
export const CHALLENGE_LINK_INVALID_MESSAGE =
  "This challenge link is invalid or unsupported.";

/** User-facing success after saving a shared challenge locally. */
export const SAVED_TO_MY_LEVELS_MESSAGE = "Saved to My Levels.";

/** User-facing storage quota / write failure. */
export const STORAGE_FULL_MESSAGE =
  "Storage is full. Delete an old level and try again.";

/** User-facing level-cap failure. */
export const LEVEL_LIMIT_MESSAGE =
  "Level limit reached. Delete a level before saving another.";

/** User-facing storage unavailable. */
export const STORAGE_UNAVAILABLE_MESSAGE =
  "Storage unavailable. Changes could not be saved.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Allowed Hint press counts for User Challenges. */
export type HintLimit = 0 | 1 | 2 | 3 | 4 | 5;

/** Default when `hintLimit` is missing on older UserLevels. */
export const DEFAULT_HINT_LIMIT: HintLimit = 3;

export const HINT_LIMIT_OPTIONS: readonly HintLimit[] = [
  0, 1, 2, 3, 4, 5,
] as const;

/**
 * One persisted user-created level that passed Generator → Solver → Evaluator.
 * `seed` lives here (and on CreatorIntent) — never inside LevelData.
 * Credit + publish metadata are UserLevel-only (not LevelData / Core).
 */
export type UserLevelRecord = {
  /** Opaque id — `user:<uuid>`; must not collide with public numeric level ids. */
  userLevelId: string;
  /** Existing LevelData format, unchanged. */
  levelData: LevelData;
  /** Intent used to generate this level. */
  creatorIntent: CreatorIntent;
  /** Generation seed (not part of LevelData). */
  seed: number;
  /** Evaluation profile used when this level passed. */
  evaluationProfile: EvaluationProfile;
  /** Passed evaluation snapshot (reasons / score / metrics OK). */
  evaluatorResult: EvaluatorResult;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** Display credit from Creator UI (default {@link DEFAULT_CREATOR_NAME}). */
  creatorName: string;
  /** Fixed developer credit ({@link DEVELOPER_CREDIT}). */
  developerCredit: string;
  /**
   * Publish / showcase title (UserLevel-only; distinct from `levelData.title`).
   * Empty → {@link DEFAULT_PUBLISH_TITLE}.
   */
  title: string;
  /** Optional publish description (UserLevel-only). */
  description: string;
  /** Creator publish flag (local only; default false). */
  published: boolean;
  /**
   * ISO-8601 when last set to published; null if never published.
   * Kept on unpublish (last publishedAt preserved).
   */
  publishedAt: string | null;
  /**
   * Max Hint button presses for this User Challenge (0–5).
   * Optional for backward compatibility — missing → {@link DEFAULT_HINT_LIMIT}.
   * UserLevel-only; not LevelData / Core.
   */
  hintLimit: HintLimit;
};

export type UserLevelsStore = {
  schemaVersion: typeof USER_LEVELS_SCHEMA_VERSION;
  levels: UserLevelRecord[];
};

/** Minimal KV surface — localStorage or in-memory mock for Node smoke scripts. */
export type UserLevelsKv = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type CreateUserLevelInput = {
  levelData: LevelData;
  creatorIntent: CreatorIntent;
  seed: number;
  evaluationProfile: EvaluationProfile;
  evaluatorResult: EvaluatorResult;
  /**
   * Optional Creator Name from UI.
   * Empty / whitespace / omitted → {@link DEFAULT_CREATOR_NAME}.
   */
  creatorName?: string;
  /**
   * Optional publish title from Creator UI.
   * Empty / whitespace / omitted → `levelData.title` or {@link DEFAULT_PUBLISH_TITLE}.
   */
  title?: string;
  /** Optional publish description (default ""). */
  description?: string;
  /** Optional publish flag (default false). */
  published?: boolean;
  /**
   * Optional Hint press limit 0–5 (default {@link DEFAULT_HINT_LIMIT}).
   * UserLevel-only; drives User Challenge hint UX.
   */
  hintLimit?: HintLimit | number;
  /** Optional fixed id (tests); otherwise `user:<uuid>`. */
  userLevelId?: string;
  /** Optional fixed timestamp (tests); otherwise `new Date().toISOString()`. */
  createdAt?: string;
};

/** Patch for {@link updateUserLevelPublishMeta} — only publish fields. */
export type UpdateUserLevelPublishMetaInput = {
  title?: string;
  description?: string;
  published?: boolean;
};

export type UpdateUserLevelPublishMetaResult =
  | { ok: true; record: UserLevelRecord }
  | {
      ok: false;
      reason: "NOT_FOUND" | "STORAGE_UNAVAILABLE" | "SAVE_FAILED" | "QUOTA";
      error: string;
    };

export type CreateUserLevelResult =
  | { ok: true; record: UserLevelRecord }
  | {
      ok: false;
      reason:
        | "NOT_PASSED"
        | "STORAGE_UNAVAILABLE"
        | "QUOTA"
        | "LEVEL_LIMIT"
        | "SAVE_FAILED";
      error: string;
    };

export type DeleteUserLevelResult =
  | { ok: true }
  | { ok: false; error: string };

/** Dispatched on `window` after UserLevel create / import / delete (same tab). */
export const USER_LEVELS_CHANGED_EVENT =
  "binary-block-user-levels-changed" as const;

/** Notify listeners (My levels / Collection) to re-run `listUserLevels()`. */
export function notifyUserLevelsChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(USER_LEVELS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}
/**
 * Single-level export envelope.
 * Pretty-printed JSON; local-only (no network).
 */
export type UserLevelExportEnvelope = {
  schemaVersion: typeof USER_LEVEL_EXPORT_SCHEMA_VERSION;
  format: typeof USER_LEVEL_EXPORT_FORMAT;
  level: UserLevelRecord;
};

/** Multi-level export envelope (`exportAllUserLevels`). */
export type UserLevelsExportEnvelope = {
  schemaVersion: typeof USER_LEVEL_EXPORT_SCHEMA_VERSION;
  format: typeof USER_LEVEL_EXPORT_FORMAT;
  levels: UserLevelRecord[];
};

export type ImportUserLevelResult =
  | {
      ok: true;
      records: UserLevelRecord[];
      /** How many ids already existed and were overwritten. */
      upserted: number;
      /** How many ids were new. */
      inserted: number;
    }
  | {
      ok: false;
      reason:
        | "PARSE_ERROR"
        | "INVALID_SHAPE"
        | "UNSUPPORTED_SCHEMA"
        | "STORAGE_UNAVAILABLE"
        | "SAVE_FAILED"
        | "QUOTA"
        | "LEVEL_LIMIT";
      /** Short user-facing message (never throw / crash). */
      error: string;
    };
// ---------------------------------------------------------------------------
// Injectable storage (browser localStorage by default; Map mock for scripts)
// ---------------------------------------------------------------------------

let storageOverride: UserLevelsKv | null = null;

/** Inject KV for Node/smoke tests; pass `null` to restore default localStorage. */
export function setUserLevelsStorage(storage: UserLevelsKv | null): void {
  storageOverride = storage;
}

function getKv(): UserLevelsKv | null {
  if (storageOverride) return storageOverride;
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

/**
 * Active KV (injected mock or localStorage).
 * Used by Share Code short-alias index so smoke tests share one store.
 */
export function getActiveUserLevelsKv(): UserLevelsKv | null {
  return getKv();
}

/** Simple in-memory KV (e.g. smoke scripts without DOM). */
export function createMemoryUserLevelsKv(
  initial?: Record<string, string>,
): UserLevelsKv {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStore(): UserLevelsStore {
  return { schemaVersion: USER_LEVELS_SCHEMA_VERSION, levels: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserLevelId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && !/^\d+$/.test(id);
}

/** True when a storage write failed due to quota. */
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

/**
 * Validate LevelData geometry for Import only.
 * Checks board bounds, piece map integrity, and import size caps.
 * Does not call Generator / Solver / Evaluator.
 */
function validateLevelDataForImport(
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Invalid level data." };
  }
  if (typeof value.id !== "number" || !Number.isFinite(value.id)) {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (typeof value.title !== "string") {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (
    typeof value.rows !== "number" ||
    !Number.isInteger(value.rows) ||
    value.rows < 1
  ) {
    return { ok: false, error: "Invalid board size." };
  }
  if (
    typeof value.cols !== "number" ||
    !Number.isInteger(value.cols) ||
    value.cols < 1
  ) {
    return { ok: false, error: "Invalid board size." };
  }
  if (value.rows > IMPORT_MAX_BOARD_ROWS || value.cols > IMPORT_MAX_BOARD_COLS) {
    return { ok: false, error: "Board size is too large." };
  }
  if (value.rows * value.cols > IMPORT_MAX_CELLS) {
    return { ok: false, error: "Board size is too large." };
  }
  if (value.frame !== "rect" && value.frame !== "silhouette") {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (typeof value.targetText !== "string") {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (value.targetText.length > IMPORT_MAX_TARGET_TEXT_LENGTH) {
    return { ok: false, error: "Target text is too long." };
  }
  if (!Array.isArray(value.bits) || !Array.isArray(value.solution)) {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (typeof value.hintAllowed !== "boolean") {
    return { ok: false, error: "Level is missing required fields." };
  }
  if (
    value.bits.length !== value.rows ||
    value.solution.length !== value.rows
  ) {
    return { ok: false, error: "Board shape does not match rows/cols." };
  }

  /** pieceId → set of "r,c" keys (detect duplicates / overlaps). */
  const pieceCells = new Map<number, Set<string>>();
  const occupied = new Map<string, number>();

  for (let r = 0; r < value.rows; r += 1) {
    const bitRow = value.bits[r];
    const solRow = value.solution[r];
    if (!Array.isArray(bitRow) || !Array.isArray(solRow)) {
      return { ok: false, error: "Board shape does not match rows/cols." };
    }
    if (bitRow.length !== value.cols || solRow.length !== value.cols) {
      return { ok: false, error: "Board shape does not match rows/cols." };
    }
    for (let c = 0; c < value.cols; c += 1) {
      // Out-of-range / negative coords would only appear if dimensions lie —
      // still guard explicit numeric coords if ever present as objects.
      if (r < 0 || c < 0 || r >= value.rows || c >= value.cols) {
        return { ok: false, error: "Piece coordinates are out of range." };
      }
      const bit = bitRow[c];
      if (bit !== 0 && bit !== 1) {
        return { ok: false, error: "Invalid board bit values." };
      }
      const pid = solRow[c];
      if (typeof pid !== "number" || !Number.isInteger(pid) || pid < -1) {
        return { ok: false, error: "Invalid piece coordinates." };
      }
      if (pid === -1) continue;
      const key = `${r},${c}`;
      const prev = occupied.get(key);
      if (prev !== undefined && prev !== pid) {
        return { ok: false, error: "Pieces overlap on the board." };
      }
      occupied.set(key, pid);
      let cells = pieceCells.get(pid);
      if (!cells) {
        cells = new Set();
        pieceCells.set(pid, cells);
      }
      if (cells.has(key)) {
        return { ok: false, error: "Duplicate coordinates within a piece." };
      }
      cells.add(key);
    }
  }

  if (pieceCells.size > IMPORT_MAX_PIECE_COUNT) {
    return { ok: false, error: "Too many pieces." };
  }
  if (pieceCells.size === 0) {
    return { ok: false, error: "Level has no pieces." };
  }

  if (
    "rotatablePieceIndices" in value &&
    value.rotatablePieceIndices !== undefined
  ) {
    if (!Array.isArray(value.rotatablePieceIndices)) {
      return { ok: false, error: "Invalid rotatable piece indices." };
    }
    for (const idx of value.rotatablePieceIndices) {
      if (
        typeof idx !== "number" ||
        !Number.isInteger(idx) ||
        idx < 0 ||
        !pieceCells.has(idx)
      ) {
        return { ok: false, error: "Invalid rotatable piece indices." };
      }
    }
  }

  return { ok: true };
}

/** Light LevelData shape check — required fields + import geometry caps. */
function isValidLevelDataShape(value: unknown): boolean {
  return validateLevelDataForImport(value).ok;
}

/** Light CreatorIntent shape check — MVP required fields + import caps. */
function isValidCreatorIntentShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.targetText !== "string") return false;
  if (value.targetText.length > IMPORT_MAX_TARGET_TEXT_LENGTH) return false;
  if (!isRecord(value.boardSize)) return false;
  if (
    typeof value.boardSize.rows !== "number" ||
    !Number.isInteger(value.boardSize.rows) ||
    value.boardSize.rows < 1 ||
    value.boardSize.rows > IMPORT_MAX_BOARD_ROWS
  ) {
    return false;
  }
  if (
    typeof value.boardSize.cols !== "number" ||
    !Number.isInteger(value.boardSize.cols) ||
    value.boardSize.cols < 1 ||
    value.boardSize.cols > IMPORT_MAX_BOARD_COLS
  ) {
    return false;
  }
  if (value.boardSize.rows * value.boardSize.cols > IMPORT_MAX_CELLS) {
    return false;
  }
  if (
    typeof value.pieceCount !== "number" ||
    !Number.isInteger(value.pieceCount) ||
    value.pieceCount < 1 ||
    value.pieceCount > IMPORT_MAX_PIECE_COUNT
  ) {
    return false;
  }
  if (typeof value.rotateQuota !== "number") return false;
  if (typeof value.hintAllowed !== "boolean") return false;
  if (typeof value.seed !== "number" || !Number.isFinite(value.seed)) return false;
  return true;
}

/** Light EvaluatorResult shape check — required fields only. */
function isValidEvaluatorResultShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.passed !== "boolean") return false;
  if (typeof value.score !== "number" || !Number.isFinite(value.score)) return false;
  if (typeof value.difficulty !== "string") return false;
  if (!isRecord(value.metrics)) return false;
  if (!Array.isArray(value.reasons)) return false;
  if (typeof value.profile !== "string") return false;
  return true;
}

/** Normalize creator name: trim; empty / missing → default. */
export function normalizeCreatorName(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return DEFAULT_CREATOR_NAME;
}

/**
 * Normalize publish title: trim; empty / missing → `fallback` or
 * {@link DEFAULT_PUBLISH_TITLE}.
 */
export function normalizePublishTitle(
  value: unknown,
  fallback?: string,
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback.trim();
  }
  return DEFAULT_PUBLISH_TITLE;
}

/** Normalize publish description: string (trimmed) or "". */
export function normalizePublishDescription(value: unknown): string {
  if (typeof value === "string") return value.trim();
  return "";
}

/** Normalize published flag: boolean or false. */
export function normalizePublished(value: unknown): boolean {
  return value === true;
}

/**
 * Normalize publishedAt: ISO string kept as-is when non-empty string;
 * otherwise null.
 */
export function normalizePublishedAt(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

/**
 * Showcase / Collection display title:
 * publish `title` → `levelData.title` → {@link DEFAULT_PUBLISH_TITLE}.
 */
export function displayUserLevelTitle(record: UserLevelRecord): string {
  return normalizePublishTitle(record.title, record.levelData.title);
}

/** Coerce unknown → HintLimit; invalid / missing → {@link DEFAULT_HINT_LIMIT}. */
export function normalizeHintLimit(value: unknown): HintLimit {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
  ) {
    return value as HintLimit;
  }
  return DEFAULT_HINT_LIMIT;
}

/** Resolve hintLimit from a record (default 3 when absent). */
export function resolveHintLimit(
  record: Pick<UserLevelRecord, "hintLimit"> | null | undefined,
): HintLimit {
  if (!record) return DEFAULT_HINT_LIMIT;
  return normalizeHintLimit(record.hintLimit);
}

/** Creator preview label: "None" | "Up to N uses". */
export function formatHintLimitCreatorLabel(limit: HintLimit): string {
  if (limit === 0) return "None";
  return `Up to ${limit} uses`;
}

/** Challenge receive label: "None" | "N uses available". */
export function formatHintLimitChallengeLabel(limit: HintLimit): string {
  if (limit === 0) return "None";
  return `${limit} uses available`;
}

/**
 * Core shape check (pre–Phase2-16 records may omit credits / publish fields).
 * Credit + publish fields are filled by {@link coerceUserLevelRecord}.
 */
function isValidUserLevelRecordShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (!isUserLevelId(value.userLevelId)) return false;
  if (!isValidLevelDataShape(value.levelData)) return false;
  if (!isValidCreatorIntentShape(value.creatorIntent)) return false;
  if (typeof value.seed !== "number" || !Number.isFinite(value.seed)) return false;
  if (typeof value.evaluationProfile !== "string") return false;
  if (!isValidEvaluatorResultShape(value.evaluatorResult)) return false;
  if (typeof value.createdAt !== "string" || value.createdAt.length === 0) {
    return false;
  }
  // Soft credit check: if present, must be string (may be empty → defaulted).
  if ("creatorName" in value && typeof value.creatorName !== "string") {
    return false;
  }
  if (
    "developerCredit" in value &&
    typeof value.developerCredit !== "string"
  ) {
    return false;
  }
  // Soft publish checks: if present, types must be plausible.
  if ("title" in value && typeof value.title !== "string") {
    return false;
  }
  if ("description" in value && typeof value.description !== "string") {
    return false;
  }
  if ("published" in value && typeof value.published !== "boolean") {
    return false;
  }
  if (
    "publishedAt" in value &&
    value.publishedAt !== null &&
    typeof value.publishedAt !== "string"
  ) {
    return false;
  }
  // Soft hintLimit: if present, must be integer 0–5.
  if ("hintLimit" in value) {
    const h = value.hintLimit;
    if (
      typeof h !== "number" ||
      !Number.isInteger(h) ||
      h < 0 ||
      h > 5
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Coerce a raw record: fill missing creatorName / publish fields, force
 * developerCredit. Returns null if core shape is invalid.
 * Preserves other fields / insertion order from storage JSON.
 *
 * Legacy (missing publish): title ← levelData.title || DEFAULT_PUBLISH_TITLE;
 * description ""; published false; publishedAt null.
 */
export function coerceUserLevelRecord(value: unknown): UserLevelRecord | null {
  if (!isValidUserLevelRecordShape(value)) return null;
  const raw = value as UserLevelRecord & { hintLimit?: unknown };
  const levelTitle =
    typeof raw.levelData?.title === "string" ? raw.levelData.title : "";
  return {
    ...raw,
    creatorName: normalizeCreatorName(raw.creatorName),
    developerCredit: DEVELOPER_CREDIT,
    title: normalizePublishTitle(raw.title, levelTitle),
    description: normalizePublishDescription(raw.description),
    published: normalizePublished(raw.published),
    publishedAt: normalizePublishedAt(raw.publishedAt),
    hintLimit: normalizeHintLimit(
      "hintLimit" in raw ? raw.hintLimit : undefined,
    ),
  };
}

function isValidStore(value: unknown): value is UserLevelsStore {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== USER_LEVELS_SCHEMA_VERSION) return false;
  if (!Array.isArray(value.levels)) return false;
  return value.levels.every((level) => coerceUserLevelRecord(level) !== null);
}

function newUserLevelId(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `user:${uuid}`;
}

function sortByCreatedAtAsc(levels: UserLevelRecord[]): UserLevelRecord[] {
  return [...levels].sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return 0;
  });
}

function enforceCap(levels: UserLevelRecord[]): UserLevelRecord[] {
  if (levels.length <= MAX_USER_LEVELS) return levels;
  return sortByCreatedAtAsc(levels).slice(levels.length - MAX_USER_LEVELS);
}

type WriteStoreResult =
  | { ok: true }
  | { ok: false; reason: "STORAGE_UNAVAILABLE" | "QUOTA" | "WRITE_FAILED" };

function writeStore(store: UserLevelsStore): WriteStoreResult {
  const kv = getKv();
  if (!kv) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  try {
    kv.setItem(BINARY_BLOCK_USER_LEVELS_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { ok: false, reason: "QUOTA" };
    }
    return { ok: false, reason: "WRITE_FAILED" };
  }
}

/** Map storage write failure → user-facing copy. */
export function storageWriteErrorMessage(
  reason: "STORAGE_UNAVAILABLE" | "QUOTA" | "WRITE_FAILED" | "SAVE_FAILED",
): string {
  if (reason === "STORAGE_UNAVAILABLE") return STORAGE_UNAVAILABLE_MESSAGE;
  return STORAGE_FULL_MESSAGE;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** Load the full store. Empty defaults if missing, corrupt, or no storage. */
export function loadUserLevels(): UserLevelsStore {
  const kv = getKv();
  if (!kv) return emptyStore();
  try {
    const raw = kv.getItem(BINARY_BLOCK_USER_LEVELS_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStore(parsed)) {
      kv.removeItem?.(BINARY_BLOCK_USER_LEVELS_KEY);
      return emptyStore();
    }
    const levels = parsed.levels
      .map((level) => coerceUserLevelRecord(level))
      .filter((level): level is UserLevelRecord => level !== null);
    return {
      schemaVersion: USER_LEVELS_SCHEMA_VERSION,
      levels: enforceCap(levels),
    };
  } catch {
    try {
      kv.removeItem?.(BINARY_BLOCK_USER_LEVELS_KEY);
    } catch {
      /* ignore */
    }
    return emptyStore();
  }
}

/** List all stored user levels (newest first). */
export function listUserLevels(): UserLevelRecord[] {
  return sortByCreatedAtAsc(loadUserLevels().levels).reverse();
}

/**
 * Published Challenge Collection — UserLevels with `published === true` only.
 * Same order as {@link listUserLevels} (newest createdAt first). Additive helper.
 */
export function listPublishedUserLevels(): UserLevelRecord[] {
  return listUserLevels().filter((r) => r.published === true);
}

/** Look up one user level by id. */
export function getUserLevel(userLevelId: string): UserLevelRecord | undefined {
  return loadUserLevels().levels.find((r) => r.userLevelId === userLevelId);
}

/**
 * Upsert a user level record. Enforces MAX_USER_LEVELS (drops oldest).
 * Does not validate EvaluatorResult.passed — use `createUserLevel` for the gate.
 */
export function saveUserLevel(record: UserLevelRecord): boolean {
  return saveUserLevelDetailed(record).ok;
}

/**
 * Upsert with structured failure reasons (quota / write / unavailable).
 */
export function saveUserLevelDetailed(
  record: UserLevelRecord,
): WriteStoreResult | { ok: false; reason: "INVALID_ID" } {
  if (!isUserLevelId(record.userLevelId)) {
    return { ok: false, reason: "INVALID_ID" };
  }
  const levelTitle =
    typeof record.levelData?.title === "string" ? record.levelData.title : "";
  const normalized: UserLevelRecord = {
    ...record,
    creatorName: normalizeCreatorName(record.creatorName),
    developerCredit: DEVELOPER_CREDIT,
    title: normalizePublishTitle(record.title, levelTitle),
    description: normalizePublishDescription(record.description),
    published: normalizePublished(record.published),
    publishedAt: normalizePublishedAt(record.publishedAt),
    hintLimit: normalizeHintLimit(record.hintLimit),
  };
  const store = loadUserLevels();
  const without = store.levels.filter(
    (r) => r.userLevelId !== normalized.userLevelId,
  );
  const next: UserLevelsStore = {
    schemaVersion: USER_LEVELS_SCHEMA_VERSION,
    levels: enforceCap([...without, normalized]),
  };
  return writeStore(next);
}

/**
 * Remove one user level record only (no Featured / feedback / share-index cleanup).
 * Prefer `deleteUserLevelAndRelated` from the UI / progress orchestrator.
 */
export function deleteUserLevel(userLevelId: string): DeleteUserLevelResult {
  if (!isUserLevelId(userLevelId)) {
    return {
      ok: false,
      error: "Could not delete this challenge. Please try again.",
    };
  }
  if (!getKv()) {
    return {
      ok: false,
      error: STORAGE_UNAVAILABLE_MESSAGE,
    };
  }
  const store = loadUserLevels();
  const nextLevels = store.levels.filter((r) => r.userLevelId !== userLevelId);
  if (nextLevels.length === store.levels.length) {
    return {
      ok: false,
      error: "Could not delete this challenge. Please try again.",
    };
  }
  const written = writeStore({
    schemaVersion: USER_LEVELS_SCHEMA_VERSION,
    levels: nextLevels,
  });
  if (!written.ok) {
    return {
      ok: false,
      error:
        written.reason === "QUOTA" || written.reason === "WRITE_FAILED"
          ? "Could not delete this challenge. Please try again."
          : STORAGE_UNAVAILABLE_MESSAGE,
    };
  }
  return { ok: true };
}

/**
 * Gate + persist: saves only when `evaluatorResult.passed === true`.
 * Thin orchestrator helper — not UI.
 * Always sets `developerCredit` to {@link DEVELOPER_CREDIT}.
 * Empty / omitted `creatorName` → {@link DEFAULT_CREATOR_NAME}.
 * Publish: title from input or levelData.title / {@link DEFAULT_PUBLISH_TITLE};
 * description ""; published false unless input says true (then publishedAt = now).
 */
export function createUserLevel(
  input: CreateUserLevelInput,
): CreateUserLevelResult {
  if (!input.evaluatorResult.passed) {
    return {
      ok: false,
      reason: "NOT_PASSED",
      error: "Level did not pass evaluation.",
    };
  }
  if (!getKv()) {
    return {
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
      error: STORAGE_UNAVAILABLE_MESSAGE,
    };
  }

  const userLevelId = input.userLevelId ?? newUserLevelId();
  const existed = getUserLevel(userLevelId) !== undefined;
  if (!existed && loadUserLevels().levels.length >= MAX_USER_LEVELS) {
    return {
      ok: false,
      reason: "LEVEL_LIMIT",
      error: LEVEL_LIMIT_MESSAGE,
    };
  }

  const published = normalizePublished(input.published);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const record: UserLevelRecord = {
    userLevelId,
    levelData: input.levelData,
    creatorIntent: input.creatorIntent,
    seed: input.seed,
    evaluationProfile: input.evaluationProfile,
    evaluatorResult: input.evaluatorResult,
    createdAt,
    creatorName: normalizeCreatorName(input.creatorName),
    developerCredit: DEVELOPER_CREDIT,
    title: normalizePublishTitle(input.title, input.levelData.title),
    description: normalizePublishDescription(input.description),
    published,
    publishedAt: published ? createdAt : null,
    hintLimit: normalizeHintLimit(input.hintLimit),
  };

  const saved = saveUserLevelDetailed(record);
  if (!saved.ok) {
    if (saved.reason === "INVALID_ID") {
      return {
        ok: false,
        reason: "SAVE_FAILED",
        error: STORAGE_FULL_MESSAGE,
      };
    }
    return {
      ok: false,
      reason: saved.reason === "QUOTA" ? "QUOTA" : "SAVE_FAILED",
      error: storageWriteErrorMessage(saved.reason),
    };
  }
  notifyUserLevelsChanged();
  return { ok: true, record };
}

/**
 * Update publish metadata only (title / description / published).
 * Does not touch levelData, credits, seed, or evaluation fields.
 *
 * When `published` flips to true → set publishedAt = now.
 * When `published` becomes false → keep last publishedAt.
 */
export function updateUserLevelPublishMeta(
  userLevelId: string,
  patch: UpdateUserLevelPublishMetaInput,
): UpdateUserLevelPublishMetaResult {
  if (!getKv()) {
    return {
      ok: false,
      reason: "STORAGE_UNAVAILABLE",
      error: STORAGE_UNAVAILABLE_MESSAGE,
    };
  }
  const existing = getUserLevel(userLevelId);
  if (!existing) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      error: "UserLevel not found.",
    };
  }

  const nextPublished =
    patch.published !== undefined
      ? normalizePublished(patch.published)
      : existing.published;

  let nextPublishedAt = existing.publishedAt;
  if (nextPublished && !existing.published) {
    nextPublishedAt = new Date().toISOString();
  }
  // Unpublish: keep last publishedAt (prefer keep over clear).

  const next: UserLevelRecord = {
    ...existing,
    title:
      patch.title !== undefined
        ? normalizePublishTitle(patch.title, existing.levelData.title)
        : existing.title,
    description:
      patch.description !== undefined
        ? normalizePublishDescription(patch.description)
        : existing.description,
    published: nextPublished,
    publishedAt: nextPublishedAt,
  };

  const saved = saveUserLevelDetailed(next);
  if (!saved.ok) {
    if (saved.reason === "INVALID_ID") {
      return {
        ok: false,
        reason: "SAVE_FAILED",
        error: STORAGE_FULL_MESSAGE,
      };
    }
    return {
      ok: false,
      reason: saved.reason === "QUOTA" ? "QUOTA" : "SAVE_FAILED",
      error: storageWriteErrorMessage(saved.reason),
    };
  }
  return { ok: true, record: next };
}

// ---------------------------------------------------------------------------
// Export / Import (Phase2-7) — local JSON only; no Generator/Solver/Evaluator
// ---------------------------------------------------------------------------

/**
 * Serialize one UserLevelRecord to pretty-printed JSON envelope.
 *
 * Structure:
 * ```
 * {
 *   "schemaVersion": 1,
 *   "format": "binary-block-user-level",
 *   "level": {
 *     "userLevelId", "creatorIntent", "levelData", "seed",
 *     "evaluationProfile", "evaluatorResult", "createdAt",
 *     "creatorName", "developerCredit",
 *     "title", "description", "published", "publishedAt"
 *   }
 * }
 * ```
 */
export function exportUserLevelJson(record: UserLevelRecord): string {
  const levelTitle =
    typeof record.levelData?.title === "string" ? record.levelData.title : "";
  const envelope: UserLevelExportEnvelope = {
    schemaVersion: USER_LEVEL_EXPORT_SCHEMA_VERSION,
    format: USER_LEVEL_EXPORT_FORMAT,
    level: {
      ...record,
      creatorName: normalizeCreatorName(record.creatorName),
      developerCredit: DEVELOPER_CREDIT,
      title: normalizePublishTitle(record.title, levelTitle),
      description: normalizePublishDescription(record.description),
      published: normalizePublished(record.published),
      publishedAt: normalizePublishedAt(record.publishedAt),
    },
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Export one stored user level by id.
 * Returns `null` if the id is missing.
 */
export function exportUserLevel(userLevelId: string): string | null {
  const record = getUserLevel(userLevelId);
  if (!record) return null;
  return exportUserLevelJson(record);
}

/**
 * Export all stored user levels as a multi-level envelope.
 *
 * Structure: `{ schemaVersion, format, levels: UserLevelRecord[] }`.
 */
export function exportAllUserLevels(): string {
  const levels = loadUserLevels().levels.map((record) => {
    const levelTitle =
      typeof record.levelData?.title === "string" ? record.levelData.title : "";
    return {
      ...record,
      creatorName: normalizeCreatorName(record.creatorName),
      developerCredit: DEVELOPER_CREDIT,
      title: normalizePublishTitle(record.title, levelTitle),
      description: normalizePublishDescription(record.description),
      published: normalizePublished(record.published),
      publishedAt: normalizePublishedAt(record.publishedAt),
    };
  });
  const envelope: UserLevelsExportEnvelope = {
    schemaVersion: USER_LEVEL_EXPORT_SCHEMA_VERSION,
    format: USER_LEVEL_EXPORT_FORMAT,
    levels,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ParseUserLevelJsonResult =
  | { ok: true; records: UserLevelRecord[] }
  | {
      ok: false;
      reason: "PARSE_ERROR" | "INVALID_SHAPE" | "UNSUPPORTED_SCHEMA";
      error: string;
    };

/**
 * Parse an export envelope into validated records (no persistence).
 * Accepts single (`level`) or multi (`levels`) envelopes.
 * Same validation as {@link importUserLevelJson} without writing storage.
 * Strengthened Import validation — never throws.
 */
export function parseUserLevelJson(json: string): ParseUserLevelJsonResult {
  return parseExportPayload(json);
}

/**
 * Parse an export envelope into validated records (no persistence).
 * Accepts single (`level`) or multi (`levels`) envelopes.
 * Strengthened Import validation — never throws.
 */
function parseExportPayload(json: string): ParseUserLevelJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      reason: "PARSE_ERROR",
      error: "Invalid JSON. Could not import.",
    };
  }
  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: "INVALID_SHAPE",
      error: "Import payload is not a valid UserLevel export.",
    };
  }
  if (parsed.schemaVersion !== USER_LEVEL_EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: "UNSUPPORTED_SCHEMA",
      error: "Unsupported export schema version.",
    };
  }
  if (parsed.format !== USER_LEVEL_EXPORT_FORMAT) {
    return {
      ok: false,
      reason: "INVALID_SHAPE",
      error: "Import payload is not a valid UserLevel export.",
    };
  }

  if ("level" in parsed) {
    const geometry = validateLevelDataForImport(
      isRecord(parsed.level) ? parsed.level.levelData : undefined,
    );
    if (!geometry.ok) {
      return { ok: false, reason: "INVALID_SHAPE", error: geometry.error };
    }
    const record = coerceUserLevelRecord(parsed.level);
    if (!record) {
      return {
        ok: false,
        reason: "INVALID_SHAPE",
        error: "Import payload is missing required fields.",
      };
    }
    return { ok: true, records: [record] };
  }

  if ("levels" in parsed) {
    if (!Array.isArray(parsed.levels)) {
      return {
        ok: false,
        reason: "INVALID_SHAPE",
        error: "Import payload is not a valid UserLevel export.",
      };
    }
    const records: UserLevelRecord[] = [];
    for (const level of parsed.levels) {
      const geometry = validateLevelDataForImport(
        isRecord(level) ? level.levelData : undefined,
      );
      if (!geometry.ok) {
        return { ok: false, reason: "INVALID_SHAPE", error: geometry.error };
      }
      const record = coerceUserLevelRecord(level);
      if (!record) {
        return {
          ok: false,
          reason: "INVALID_SHAPE",
          error: "Import payload is missing required fields.",
        };
      }
      records.push(record);
    }
    return { ok: true, records };
  }

  return {
    ok: false,
    reason: "INVALID_SHAPE",
    error: "Import payload is not a valid UserLevel export.",
  };
}

/**
 * Import UserLevel JSON and persist via `saveUserLevel`.
 *
 * Collision policy (**upsert by userLevelId**):
 * - Same `userLevelId` already stored → overwrite that record.
 * - New id → append (subject to MAX_USER_LEVELS).
 * - Keeps the imported id as-is when valid (non-empty, non-numeric).
 *
 * Does NOT call Generator / Solver / Evaluator.
 * Does NOT require `evaluatorResult.passed` (treats payload as a saved snapshot).
 */
export function importUserLevelJson(json: string): ImportUserLevelResult {
  try {
    const parsed = parseExportPayload(json);
    if (!parsed.ok) {
      return {
        ok: false,
        reason: parsed.reason,
        error: parsed.error,
      };
    }
    const { records } = parsed;
    if (records.length === 0) {
      return { ok: true, records: [], upserted: 0, inserted: 0 };
    }
    if (!getKv()) {
      return {
        ok: false,
        reason: "STORAGE_UNAVAILABLE",
        error: STORAGE_UNAVAILABLE_MESSAGE,
      };
    }

    let upserted = 0;
    let inserted = 0;
    const saved: UserLevelRecord[] = [];

    for (const record of records) {
      const existed = getUserLevel(record.userLevelId) !== undefined;
      if (!existed && loadUserLevels().levels.length >= MAX_USER_LEVELS) {
        return {
          ok: false,
          reason: "LEVEL_LIMIT",
          error: LEVEL_LIMIT_MESSAGE,
        };
      }
      const write = saveUserLevelDetailed(record);
      if (!write.ok) {
        if (write.reason === "INVALID_ID") {
          return {
            ok: false,
            reason: "INVALID_SHAPE",
            error: "Import payload has an invalid userLevelId.",
          };
        }
        return {
          ok: false,
          reason: write.reason === "QUOTA" ? "QUOTA" : "SAVE_FAILED",
          error: storageWriteErrorMessage(write.reason),
        };
      }
      if (existed) upserted += 1;
      else inserted += 1;
      saved.push(record);
    }

    if (saved.length > 0) {
      notifyUserLevelsChanged();
    }
    return { ok: true, records: saved, upserted, inserted };
  } catch {
    return {
      ok: false,
      reason: "PARSE_ERROR",
      error: "Import failed unexpectedly.",
    };
  }
}