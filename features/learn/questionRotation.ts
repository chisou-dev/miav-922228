"use client";

import { drawQuiz, questionsForChannel, type DrawnQuestion } from "@/features/reading-test/draw";
import type { ReadingQuestion, TestChannel } from "@/features/reading-test/types";

const STORAGE_PREFIX = "miav-learn-question-rotation-v1:";

type RotationState = {
  remaining: string[];
  last: string[];
  known: string[];
};

const fallback = new Map<string, RotationState>();

function questionKey(question: ReadingQuestion) {
  return `${question.id}␟${question.question}`;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function validIds(values: unknown, eligible: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || !eligible.has(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function load(slug: string): RotationState | null {
  const key = STORAGE_PREFIX + slug;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const value = JSON.parse(raw) as Partial<RotationState>;
        if (value && typeof value === "object") {
          return {
            remaining: Array.isArray(value.remaining) ? value.remaining : [],
            last: Array.isArray(value.last) ? value.last : [],
            known: Array.isArray(value.known) ? value.known : [],
          };
        }
      }
    } catch {
      // Storage can be blocked or contain malformed data.
    }
  }
  return fallback.get(key) ?? null;
}

function save(slug: string, state: RotationState) {
  const key = STORAGE_PREFIX + slug;
  fallback.set(key, state);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // In-memory rotation remains available when storage is blocked.
    }
  }
}

/** Continue through a question bank before recycling questions. Avoid the
 * previous five whenever the bank is big enough. The same state is shared
 * by Reading and Listening for questions with identical IDs and wording.
 */
export function selectRotatingQuestionKeys(
  availableKeys: readonly string[],
  previous: RotationState | null,
  requestedCount = 5,
  random: () => number = Math.random,
): { picked: string[]; next: RotationState } {
  const keys = [...new Set(availableKeys)];
  const eligible = new Set(keys);
  const count = Math.min(Math.max(0, requestedCount), keys.length);
  const known = validIds(previous?.known, eligible);
  const last = validIds(previous?.last, eligible);
  let remaining = validIds(previous?.remaining, eligible);
  const additions = keys.filter((key) => !known.includes(key) && !remaining.includes(key));
  remaining = [...shuffled(additions, random), ...remaining];
  const picked: string[] = [];

  while (picked.length < count) {
    if (remaining.length === 0) {
      const avoided = new Set([...last, ...picked]);
      const fresh = keys.filter((key) => !avoided.has(key));
      const delayed = keys.filter((key) => avoided.has(key) && !picked.includes(key));
      remaining = [...shuffled(fresh, random), ...shuffled(delayed, random)];
    }
    const item = remaining.shift();
    if (item && !picked.includes(item)) picked.push(item);
  }

  return { picked, next: { remaining, last: picked, known: keys } };
}

export function drawRotatingQuiz(
  questions: readonly ReadingQuestion[],
  options: { slug: string; channel: TestChannel; count?: number },
): DrawnQuestion[] {
  const pool = questionsForChannel(questions, options.channel);
  if (pool.length === 0) return [];
  const keys = pool.map(questionKey);
  const { picked, next } = selectRotatingQuestionKeys(
    keys,
    load(options.slug),
    options.count ?? 5,
  );
  const lookup = new Map(pool.map((question) => [questionKey(question), question]));
  const selected = picked
    .map((key) => lookup.get(key))
    .filter((question): question is ReadingQuestion => question != null);
  const paper = drawQuiz(selected, { count: selected.length, channel: options.channel });
  if (paper.length > 0 && paper.length === selected.length) save(options.slug, next);
  return paper;
}
