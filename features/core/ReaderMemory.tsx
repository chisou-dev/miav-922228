"use client";

/**
 * Reader Memory
 * Single local reader-memory system for every literary project.
 * Future works MUST reuse this component.
 * Do NOT create new localStorage keys.
 * Use:
 * reader_memory
 * reader_memory.works[workId]
 * for every work.
 *
 * Register each literary project once in features/novels/literaryWorks.ts.
 * This component resolves title and ordered chapters from that registry by workId.
 */

import { useEffect, useState } from "react";
import { getLiteraryWork } from "@/features/novels/literaryWorks";

const STORAGE_KEY = "reader_memory";
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * MS_DAY;

export type WorkMemory = {
  lastChapter: string | null;
  traceLeft: boolean;
  finished: boolean;
};

export type ReaderMemoryData = {
  firstVisit: string;
  lastVisit: string;
  works: Record<string, WorkMemory>;
};

type DisplayState = {
  greeting: string;
  daysSinceFirst: number;
  chaptersRead: number;
  traceLeft: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseIsoMs(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function defaultWorkMemory(): WorkMemory {
  return { lastChapter: null, traceLeft: false, finished: false };
}

function normalizeWork(
  raw: unknown,
  chapterSlugs: readonly string[],
): WorkMemory {
  if (!raw || typeof raw !== "object") return defaultWorkMemory();
  const record = raw as Record<string, unknown>;

  let lastChapter =
    typeof record.lastChapter === "string" && record.lastChapter.length > 0
      ? record.lastChapter
      : null;

  // Migrate legacy chaptersRead → lastChapter (one-time shape normalize).
  if (
    !lastChapter &&
    typeof record.chaptersRead === "number" &&
    Number.isFinite(record.chaptersRead) &&
    record.chaptersRead > 0 &&
    chapterSlugs.length > 0
  ) {
    const index =
      Math.min(Math.floor(record.chaptersRead), chapterSlugs.length) - 1;
    if (index >= 0) lastChapter = chapterSlugs[index] ?? null;
  }

  return {
    lastChapter,
    traceLeft: record.traceLeft === true,
    finished: record.finished === true,
  };
}

function countChaptersRead(
  work: WorkMemory,
  chapterSlugs: readonly string[],
): number {
  if (work.finished) return chapterSlugs.length;
  if (!work.lastChapter) return 0;
  const index = chapterSlugs.indexOf(work.lastChapter);
  return index === -1 ? 0 : index + 1;
}

function readRaw(): ReaderMemoryData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ReaderMemoryData;
  } catch {
    return null;
  }
}

function writeRaw(data: ReaderMemoryData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function ensureWork(
  data: ReaderMemoryData,
  workId: string,
  chapterSlugs: readonly string[],
): { data: ReaderMemoryData; work: WorkMemory } {
  const existing = data.works?.[workId];
  const work = existing
    ? normalizeWork(existing, chapterSlugs)
    : defaultWorkMemory();

  return {
    data: {
      ...data,
      works: { ...(data.works ?? {}), [workId]: work },
    },
    work,
  };
}

function greetingFromLastVisit(
  previousLastVisitMs: number | null,
  workTitle: string,
): string {
  if (previousLastVisitMs === null) {
    return `Hello.\nWelcome to ${workTitle}.`;
  }

  const elapsed = Date.now() - previousLastVisitMs;

  if (elapsed < MS_DAY) {
    return "Welcome back.";
  }

  if (elapsed <= MS_30_DAYS) {
    return "It's good to see you again.";
  }

  return "It's been a while.\nWelcome back.";
}

function loadAndTouch(workId: string): DisplayState | null {
  const literaryWork = getLiteraryWork(workId);
  if (!literaryWork) return null;

  const { title: workTitle, chapterSlugs } = literaryWork;

  const existing = readRaw();
  const previousLastVisitMs = existing
    ? parseIsoMs(existing.lastVisit)
    : null;
  const isFirstVisit = !existing || !parseIsoMs(existing.firstVisit);

  const firstVisit =
    existing && parseIsoMs(existing.firstVisit)
      ? existing.firstVisit
      : nowIso();

  let next: ReaderMemoryData = {
    firstVisit,
    lastVisit: existing?.lastVisit ?? firstVisit,
    works:
      existing?.works && typeof existing.works === "object"
        ? { ...existing.works }
        : {},
  };

  const ensured = ensureWork(next, workId, chapterSlugs);
  next = ensured.data;
  const work = ensured.work;

  const greeting = greetingFromLastVisit(
    isFirstVisit ? null : previousLastVisitMs,
    workTitle,
  );

  const firstVisitMs = parseIsoMs(next.firstVisit) ?? Date.now();
  const daysSinceFirst = Math.max(
    0,
    Math.floor((Date.now() - firstVisitMs) / MS_DAY),
  );

  next = {
    ...next,
    firstVisit: next.firstVisit,
    lastVisit: nowIso(),
  };
  writeRaw(next);

  return {
    greeting,
    daysSinceFirst,
    chaptersRead: countChaptersRead(work, chapterSlugs),
    traceLeft: work.traceLeft,
  };
}

type ReaderMemoryProps = {
  workId: string;
};

export function ReaderMemory({ workId }: ReaderMemoryProps) {
  const [state, setState] = useState<DisplayState | null>(null);

  useEffect(() => {
    setState(loadAndTouch(workId));
  }, [workId]);

  if (!state) {
    return null;
  }

  const traceMessage = state.traceLeft
    ? "Your trace is still there."
    : "One day,\nleave your trace on the map.";

  return (
    <div
      className="mb-6 max-w-[11.5rem] text-[var(--foreground-muted)]"
      aria-live="polite"
    >
      <p className="whitespace-pre-line text-[0.8rem] leading-relaxed tracking-[0.08em] sm:text-[0.85rem]">
        {state.greeting}
      </p>

      <p className="mt-3 whitespace-pre-line text-[0.68rem] leading-[1.65] tracking-[0.06em] sm:mt-3.5">
        {`You first visited\n${state.daysSinceFirst} days ago.`}
      </p>

      <p className="mt-3 whitespace-pre-line text-[0.68rem] leading-[1.65] tracking-[0.06em] sm:mt-3.5">
        {`You've read\n${state.chaptersRead} chapters.`}
      </p>

      <p className="mt-3 whitespace-pre-line text-[0.68rem] leading-[1.65] tracking-[0.06em] sm:mt-3.5">
        {traceMessage}
      </p>
    </div>
  );
}
