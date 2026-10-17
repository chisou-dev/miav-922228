"use client";

import { ReadingLayout } from "@/features/library/ReadingLayout";
import {
  formatReadingDuration,
  readingSpeedCaution,
  readingWpm,
} from "@/features/reading-test/measure";

type Enjoyment = "yes" | "a-little" | "not-really";

const enjoymentOptions: readonly { value: Enjoyment; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "a-little", label: "A little" },
  { value: "not-really", label: "Not really" },
];

export function TestResults({
  kind,
  correct,
  total,
  percent,
  elapsedMs,
  wordCount,
  author,
  enjoyment,
  onEnjoyment,
  onReplay,
  continueUrl,
}: {
  kind: "reading" | "listening";
  correct: number;
  total: number;
  percent: number;
  elapsedMs: number;
  wordCount?: number;
  author: { name: string; slug: string } | null;
  enjoyment: Enjoyment | null;
  onEnjoyment: (value: Enjoyment) => void;
  onReplay: () => void;
  continueUrl?: string;
}) {
  const wpm = kind === "reading" && wordCount != null ? readingWpm(wordCount, elapsedMs) : null;
  const caution =
    kind === "reading" && wordCount != null
      ? readingSpeedCaution(wordCount, elapsedMs)
      : null;
  const timeLabel = kind === "reading" ? "Reading time" : "Listening time";

  return (
    <ReadingLayout label={kind === "reading" ? "Reading results" : "Listening results"}>
      <div className="space-y-10 text-center">
        <p className="text-[0.72rem] tracking-[0.18em] uppercase text-[var(--reading-ink-muted)]">
          {kind === "reading" ? "Reading" : "Listening"}
        </p>

        <section aria-labelledby="learn-score-label">
          <h2
            id="learn-score-label"
            className="text-[0.72rem] tracking-[0.18em] uppercase"
          >
            Comprehension
          </h2>
          <p className="mt-4 text-[clamp(1.6rem,4vw,2rem)] font-medium tracking-[0.04em]">
            {correct} / {total}
          </p>
          <p className="mt-3 text-[0.95rem] text-[var(--reading-ink-muted)]">{percent}%</p>
          <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-[var(--reading-ink-muted)]">
            Your score on the five questions for this story. It does not rate your English overall.
          </p>
        </section>

        <section aria-labelledby="learn-time-label">
          <h2 id="learn-time-label" className="text-[0.72rem] tracking-[0.18em] uppercase">
            {kind === "reading" ? "Reading Speed" : timeLabel}
          </h2>
          {kind === "reading" ? (
            <p className="mt-4 text-[clamp(1.6rem,4vw,2rem)] font-medium tracking-[0.04em]">
              {wpm == null ? "—" : `${wpm} WPM`}
            </p>
          ) : null}
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--reading-ink-muted)]">
            {formatReadingDuration(elapsedMs)}
            {caution === "too-short" ? " · Too short to measure" : null}
            {caution === "too-fast" ? " · Too fast to measure reliably" : null}
          </p>
          {kind === "reading" ? (
            <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-[var(--reading-ink-muted)]">
              Words per minute for this reading.
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-[var(--reading-ink-muted)]">
              Time from the start of playback until the questions.
            </p>
          )}
        </section>

        <fieldset>
          <legend className="text-[1.05rem]">Did you enjoy this story?</legend>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {enjoymentOptions.map((option) => (
              <label
                key={option.value}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 border border-[var(--reading-line)] px-4 text-[0.95rem] has-checked:border-[color-mix(in_srgb,var(--reading-ink)_55%,transparent)]"
              >
                <input
                  type="radio"
                  name="enjoyment"
                  value={option.value}
                  checked={enjoyment === option.value}
                  onChange={() => {
                    onEnjoyment(option.value);
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {author ? (
          <p className="pt-6 text-[clamp(1.35rem,4vw,1.85rem)] font-medium leading-snug tracking-[0.03em]">
            Written by{" "}
            <a
              href={`/authors/${author.slug}`}
              className="underline decoration-[var(--reading-line)] underline-offset-[0.35em]"
            >
              {author.name}
            </a>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="reading-kindle-button font-[inherit]" onClick={onReplay}>
            Replay
          </button>
          <a href="/learn" className="reading-kindle-button font-[inherit]">
            Back to LEARN
          </a>
        </div>

        {continueUrl ? (
          <p>
            <a href={continueUrl} className="reading-kindle-button font-[inherit]">
              Continue the Story
            </a>
          </p>
        ) : null}
      </div>
    </ReadingLayout>
  );
}
