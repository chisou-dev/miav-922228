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

const PREFIX = "listening-test";

export function clearListeningAttempt(slug: string) {
  clearLearnAttempt(PREFIX, slug);
}

export function recentListeningQuestionIds(slug: string) {
  return recentQuestionIds(PREFIX, slug);
}

export function beginListeningAttempt(
  slug: string,
  input: { rate: number; paper: DrawnQuestion[] },
) {
  return beginLearnAttempt(PREFIX, slug, { limitMs: null, rate: input.rate, paper: input.paper });
}

export function patchListeningAttempt(slug: string, patch: Partial<LearnAttempt>) {
  return patchLearnAttempt(PREFIX, slug, patch);
}

export function useListeningAttempt(slug: string) {
  return useLearnAttempt(PREFIX, slug);
}
