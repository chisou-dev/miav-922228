/**
 * Sequential unlock progress for MIAV-922228 chapters.
 * Chapters 1–5 are always free; chapter 6+ unlock after completing the previous chapter.
 *
 * Detailed timing/scroll state lives in `miav_chapter_progress_v1`.
 * Reader Memory (`reader_memory`) is still updated on completion for existing UI.
 */

import { miavChapterSlugs, miavWorkId } from "@/features/stories/miav/work";

export const CHAPTER_PROGRESS_KEY = "miav_chapter_progress_v1";
export const FREE_THROUGH_CHAPTER = 5;
export const MIN_READ_SECONDS = 20;
export const MIN_SCROLL_RATIO = 0.85;
export const MIAV_WORK_ID = miavWorkId;

export type ChapterProgressState = {
  completedChapters: number[];
  unlockedThrough: number;
  activeReadSecondsByChapter: Record<string, number>;
  scrollReachedByChapter: Record<string, number>;
  updatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function chapterKey(chapterNumber: number): string {
  return String(chapterNumber);
}

function defaultState(): ChapterProgressState {
  return {
    completedChapters: [],
    unlockedThrough: FREE_THROUGH_CHAPTER,
    activeReadSecondsByChapter: {},
    scrollReachedByChapter: {},
    updatedAt: nowIso(),
  };
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const nums = value
    .map((item) => Number(item))
    .filter((n) => Number.isFinite(n) && n >= 1);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function asRatioMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}

function asSecondsMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    out[key] = Math.floor(n);
  }
  return out;
}

function normalizeState(raw: unknown): ChapterProgressState {
  if (!raw || typeof raw !== "object") return defaultState();
  const record = raw as Record<string, unknown>;
  const completedChapters = asNumberArray(record.completedChapters);
  const unlockedThroughRaw = Number(record.unlockedThrough);
  const unlockedThrough = Number.isFinite(unlockedThroughRaw)
    ? Math.max(FREE_THROUGH_CHAPTER, Math.floor(unlockedThroughRaw))
    : FREE_THROUGH_CHAPTER;

  return {
    completedChapters,
    unlockedThrough,
    activeReadSecondsByChapter: asSecondsMap(record.activeReadSecondsByChapter),
    scrollReachedByChapter: asRatioMap(record.scrollReachedByChapter),
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt
        ? record.updatedAt
        : nowIso(),
  };
}

function readReaderMemoryCompletedThrough(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("reader_memory");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as {
      works?: Record<string, { lastChapter?: string | null; finished?: boolean }>;
    };
    const work = parsed.works?.[MIAV_WORK_ID];
    if (!work) return 0;
    if (work.finished === true) return miavChapterSlugs.length;
    if (!work.lastChapter) return 0;
    const index = miavChapterSlugs.indexOf(
      work.lastChapter as (typeof miavChapterSlugs)[number],
    );
    return index === -1 ? 0 : index + 1;
  } catch {
    return 0;
  }
}

/** Merge Reader Memory into progress so existing readers are not re-locked. */
export function migrateFromReaderMemory(
  state: ChapterProgressState,
): ChapterProgressState {
  const completedThrough = readReaderMemoryCompletedThrough();
  if (completedThrough <= 0) return state;

  const completed = new Set(state.completedChapters);
  for (let n = 1; n <= completedThrough; n += 1) {
    completed.add(n);
  }

  const unlockedThrough = Math.max(
    state.unlockedThrough,
    FREE_THROUGH_CHAPTER,
    completedThrough >= miavChapterSlugs.length
      ? miavChapterSlugs.length
      : Math.min(completedThrough + 1, miavChapterSlugs.length),
  );

  return {
    ...state,
    completedChapters: Array.from(completed).sort((a, b) => a - b),
    unlockedThrough,
    updatedAt: nowIso(),
  };
}

export function loadChapterProgress(): ChapterProgressState {
  if (typeof window === "undefined") return defaultState();

  let state = defaultState();
  try {
    const raw = localStorage.getItem(CHAPTER_PROGRESS_KEY);
    if (raw) {
      state = normalizeState(JSON.parse(raw) as unknown);
    }
  } catch {
    state = defaultState();
  }

  const migrated = migrateFromReaderMemory(state);
  if (
    migrated.completedChapters.length !== state.completedChapters.length ||
    migrated.unlockedThrough !== state.unlockedThrough
  ) {
    saveChapterProgress(migrated);
    return migrated;
  }
  return migrated;
}

export function saveChapterProgress(state: ChapterProgressState): void {
  if (typeof window === "undefined") return;
  try {
    const next: ChapterProgressState = {
      ...state,
      updatedAt: nowIso(),
    };
    localStorage.setItem(CHAPTER_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function isChapterUnlocked(
  chapterNumber: number,
  state: ChapterProgressState,
): boolean {
  if (chapterNumber <= FREE_THROUGH_CHAPTER) return true;
  return chapterNumber <= state.unlockedThrough;
}

export function isChapterCompleted(
  chapterNumber: number,
  state: ChapterProgressState,
): boolean {
  return state.completedChapters.includes(chapterNumber);
}

export function getReadSeconds(
  chapterNumber: number,
  state: ChapterProgressState,
): number {
  return state.activeReadSecondsByChapter[chapterKey(chapterNumber)] ?? 0;
}

export function getScrollReached(
  chapterNumber: number,
  state: ChapterProgressState,
): number {
  return state.scrollReachedByChapter[chapterKey(chapterNumber)] ?? 0;
}

export function meetsReadRequirements(
  chapterNumber: number,
  state: ChapterProgressState,
): { timeMet: boolean; scrollMet: boolean; complete: boolean } {
  const timeMet = getReadSeconds(chapterNumber, state) >= MIN_READ_SECONDS;
  const scrollMet = getScrollReached(chapterNumber, state) >= MIN_SCROLL_RATIO;
  return { timeMet, scrollMet, complete: timeMet && scrollMet };
}

export function recordReadSecond(
  chapterNumber: number,
  state: ChapterProgressState,
): ChapterProgressState {
  const key = chapterKey(chapterNumber);
  const current = state.activeReadSecondsByChapter[key] ?? 0;
  return {
    ...state,
    activeReadSecondsByChapter: {
      ...state.activeReadSecondsByChapter,
      [key]: current + 1,
    },
    updatedAt: nowIso(),
  };
}

export function recordScrollReached(
  chapterNumber: number,
  ratio: number,
  state: ChapterProgressState,
): ChapterProgressState {
  const key = chapterKey(chapterNumber);
  const clamped = Math.min(1, Math.max(0, ratio));
  const previous = state.scrollReachedByChapter[key] ?? 0;
  if (clamped <= previous) return state;
  return {
    ...state,
    scrollReachedByChapter: {
      ...state.scrollReachedByChapter,
      [key]: clamped,
    },
    updatedAt: nowIso(),
  };
}

export function completeChapter(
  chapterNumber: number,
  maxChapterNumber: number,
  state: ChapterProgressState,
): ChapterProgressState {
  const completed = new Set(state.completedChapters);
  completed.add(chapterNumber);
  const nextUnlock =
    chapterNumber >= maxChapterNumber
      ? maxChapterNumber
      : Math.min(chapterNumber + 1, maxChapterNumber);
  return {
    ...state,
    completedChapters: Array.from(completed).sort((a, b) => a - b),
    unlockedThrough: Math.max(
      state.unlockedThrough,
      FREE_THROUGH_CHAPTER,
      nextUnlock,
    ),
    updatedAt: nowIso(),
  };
}

/** Advance shared Reader Memory without clearing other fields. */
export function syncReaderMemoryOnComplete(chapterNumber: number): void {
  if (typeof window === "undefined") return;
  const slug = miavChapterSlugs[chapterNumber - 1];
  if (!slug) return;

  try {
    const raw = localStorage.getItem("reader_memory");
    const parsed = raw
      ? (JSON.parse(raw) as {
          firstVisit?: string;
          lastVisit?: string;
          works?: Record<
            string,
            { lastChapter?: string | null; traceLeft?: boolean; finished?: boolean }
          >;
        })
      : null;

    const firstVisit =
      parsed?.firstVisit && typeof parsed.firstVisit === "string"
        ? parsed.firstVisit
        : nowIso();
    const works = { ...(parsed?.works ?? {}) };
    const existing = works[MIAV_WORK_ID] ?? {
      lastChapter: null,
      traceLeft: false,
      finished: false,
    };

    const currentIndex = existing.lastChapter
      ? miavChapterSlugs.indexOf(
          existing.lastChapter as (typeof miavChapterSlugs)[number],
        )
      : -1;
    const nextIndex = chapterNumber - 1;
    const advanced = nextIndex > currentIndex;
    const finished =
      existing.finished === true || chapterNumber >= miavChapterSlugs.length;

    works[MIAV_WORK_ID] = {
      lastChapter: advanced || !existing.lastChapter ? slug : existing.lastChapter,
      traceLeft: existing.traceLeft === true,
      finished,
    };

    localStorage.setItem(
      "reader_memory",
      JSON.stringify({
        firstVisit,
        lastVisit: nowIso(),
        works,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export type ChapterListStatus = "locked" | "available" | "read";

export function getChapterListStatus(
  chapterNumber: number,
  state: ChapterProgressState,
): ChapterListStatus {
  if (!isChapterUnlocked(chapterNumber, state)) return "locked";
  if (isChapterCompleted(chapterNumber, state)) return "read";
  return "available";
}

export function requiredPreviousChapter(
  chapterNumber: number,
): number | null {
  if (chapterNumber <= FREE_THROUGH_CHAPTER) return null;
  return chapterNumber - 1;
}
