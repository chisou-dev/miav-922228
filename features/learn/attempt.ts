"use client";

import { useSyncExternalStore } from "react";
import type { DrawnQuestion } from "@/features/reading-test/draw";

export type LearnAttemptStep = "active" | "quiz" | "results";

export type LearnAttempt = {
  startedAt: number;
  /** Null is practice: no deadline. */
  limitMs: number | null;
  /** Frozen when the passage or audio ends. Null while it is still open. */
  elapsedMs: number | null;
  step: LearnAttemptStep;
  /** Listening playback rate. Reading leaves this null. */
  rate: number | null;
  /** Next speech chunk. Reading leaves this at 0. */
  cursor: number;
  paper: DrawnQuestion[];
  answers: Record<string, string>;
};

const cache = new Map<string, LearnAttempt | null>();
const listeners = new Set<() => void>();

function attemptKey(prefix: string, slug: string) {
  return `${prefix}:${slug}`;
}

function recentKey(prefix: string, slug: string) {
  return `${prefix}:${slug}:recent`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function isPaper(value: unknown): value is DrawnQuestion[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const question = item as DrawnQuestion;
    return (
      typeof question.id === "string" &&
      typeof question.question === "string" &&
      typeof question.correctChoiceId === "string" &&
      Array.isArray(question.choices) &&
      question.choices.every(
        (choice) =>
          choice &&
          typeof choice.id === "string" &&
          typeof choice.text === "string",
      )
    );
  });
}

function normalize(attempt: LearnAttempt | null): LearnAttempt | null {
  if (!attempt) return null;
  if (!isPaper(attempt.paper)) return null;
  if (attempt.step !== "active" && attempt.step !== "quiz" && attempt.step !== "results") {
    return null;
  }
  if (!Number.isFinite(attempt.startedAt) || attempt.startedAt <= 0) return null;
  const now = Date.now();
  if (attempt.startedAt > now + 5_000) return null;

  if (
    attempt.step === "active" &&
    attempt.limitMs != null &&
    now - attempt.startedAt >= attempt.limitMs
  ) {
    return {
      ...attempt,
      step: "quiz",
      elapsedMs: Math.max(0, now - attempt.startedAt),
    };
  }
  return attempt;
}

function readStored(key: string): LearnAttempt | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LearnAttempt;
    return normalize({
      ...parsed,
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      cursor: Number.isFinite(parsed.cursor) ? parsed.cursor : 0,
      rate: typeof parsed.rate === "number" ? parsed.rate : null,
      limitMs: typeof parsed.limitMs === "number" ? parsed.limitMs : null,
      elapsedMs: typeof parsed.elapsedMs === "number" ? parsed.elapsedMs : null,
    });
  } catch {
    return null;
  }
}

function readAttempt(key: string): LearnAttempt | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  const attempt = readStored(key);
  cache.set(key, attempt);
  return attempt;
}

function commit(key: string, attempt: LearnAttempt | null) {
  cache.set(key, attempt);
  try {
    if (attempt) sessionStorage.setItem(key, JSON.stringify(attempt));
    else sessionStorage.removeItem(key);
  } catch {
    // Private mode keeps the attempt in memory for this page only.
  }
  emit();
}

export function recentQuestionIds(prefix: string, slug: string): string[] {
  try {
    const raw = sessionStorage.getItem(recentKey(prefix, slug));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function beginLearnAttempt(
  prefix: string,
  slug: string,
  input: {
    limitMs: number | null;
    rate?: number | null;
    paper: DrawnQuestion[];
  },
): LearnAttempt {
  const key = attemptKey(prefix, slug);
  const attempt: LearnAttempt = {
    startedAt: Date.now(),
    limitMs: input.limitMs,
    elapsedMs: null,
    step: "active",
    rate: input.rate ?? null,
    cursor: 0,
    paper: input.paper,
    answers: {},
  };
  try {
    sessionStorage.setItem(
      recentKey(prefix, slug),
      JSON.stringify(input.paper.map((question) => question.id)),
    );
  } catch {
    // The next draw can still use the full bank.
  }
  commit(key, attempt);
  return attempt;
}

export function patchLearnAttempt(
  prefix: string,
  slug: string,
  patch: Partial<LearnAttempt>,
): LearnAttempt | null {
  const key = attemptKey(prefix, slug);
  const current = readAttempt(key);
  if (!current) return null;
  const next: LearnAttempt = {
    ...current,
    ...patch,
    answers: patch.answers ?? current.answers,
    paper: patch.paper ?? current.paper,
  };
  commit(key, next);
  return next;
}

export function clearLearnAttempt(prefix: string, slug: string) {
  commit(attemptKey(prefix, slug), null);
}

export function useLearnAttempt(prefix: string, slug: string): LearnAttempt | null {
  const key = attemptKey(prefix, slug);
  return useSyncExternalStore(
    subscribe,
    () => readAttempt(key),
    () => null,
  );
}
