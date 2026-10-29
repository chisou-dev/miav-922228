import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { ReadingQuestion } from "@/features/reading-test/types";

export const SANTA_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SantaLevel = (typeof SANTA_LEVELS)[number];
export const SANTA_EPISODE_COUNT = 6;

export const SANTA_LEVEL_LABELS: Record<SantaLevel, string> = {
  beginner: "Beginner · A1–A2",
  intermediate: "Intermediate · B1",
  advanced: "Advanced · B2–C1",
};

/**
 * Approved 2026-10-27 English Questions A v1.4 answer positions.
 * 18 groups of five, audited against each approved manuscript.
 * Only loaded on the server; the answers are never printed in lesson text.
 */
const ANSWER_KEYS: Record<SantaLevel, readonly string[]> = {
  beginner: ["CBDAA", "BDACB", "ABDBA", "DCABC", "DBACD", "BCADC"],
  intermediate: ["BDACA", "CADBC", "DABCD", "ACBDA", "DBCAD", "BCDAB"],
  advanced: ["CBADC", "BDACB", "DCABD", "ABDCA", "DACBD", "CDABC"],
};

const EXPECTED_COUNTS: Record<SantaLevel, Record<string, number>> = {
  beginner: { A: 8, B: 8, C: 7, D: 7 },
  intermediate: { A: 8, B: 7, C: 7, D: 8 },
  advanced: { A: 7, B: 7, C: 8, D: 8 },
};

export function isSantaLevel(value: string): value is SantaLevel {
  return (SANTA_LEVELS as readonly string[]).includes(value);
}

export type SantaChapter = {
  episode: number;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
};

export const getSantaChapters = cache((level: SantaLevel): SantaChapter[] => {
  const file = path.join(process.cwd(), "content", "learn", "santas-shelf", "manuscripts", "en-" + level + ".md");
  const source = fs.readFileSync(file, "utf8");
  const headings = [...source.matchAll(/^## Chapter ([1-6]) — (.+)$/gm)];
  if (headings.length !== SANTA_EPISODE_COUNT) {
    throw new Error("Santa's Shelf: expected six chapters at " + level);
  }
  const keys = ANSWER_KEYS[level];
  const allKeys = keys.join("");
  const actual = Object.fromEntries("ABCD".split("").map(k => [k, [...allKeys].filter(c => c === k).length]));
  if ("ABCD".split("").some(k => actual[k] !== EXPECTED_COUNTS[level][k])) {
    throw new Error("Santa's Shelf: v1.4 answer audit mismatch: " + level);
  }

  return headings.map((heading, chapterIndex) => {
    const episode = Number(heading[1]);
    if (episode !== chapterIndex + 1) throw new Error("Santa's Shelf: invalid chapter order");
    const title = heading[2].trim();
    const end = headings[chapterIndex + 1]?.index ?? source.length;
    const segment = source.slice((heading.index ?? 0) + heading[0].length, end).trim();
    const questionStart = segment.indexOf("### Reading Questions A — ");
    if (questionStart < 200) throw new Error("Santa's Shelf: missing chapter body/questions");
    const body = segment.slice(0, questionStart).replace(/\n---\s*$/, "").trim().replace(/^\*\*The End\*\*$/gm, "The End");
    const questionText = segment.slice(questionStart);
    const pattern = /^#### Question ([1-5]) — ([^\n]+)\n\n\*\*A\.\*\* ([^\n]+)\n\*\*B\.\*\* ([^\n]+)\n\*\*C\.\*\* ([^\n]+)\n\*\*D\.\*\* ([^\n]+)/gm;
    const found = [...questionText.matchAll(pattern)];
    if (found.length !== 5 || body.length < 200) {
      throw new Error("Santa's Shelf: invalid story/question count: " + level + "/" + episode);
    }
    const questions = found.map((m, questionIndex): ReadingQuestion => {
      if (Number(m[1]) !== questionIndex + 1) throw new Error("Santa's Shelf: wrong question order");
      const choices = [m[3], m[4], m[5], m[6]] as [string, string, string, string];
      if (new Set(choices).size !== 4) throw new Error("Santa's Shelf: repeated answer choice");
      const answerLetter = keys[chapterIndex][questionIndex];
      const answerIndex = "ABCD".indexOf(answerLetter);
      if (answerIndex < 0) throw new Error("Santa's Shelf: invalid answer key");
      return {
        id: "ss-" + level + "-" + String(episode).padStart(2, "0") + "-q" + (questionIndex + 1),
        question: m[2].trim(),
        choices,
        correctAnswer: choices[answerIndex],
        channels: ["reading"],
      };
    });
    return { episode, title, body, questions };
  });
});

export function getSantaChapter(level: SantaLevel, episode: number) {
  if (!Number.isInteger(episode) || episode < 1 || episode > SANTA_EPISODE_COUNT) return null;
  return getSantaChapters(level)[episode - 1] ?? null;
}

export function santaChapterHref(level: SantaLevel, episode: number) {
  return "/learn/santas-shelf/" + level + "/" + episode + "/reading";
}

export function santaSessionSlug(level: SantaLevel, episode: number) {
  return "santas-shelf-" + level + "-" + String(episode).padStart(2, "0");
}
