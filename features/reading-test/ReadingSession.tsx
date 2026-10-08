"use client";

import { useState } from "react";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import {
  countEnglishWords,
  formatReadingDuration,
  readingSpeedCaution,
  readingWpm,
  scoreComprehension,
} from "@/features/reading-test/measure";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { useReadingStartedAt } from "@/features/reading-test/session";
import type { ReadingQuestion } from "@/features/reading-test/types";

type Step = "read" | "quiz" | "results";
type Enjoyment = "yes" | "a-little" | "not-really";

const enjoymentOptions: readonly { value: Enjoyment; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "a-little", label: "A little" },
  { value: "not-really", label: "Not really" },
];

function StoryBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  return (
    <div className="story-content">
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          className="whitespace-pre-line"
        >
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
}: {
  slug: string;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
  continueUrl?: string;
}) {
  const startedAt = useReadingStartedAt(slug);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("read");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enjoyment, setEnjoyment] = useState<Enjoyment | null>(null);
  const [author, setAuthor] = useState<{ name: string; slug: string } | null>(
    null,
  );

  const wordCount = countEnglishWords(body);
  const allAnswered = questions.every((question) =>
    question.choices.includes(answers[question.id] ?? ""),
  );

  function finishReading() {
    if (startedAt == null) return;
    setElapsedMs(Math.max(0, Date.now() - startedAt));
    setStep("quiz");
  }

  return (
    <ReadingTestFrame eyebrow="Reading Test" title={title}>
      {step === "read" ? (
        <ReadingLayout label={title}>
          <StoryBody body={body} />
          <div className="mt-14 text-center sm:mt-16">
            <button
              type="button"
              className="reading-kindle-button font-[inherit]"
              onClick={finishReading}
              disabled={startedAt == null}
            >
              Finished Reading
            </button>
          </div>
        </ReadingLayout>
      ) : null}

      {step === "quiz" ? (
        <ReadingLayout label="Comprehension questions">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!allAnswered || elapsedMs == null) return;
              setStep("results");
              void import("@/features/reading-test/reveals").then((mod) => {
                setAuthor(mod.revealAuthor(slug));
              });
            }}
          >
            <ol className="space-y-10">
              {questions.map((question, index) => (
                <li key={question.id}>
                  <fieldset>
                    <legend className="text-[1.02rem] leading-relaxed">
                      {index + 1}. {question.question}
                    </legend>
                    <div className="mt-4 space-y-3">
                      {question.choices.map((choice) => (
                        <label
                          key={choice}
                          className="flex cursor-pointer items-start gap-3 border border-[var(--reading-line)] px-4 py-3 text-[1rem] leading-relaxed has-checked:border-[color-mix(in_srgb,var(--reading-ink)_55%,transparent)]"
                        >
                          <input
                            type="radio"
                            className="mt-1.5"
                            name={question.id}
                            value={choice}
                            checked={answers[question.id] === choice}
                            onChange={() => {
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: choice,
                              }));
                            }}
                          />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            <div className="mt-14 text-center sm:mt-16">
              <button
                type="submit"
                className="reading-kindle-button font-[inherit] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!allAnswered || elapsedMs == null}
              >
                See Results
              </button>
            </div>
          </form>
        </ReadingLayout>
      ) : null}

      {step === "results" && elapsedMs != null ? (
        <Results
          questions={questions}
          author={author}
          wordCount={wordCount}
          elapsedMs={elapsedMs}
          answers={answers}
          enjoyment={enjoyment}
          onEnjoyment={setEnjoyment}
          continueUrl={continueUrl}
        />
      ) : null}
    </ReadingTestFrame>
  );
}

function Results({
  questions,
  author,
  wordCount,
  elapsedMs,
  answers,
  enjoyment,
  onEnjoyment,
  continueUrl,
}: {
  questions: readonly ReadingQuestion[];
  author: { name: string; slug: string } | null;
  wordCount: number;
  elapsedMs: number;
  answers: Readonly<Record<string, string>>;
  enjoyment: Enjoyment | null;
  onEnjoyment: (value: Enjoyment) => void;
  continueUrl?: string;
}) {
  const wpm = readingWpm(wordCount, elapsedMs);
  const caution = readingSpeedCaution(wordCount, elapsedMs);
  const score = scoreComprehension(questions, answers);

  return (
    <ReadingLayout label="Reading test results">
      <div className="space-y-10 text-center">
        <section aria-labelledby="reading-speed-label">
          <h2
            id="reading-speed-label"
            className="text-[0.72rem] tracking-[0.18em] uppercase"
          >
            Reading Speed
          </h2>
          <p className="mt-4 text-[clamp(1.6rem,4vw,2rem)] font-medium tracking-[0.04em]">
            {wpm == null ? "—" : `${wpm} WPM`}
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--reading-ink-muted)]">
            {formatReadingDuration(elapsedMs)}
            {caution === "too-short" ? " · Too short to measure" : null}
            {caution === "too-fast" ? " · Too fast to measure reliably" : null}
          </p>
          <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-[var(--reading-ink-muted)]">
            Words per minute for this reading.
          </p>
        </section>

        <section aria-labelledby="comprehension-label">
          <h2
            id="comprehension-label"
            className="text-[0.72rem] tracking-[0.18em] uppercase"
          >
            Comprehension
          </h2>
          <p className="mt-4 text-[clamp(1.6rem,4vw,2rem)] font-medium tracking-[0.04em]">
            {score.correct} / {score.total}
          </p>
          <p className="mt-3 text-[0.95rem] text-[var(--reading-ink-muted)]">
            {score.percent}%
          </p>
          <p className="mx-auto mt-3 max-w-md text-[0.8rem] leading-relaxed text-[var(--reading-ink-muted)]">
            Your score on the five questions for this story. It does not rate your English overall.
          </p>
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
