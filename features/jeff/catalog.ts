import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getJeffQuestions } from "@/features/jeff/questions";
import type { ReadingQuestion } from "@/features/reading-test/types";

export const JEFF_LANGUAGES = ["en", "es", "fr"] as const;
export const JEFF_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type JeffLanguage = (typeof JEFF_LANGUAGES)[number];
export type JeffLevel = (typeof JEFF_LEVELS)[number];
export type JeffMode = "reading" | "listening";
export const JEFF_LANGUAGE_LABELS: Record<JeffLanguage, string> = {
  en: "English (US)", es: "Español (España)", fr: "Français (France)",
};
export const JEFF_LEVEL_LABELS: Record<JeffLanguage, Record<JeffLevel, string>> = {
  en: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
  es: { beginner: "Inicial · A1–A2", intermediate: "Intermedio · A2–B1", advanced: "Avanzado · B2–C1" },
  fr: { beginner: "Débutant · A1–A2", intermediate: "Intermédiaire · B1", advanced: "Avancé · B2+" },
};
export const JEFF_EPISODE_COUNT = 14;

export function isJeffLanguage(value: string): value is JeffLanguage {
  return (JEFF_LANGUAGES as readonly string[]).includes(value);
}
export function isJeffLevel(value: string): value is JeffLevel {
  return (JEFF_LEVELS as readonly string[]).includes(value);
}
export function isJeffMode(value: string): value is JeffMode {
  return value === "reading" || value === "listening";
}
export type JeffChapter = {
  episode: number;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
};

/** Only validated language/level values ever reach the filesystem; no user-controlled paths. */
export const getJeffChapters = cache((language: JeffLanguage, level: JeffLevel): JeffChapter[] => {
  const file = path.join(process.cwd(), "content", "learn", "jeff", "manuscripts", `${language}-${level}.md`);
  const text = fs.readFileSync(file, "utf8");
  const heading = /^# Jeff — (?:Episode|Episodio|Épisode)\s+(\d+)\s*:\s*(.+?)\s*$/gm;
  const found = [...text.matchAll(heading)];
  if (found.length !== JEFF_EPISODE_COUNT) throw new Error(`${file}: expected 14 Jeff chapters, got ${found.length}`);
  return found.map((match, idx) => {
    const episode = Number(match[1]);
    if (episode !== idx + 1) throw new Error(`Jeff chapter order mismatch: ${episode}`);
    const title = (match[2] ?? "").trim();
    const end = idx + 1 < found.length ? found[idx + 1]?.index ?? text.length : text.length;
    const body = text.slice((match.index ?? 0) + match[0].length, end)
      .replace(/\n\s*---\s*$/, "")
      .replace(/^\s*\*(?:American English|English edition)[^\n]*\*\s*\n/i, "")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/(?<!\w)\*([^*\n]+)\*/g, "$1")
      .replace(/^---\s*$/gm, "")
      .trim();
    if (body.length < 200) throw new Error(`Missing Jeff chapter ${episode}`);
    const questions = getJeffQuestions(language, episode);
    if (questions.length < 5) throw new Error(`Missing approved questions: ${language}/${episode}`);
    return { episode, title, body, questions };
  });
});
export function getJeffChapter(language: JeffLanguage, level: JeffLevel, episode: number) {
  if (!Number.isInteger(episode) || episode < 1 || episode > JEFF_EPISODE_COUNT) return null;
  return getJeffChapters(language, level)[episode - 1] ?? null;
}
export function jeffChapterHref(language: JeffLanguage, level: JeffLevel, episode: number, mode: JeffMode) {
  return `/learn/jeff/${language}/${level}/${episode}/${mode}`;
}
export function jeffSessionSlug(language: JeffLanguage, level: JeffLevel, episode: number) {
  return `jeff-${language}-${level}-${String(episode).padStart(2, "0")}`;
}
