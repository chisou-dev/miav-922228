"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import { CopyDeterrent } from "@/features/stories/miav/CopyDeterrent";
import { PartTwoNotice } from "@/features/stories/miav/PartTwoNotice";
import {
  FREE_THROUGH_CHAPTER,
  MIN_READ_SECONDS,
  MIN_SCROLL_RATIO,
  loadChapterProgress,
  recordReadSecond,
  recordScrollReached,
  requiredPreviousChapter,
  saveChapterProgress,
  syncReaderMemoryOnComplete,
  type ChapterProgressState,
} from "@/features/stories/miav/chapterProgress";
import {
  completeChapterRead,
  startChapterRead,
} from "@/features/stories/miav/chapterUnlockActions";

export type MiavChapterNavItem = {
  number: number;
  slug: string;
  title: string;
  pathSlug?: string;
};

type Props = {
  chapter: MiavChapterNavItem & {
    presentation: "reading" | "threshold";
  };
  /** Present only when the server has authorized this chapter body. */
  bodyHtml?: string;
  previous: MiavChapterNavItem | null;
  next: MiavChapterNavItem | null;
  allChapters: readonly MiavChapterNavItem[];
  maxChapterNumber: number;
  serverUnlockedThrough: number;
  linkMode: "archive" | "library";
  seriesId?: string;
  listHref: string;
  listLabel: string;
  hideNextOnThreshold?: boolean;
};

function chapterLink(
  item: MiavChapterNavItem,
  linkMode: "archive" | "library",
  seriesId?: string,
): string {
  if (linkMode === "library") {
    return `/stories/${seriesId ?? "miav-922228"}/${item.pathSlug ?? item.slug}`;
  }
  return `/chapters/${item.slug}`;
}

function scrollRatioFor(element: HTMLElement): number {
  const top = element.getBoundingClientRect().top + window.scrollY;
  const height = Math.max(element.offsetHeight, 1);
  const bottom = window.scrollY + window.innerHeight;
  return Math.min(1, Math.max(0, (bottom - top) / height));
}

function UnlockStatus({
  chapterNumber,
  nextNumber,
  timeMet,
  scrollMet,
  complete,
  hasNext,
  pending,
}: {
  chapterNumber: number;
  nextNumber: number | null;
  timeMet: boolean;
  scrollMet: boolean;
  complete: boolean;
  hasNext: boolean;
  pending: boolean;
}) {
  if (chapterNumber < FREE_THROUGH_CHAPTER) return null;
  if (!hasNext || nextNumber === null) {
    if (complete) {
      return (
        <p
          className="mt-10 text-[0.78rem] tracking-[0.1em] text-[var(--foreground-muted)]"
          aria-live="polite"
        >
          Chapter complete.
        </p>
      );
    }
    return null;
  }

  let message: string;
  if (complete) {
    message = `Chapter ${nextNumber} unlocked.`;
  } else if (pending) {
    message = `Continue reading to unlock Chapter ${nextNumber}.`;
  } else if (!timeMet && !scrollMet) {
    message = `Continue reading to unlock Chapter ${nextNumber}.`;
  } else if (!timeMet) {
    message = "Stay with this chapter a little longer.";
  } else {
    message = `Continue to the end to unlock Chapter ${nextNumber}.`;
  }

  return (
    <p
      className="mt-10 text-[0.78rem] tracking-[0.1em] text-[var(--foreground-muted)]"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

function LockedChapterView({
  chapter,
  previousRequired,
  unlockedThrough,
  linkMode,
  seriesId,
  listHref,
  listLabel,
}: {
  chapter: MiavChapterNavItem;
  previousRequired: MiavChapterNavItem;
  unlockedThrough: number;
  linkMode: "archive" | "library";
  seriesId?: string;
  listHref: string;
  listLabel: string;
}) {
  return (
    <div className="mt-16 sm:mt-20">
      <p className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
        Locked
      </p>
      <p className="mt-6 text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground)]">
        This chapter is still locked.
      </p>
      <p className="mt-4 text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)]">
        Read Chapter {previousRequired.number}｜{previousRequired.title} to
        continue.
      </p>
      <p className="mt-8 text-[0.78rem] tracking-[0.1em] text-[var(--foreground-muted)]">
        Unlocked through Chapter {unlockedThrough}.
      </p>
      <p className="mt-10">
        <a
          href={chapterLink(previousRequired, linkMode, seriesId)}
          className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
        >
          ← Back to Chapter {previousRequired.number}
        </a>
      </p>
      <p className="mt-8">
        <a
          href={listHref}
          className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          {listLabel}
        </a>
      </p>
      <span className="sr-only">
        Chapter {chapter.number} {chapter.title} is locked.
      </span>
    </div>
  );
}

export function MiavChapterReader({
  chapter,
  bodyHtml,
  previous,
  next,
  allChapters,
  serverUnlockedThrough,
  linkMode,
  seriesId,
  listHref,
  listLabel,
  hideNextOnThreshold = true,
}: Props) {
  const router = useRouter();
  const unlocked =
    chapter.number <= FREE_THROUGH_CHAPTER ||
    chapter.number <= serverUnlockedThrough;
  const hasAuthorizedBody = typeof bodyHtml === "string";

  const [progress, setProgress] = useState<ChapterProgressState | null>(null);
  const [unlockedThrough, setUnlockedThrough] = useState(serverUnlockedThrough);
  const [serverComplete, setServerComplete] = useState(
    chapter.number < serverUnlockedThrough,
  );
  const [completePending, setCompletePending] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTick = useRef(0);
  const progressRef = useRef<ChapterProgressState | null>(null);
  const startedRef = useRef(false);
  const completeSentRef = useRef(false);
  const clientSecondsRef = useRef(0);
  const clientScrollRef = useRef(0);

  useEffect(() => {
    setUnlockedThrough(serverUnlockedThrough);
    setServerComplete(chapter.number < serverUnlockedThrough);
  }, [serverUnlockedThrough, chapter.number]);

  useEffect(() => {
    const loaded = loadChapterProgress();
    progressRef.current = loaded;
    setProgress(loaded);
    clientSecondsRef.current =
      loaded.activeReadSecondsByChapter[String(chapter.number)] ?? 0;
    clientScrollRef.current =
      loaded.scrollReachedByChapter[String(chapter.number)] ?? 0;
  }, [chapter.number]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const needsGate = chapter.number >= FREE_THROUGH_CHAPTER;

  // Start signed read session once per authorized gated chapter view.
  useEffect(() => {
    if (!unlocked || !hasAuthorizedBody || !needsGate) return;
    if (startedRef.current) return;
    if (chapter.number < unlockedThrough) return;

    startedRef.current = true;
    void startChapterRead(chapter.number).then((result) => {
      if (!result.ok) {
        startedRef.current = false;
      }
    });
  }, [
    unlocked,
    hasAuthorizedBody,
    needsGate,
    chapter.number,
    unlockedThrough,
  ]);

  // Client visible+focus seconds (UI + local progress only).
  useEffect(() => {
    if (!unlocked || !hasAuthorizedBody || !needsGate) return;
    if (serverComplete || completeSentRef.current) return;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (typeof document.hasFocus === "function" && !document.hasFocus()) {
        return;
      }

      clientSecondsRef.current += 1;
      setProgress((current) => {
        if (!current) return current;
        const nextState = recordReadSecond(chapter.number, current);
        progressRef.current = nextState;
        saveTick.current += 1;
        if (saveTick.current % 5 === 0) {
          saveChapterProgress(nextState);
        }
        return nextState;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [
    unlocked,
    hasAuthorizedBody,
    needsGate,
    chapter.number,
    serverComplete,
  ]);

  useEffect(() => {
    if (!unlocked || !hasAuthorizedBody || !needsGate) return;
    if (serverComplete || completeSentRef.current) return;

    const updateScroll = () => {
      const el = bodyRef.current;
      if (!el) return;
      const ratio = scrollRatioFor(el);
      clientScrollRef.current = Math.max(clientScrollRef.current, ratio);
      setProgress((current) => {
        if (!current) return current;
        const nextState = recordScrollReached(chapter.number, ratio, current);
        if (nextState === current) return current;
        progressRef.current = nextState;
        saveChapterProgress(nextState);
        return nextState;
      });
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [
    unlocked,
    hasAuthorizedBody,
    needsGate,
    chapter.number,
    serverComplete,
  ]);

  // Client gates then server complete (server re-checks 20s).
  useEffect(() => {
    if (!unlocked || !hasAuthorizedBody || !needsGate) return;
    if (serverComplete || completeSentRef.current || completePending) return;

    const timeMet = clientSecondsRef.current >= MIN_READ_SECONDS;
    const scrollMet = clientScrollRef.current >= MIN_SCROLL_RATIO;
    if (!timeMet || !scrollMet) return;

    completeSentRef.current = true;
    setCompletePending(true);

    void completeChapterRead(chapter.number, true).then((result) => {
      setCompletePending(false);
      if (!result.ok) {
        completeSentRef.current = false;
        return;
      }

      setUnlockedThrough(result.unlockedThrough);
      setServerComplete(true);
      if (progressRef.current) {
        const local = {
          ...progressRef.current,
          completedChapters: Array.from(
            new Set([
              ...progressRef.current.completedChapters,
              chapter.number,
            ]),
          ).sort((a, b) => a - b),
          unlockedThrough: result.unlockedThrough,
          updatedAt: new Date().toISOString(),
        };
        progressRef.current = local;
        saveChapterProgress(local);
        setProgress(local);
      }
      syncReaderMemoryOnComplete(chapter.number);
      router.refresh();
    });
  }, [
    progress,
    unlocked,
    hasAuthorizedBody,
    needsGate,
    chapter.number,
    serverComplete,
    completePending,
    router,
  ]);

  useEffect(() => {
    return () => {
      if (progressRef.current) saveChapterProgress(progressRef.current);
    };
  }, []);

  if (!unlocked || !hasAuthorizedBody) {
    const prevNum =
      requiredPreviousChapter(chapter.number) ?? chapter.number - 1;
    const previousRequired =
      allChapters.find((item) => item.number === prevNum) ??
      previous ??
      ({
        number: prevNum,
        slug: "",
        title: `Chapter ${prevNum}`,
      } satisfies MiavChapterNavItem);

    return (
      <LockedChapterView
        chapter={chapter}
        previousRequired={previousRequired}
        unlockedThrough={unlockedThrough}
        linkMode={linkMode}
        seriesId={seriesId}
        listHref={listHref}
        listLabel={listLabel}
      />
    );
  }

  const isThreshold = chapter.presentation === "threshold";
  const showNext =
    next &&
    !(hideNextOnThreshold && isThreshold) &&
    next.number <= unlockedThrough;
  const nextLocked =
    next &&
    !(hideNextOnThreshold && isThreshold) &&
    next.number > unlockedThrough;

  const timeMet =
    serverComplete || clientSecondsRef.current >= MIN_READ_SECONDS;
  const scrollMet =
    serverComplete || clientScrollRef.current >= MIN_SCROLL_RATIO;

  const showPartTwo =
    chapter.slug === "photograph" && unlocked && hasAuthorizedBody;

  return (
    <>
      <div ref={bodyRef}>
        <CopyDeterrent enabled={needsGate}>
          <ReadingLayout label="Chapter text">
            <article
              className="chapter-prose"
              dangerouslySetInnerHTML={{ __html: bodyHtml ?? "" }}
            />
          </ReadingLayout>
        </CopyDeterrent>
      </div>

      {showPartTwo ? <PartTwoNotice /> : null}

      {needsGate ? (
        <UnlockStatus
          chapterNumber={chapter.number}
          nextNumber={next?.number ?? null}
          timeMet={timeMet}
          scrollMet={scrollMet}
          complete={serverComplete}
          hasNext={Boolean(next) && !(hideNextOnThreshold && isThreshold)}
          pending={completePending}
        />
      ) : null}

      <nav
        aria-label="Chapter navigation"
        className="mt-20 border-t border-[var(--line)] pt-10 sm:mt-28 sm:pt-14"
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
          <div className="min-h-[3.5rem]">
            {previous ? (
              <a
                href={chapterLink(previous, linkMode, seriesId)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Previous
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  Chapter {previous.number}｜{previous.title}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                Previous
              </span>
            )}
          </div>

          <div className="min-h-[3.5rem] sm:text-right">
            {showNext && next ? (
              <a
                href={chapterLink(next, linkMode, seriesId)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Next
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  Chapter {next.number}｜{next.title}
                </span>
              </a>
            ) : nextLocked && next ? (
              <div className="text-[var(--foreground-muted)]">
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Next
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em]">
                  Chapter {next.number}｜LOCKED
                </span>
              </div>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                Next
              </span>
            )}
          </div>
        </div>

        <p className="mt-14 text-center sm:mt-16">
          <a
            href={listHref}
            className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            {listLabel}
          </a>
        </p>
      </nav>
    </>
  );
}
