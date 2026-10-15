"use client";

import {
  beginLearnAttempt,
  clearLearnAttempt,
  patchLearnAttempt,
  recentQuestionIds,
  useLearnAttempt,
  type LearnAttempt,
} from "@/features/learn/attempt";
import type { DrawnQuestion } from "@/features/reading-test/draw";

const PREFIX = "reading-test";

export function clearReadingAttempt(slug: string) {
  clearLearnAttempt(PREFIX, slug);
}

export function recentReadingQuestionIds(slug: string) {
  return recentQuestionIds(PREFIX, slug);
}

export function beginReadingAttempt(
  slug: string,
  input: { limitMs: number | null; paper: DrawnQuestion[] },
) {
  return beginLearnAttempt(PREFIX, slug, input);
}

export function patchReadingAttempt(slug: string, patch: Partial<LearnAttempt>) {
  return patchLearnAttempt(PREFIX, slug, patch);
}

export function useReadingAttempt(slug: string) {
  return useLearnAttempt(PREFIX, slug);
}
