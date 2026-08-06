"use server";

import { getMaxChapterNumber } from "@/features/stories/miav/chapters";
import { FREE_THROUGH_CHAPTER } from "@/features/stories/miav/chapterProgress";
import { getContentLocale } from "@/features/shared/locale";
import {
  MIN_SERVER_READ_MS,
  clearReadSession,
  hasUnlockSecret,
  isChapterUnlockedServer,
  readReadSession,
  readUnlockedThrough,
  writeReadSession,
  writeUnlockCookie,
} from "@/features/stories/miav/chapterUnlockCookie";

export type StartChapterReadResult =
  | { ok: true }
  | { ok: false; error: string };

export type CompleteChapterReadResult =
  | { ok: true; unlockedThrough: number }
  | { ok: false; error: string; unlockedThrough: number };

function maxChapters(): number {
  return getMaxChapterNumber(getContentLocale());
}

export async function startChapterRead(
  chapterNumber: number,
): Promise<StartChapterReadResult> {
  if (!hasUnlockSecret()) {
    return { ok: false, error: "unlock_secret_missing" };
  }

  const n = Math.floor(Number(chapterNumber));
  if (!Number.isFinite(n) || n < FREE_THROUGH_CHAPTER) {
    return { ok: false, error: "invalid_chapter" };
  }

  const maxChapterNumber = maxChapters();
  if (n > maxChapterNumber) {
    return { ok: false, error: "invalid_chapter" };
  }

  const unlockedThrough = await readUnlockedThrough(maxChapterNumber);
  if (!isChapterUnlockedServer(n, unlockedThrough)) {
    return { ok: false, error: "chapter_locked" };
  }

  const written = await writeReadSession(n);
  if (!written) {
    return { ok: false, error: "session_write_failed" };
  }
  return { ok: true };
}

export async function completeChapterRead(
  chapterNumber: number,
  scrollReached: boolean,
): Promise<CompleteChapterReadResult> {
  const maxChapterNumber = maxChapters();
  const unlockedThrough = await readUnlockedThrough(maxChapterNumber);

  if (!hasUnlockSecret()) {
    return {
      ok: false,
      error: "unlock_secret_missing",
      unlockedThrough: FREE_THROUGH_CHAPTER,
    };
  }

  const n = Math.floor(Number(chapterNumber));
  if (!Number.isFinite(n) || n < FREE_THROUGH_CHAPTER) {
    return { ok: false, error: "invalid_chapter", unlockedThrough };
  }
  if (n > maxChapterNumber) {
    return { ok: false, error: "invalid_chapter", unlockedThrough };
  }

  if (scrollReached !== true) {
    return { ok: false, error: "scroll_not_reached", unlockedThrough };
  }

  // Already past this chapter — safe no-op.
  if (n < unlockedThrough) {
    await clearReadSession();
    return { ok: true, unlockedThrough };
  }

  if (n !== unlockedThrough) {
    return { ok: false, error: "chapter_not_current", unlockedThrough };
  }

  const session = await readReadSession();
  if (!session || session.chapterNumber !== n) {
    return { ok: false, error: "session_mismatch", unlockedThrough };
  }

  const elapsed = Date.now() - session.startedAt;
  if (elapsed < MIN_SERVER_READ_MS) {
    return { ok: false, error: "too_early", unlockedThrough };
  }

  const nextUnlock = Math.min(n + 1, maxChapterNumber);
  const written = await writeUnlockCookie(nextUnlock, maxChapterNumber);
  await clearReadSession();
  return { ok: true, unlockedThrough: written };
}
