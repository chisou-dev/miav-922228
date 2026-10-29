"use client";

import { useEffect, useState } from "react";
import { QuizForm } from "@/features/learn/QuizForm";
import { TestResults } from "@/features/learn/TestResults";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import { drawQuiz, scoreDrawnQuiz } from "@/features/reading-test/draw";
import { countEnglishWords } from "@/features/reading-test/measure";
import { countWords } from "@/features/jeff/words";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import {
  beginReadingAttempt,
  clearReadingAttempt,
  patchReadingAttempt,
  recentReadingQuestionIds,
  useReadingAttempt,
} from "@/features/reading-test/session";
import {
  challengeMinuteOptions,
  defaultChallengeMinutes,
  formatClock,
  recommendedChallengeMinutes,
} from "@/features/reading-test/timing";
import type { ReadingQuestion } from "@/features/reading-test/types";

type Enjoyment = "yes" | "a-little" | "not-really";
type Mode = "practice" | "challenge";

function StoryBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  return (
    <div className="story-content">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function ReadingSession({
  slug,
  title,
  body,
  questions,
  continueUrl,
  language = "en",
}: {
  language?: "en" | "es" | "fr";
  slug: string;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
  continueUrl?: string;
}) {
  const attempt = useReadingAttempt(slug);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<Mode>("challenge");
  const [minutes, setMinutes] = useState(() =>
    defaultChallengeMinutes(language === "en" ? countEnglishWords(body) : countWords(body)),
  );
  const [enjoyment, setEnjoyment] = useState<Enjoyment | null>(null);
  const [author, setAuthor] = useState<{ name: string; slug: string } | null>(null);

  const wordCount = language === "en" ? countEnglishWords(body) : countWords(body);
  const suggested = recommendedChallengeMinutes(wordCount);
  const options = challengeMinuteOptions(wordCount);

  useEffect(() => {
    if (!attempt || attempt.step !== "results") return;
    let cancelled = false;
    void import("@/features/reading-test/reveals").then((mod) => {
      if (!cancelled) setAuthor(mod.revealAuthor(slug));
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, slug]);

  useEffect(() => {
    if (!attempt || attempt.step !== "active" || attempt.limitMs == null) return;
    const startedAt = attempt.startedAt;
    const limitMs = attempt.limitMs;
    const endsAt = startedAt + limitMs;

    function expireIfNeeded() {
      const elapsed = Date.now() - startedAt;
      if (elapsed < limitMs) return false;
      patchReadingAttempt(slug, { step: "quiz", elapsedMs: elapsed });
      return true;
    }

    if (expireIfNeeded()) return;
    const delay = Math.max(0, endsAt - Date.now());
    const timeout = window.setTimeout(expireIfNeeded, delay);
    const interval = window.setInterval(() => {
      setNow(Date.now());
      expireIfNeeded();
    }, 200);
    function onVisible() {
      setNow(Date.now());
      expireIfNeeded();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [attempt, slug]);

  function start() {
    const paper = drawQuiz(questions, {
      channel: "reading",
      avoidIds: recentReadingQuestionIds(slug),
    });
    if (paper.length === 0) return;
    beginReadingAttempt(slug, {
      limitMs: mode === "practice" ? null : minutes * 60_000,
      paper,
    });
  }

  function finishReading() {
    if (!attempt) return;
    patchReadingAttempt(slug, {
      step: "quiz",
      elapsedMs: Math.max(0, Date.now() - attempt.startedAt),
    });
  }

  const remaining =
    attempt?.step === "active" && attempt.limitMs != null
      ? Math.max(0, attempt.startedAt + attempt.limitMs - now)
      : null;
  const urgent = remaining != null && remaining <= 15_000;
  const bar =
    remaining != null && attempt?.limitMs
      ? Math.max(0, Math.min(100, (remaining / attempt.limitMs) * 100))
      : 100;

  return (
    <ReadingTestFrame eyebrow="Reading" title={title} language={language}>
      {attempt == null ? (
        <ReadingLayout label="Choose a reading time">
        <section className="mx-auto mt-12 max-w-md text-center" aria-labelledby="reading-setup">
          <h2 id="reading-setup" className="text-[1.05rem]">
            Choose a time
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
            Suggested for this story: {suggested} {suggested === 1 ? "minute" : "minutes"} at 200
            words per minute. The clock starts when you press Start.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              aria-pressed={mode === "practice"}
              onClick={() => {
                setMode("practice");
              }}
            >
              Practice
            </button>
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              aria-pressed={mode === "challenge"}
              onClick={() => {
                setMode("challenge");
              }}
            >
              Challenge
            </button>
          </div>
          {mode === "practice" ? (
            <p className="mt-6 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
              No time limit.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="reading-kindle-button font-[inherit]"
                  aria-pressed={minutes === option}
                  onClick={() => {
                    setMinutes(option);
                  }}
                >
                  {option} {option === 1 ? "minute" : "minutes"}
                </button>
              ))}
            </div>
          )}
          <div className="mt-10">
            <button type="button" className="reading-kindle-button font-[inherit]" onClick={start}>
              Start Reading
            </button>
          </div>
        </section>
        </ReadingLayout>
      ) : null}

      {attempt?.step === "active" ? (
        <ReadingLayout label={title}>
          {attempt.limitMs == null ? (
            <p className="mb-8 text-center text-[0.8rem] tracking-[0.14em] text-[var(--reading-ink-muted)] uppercase">
              Practice · no time limit
            </p>
          ) : (
            <div className="reading-timer" data-urgent={urgent ? "true" : "false"}>
              <p>
                Time remaining{" "}
                <span className="tabular-nums" aria-live="polite">
                  {formatClock(remaining ?? 0)}
                </span>
              </p>
              <div className="reading-timer-track" aria-hidden="true">
                <div className="reading-timer-bar" style={{ width: `${bar}%` }} />
              </div>
            </div>
          )}
          <StoryBody body={body} />
          <div className="mt-14 text-center sm:mt-16">
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              onClick={finishReading}
            >
              Finish Reading
            </button>
          </div>
        </ReadingLayout>
      ) : null}

      {attempt?.step === "quiz" && attempt.elapsedMs != null ? (
        <ReadingLayout label="Comprehension questions">
          <QuizForm
            questions={attempt.paper}
            answers={attempt.answers}
            canSubmit={attempt.paper.every((question) =>
              question.choices.some((choice) => choice.id === attempt.answers[question.id]),
            )}
            onAnswer={(questionId, choiceId) => {
              patchReadingAttempt(slug, {
                answers: { ...attempt.answers, [questionId]: choiceId },
              });
            }}
            onSubmit={() => {
              patchReadingAttempt(slug, { step: "results" });
            }}
          />
        </ReadingLayout>
      ) : null}

      {attempt?.step === "results" && attempt.elapsedMs != null ? (
        <ResultsView
          paper={attempt.paper}
          answers={attempt.answers}
          elapsedMs={attempt.elapsedMs}
          wordCount={wordCount}
          author={author}
          enjoyment={enjoyment}
          onEnjoyment={setEnjoyment}
          onReplay={() => {
            clearReadingAttempt(slug);
            setAuthor(null);
          }}
          continueUrl={continueUrl}
        />
      ) : null}
    </ReadingTestFrame>
  );
}

function ResultsView({
  paper,
  answers,
  elapsedMs,
  wordCount,
  author,
  enjoyment,
  onEnjoyment,
  onReplay,
  continueUrl,
}: {
  paper: Parameters<typeof scoreDrawnQuiz>[0];
  answers: Readonly<Record<string, string>>;
  elapsedMs: number;
  wordCount: number;
  author: { name: string; slug: string } | null;
  enjoyment: Enjoyment | null;
  onEnjoyment: (value: Enjoyment) => void;
  onReplay: () => void;
  continueUrl?: string;
}) {
  const score = scoreDrawnQuiz(paper, answers);
  return (
    <TestResults
      kind="reading"
      correct={score.correct}
      total={score.total}
      percent={score.percent}
      elapsedMs={elapsedMs}
      wordCount={wordCount}
      author={author}
      enjoyment={enjoyment}
      onEnjoyment={onEnjoyment}
      onReplay={onReplay}
      continueUrl={continueUrl}
    />
  );
}
