import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { ReadingQuestion } from "@/features/reading-test/types";
import { SANTA_EPISODE_COUNT, type SantaLevel } from "@/features/santas-shelf/catalog";

export const SANTA_LANGUAGES = ["en", "es", "fr"] as const;
export type SantaLanguage = (typeof SANTA_LANGUAGES)[number];
export const SANTA_TRANSLATED_LANGUAGES = ["es", "fr"] as const;
export type SantaTranslatedLanguage = (typeof SANTA_TRANSLATED_LANGUAGES)[number];

export const SANTA_TITLES: Record<SantaLanguage, string> = {
  en: "Santa's Shelf",
  es: "La estantería de Papá Noel",
  fr: "L’étagère du Père Noël",
};
export const SANTA_LANGUAGE_LABELS: Record<SantaLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
};
export const SANTA_LOCAL_LEVEL_LABELS: Record<SantaLanguage, Record<SantaLevel, string>> = {
  en: { beginner: "Beginner · A1–A2", intermediate: "Intermediate · B1", advanced: "Advanced · B2–C1" },
  es: { beginner: "Principiante · A1–A2", intermediate: "Intermedio · B1", advanced: "Avanzado · B2–C1" },
  fr: { beginner: "Débutant · A1–A2", intermediate: "Intermédiaire · B1", advanced: "Avancé · B2–C1" },
};

/**
 * Final audited Questions A keys for es-ES and fr-FR.
 * Checked against each language's 90-answer edition; never print in UI.
 */
const answerKeys: Record<SantaTranslatedLanguage, Record<SantaLevel, readonly string[]>> = {
  es: {
    beginner: ["CBDAA", "BDACB", "ABDBA", "DCABC", "DBACD", "BCADC"],
    intermediate: ["BDACA", "CADBC", "DABCD", "ACBDA", "DBCAD", "BCDAB"],
    advanced: ["CBADC", "BDACB", "DCABD", "ABDCA", "DACBD", "CDABC"],
  },
  fr: {
    beginner: ["CBDAA", "BDACB", "ABDBA", "DCABC", "DBACD", "BCADC"],
    intermediate: ["BDACA", "CADBC", "DABCD", "ACBDA", "DBCAD", "BCDAB"],
    advanced: ["CBADC", "BDACB", "DCABD", "ABDCA", "DACBD", "CDABC"],
  },
};

export function isSantaLanguage(value: string): value is SantaLanguage {
  return (SANTA_LANGUAGES as readonly string[]).includes(value);
}
export function isSantaTranslatedLanguage(value: string): value is SantaTranslatedLanguage {
  return (SANTA_TRANSLATED_LANGUAGES as readonly string[]).includes(value);
}

export type SantaLocalizedChapter = {
  episode: number;
  title: string;
  body: string;
  questions: readonly ReadingQuestion[];
};

/**
 * Read the approved final manuscripts and multiple-choice documents directly
 * from the content directory; no rewriting, shortening or retranslation.
 */
export const getSantaTranslatedChapters = cache(
  (language: SantaTranslatedLanguage, level: SantaLevel): SantaLocalizedChapter[] => {
    const root = path.join(process.cwd(), "content", "learn", "santas-shelf");
    const story = fs.readFileSync(path.join(root, "manuscripts", language + "-" + level + ".md"), "utf8");
    const questionSource = fs.readFileSync(path.join(root, "questions", language + "-" + level + ".md"), "utf8");
    const labels = language === "es" ? "Capítulo" : "Chapitre";
    const chapterPattern = new RegExp("^## " + labels + " ([1-6]) — (.+)$", "gm");
    const questionChapterPattern = new RegExp("^# .+?— " + labels + " ([1-6])\\s*[:：]\\s*(.+)$", "gm");
    const chapterHeadings = [...story.matchAll(chapterPattern)];
    const questionHeadings = [...questionSource.matchAll(questionChapterPattern)];
    if (chapterHeadings.length !== SANTA_EPISODE_COUNT || questionHeadings.length !== SANTA_EPISODE_COUNT) {
      throw new Error("Santa's Shelf: missing final " + language + "/" + level + " chapters or questions");
    }

    return chapterHeadings.map((heading, index) => {
      const episode = Number(heading[1]);
      const questionHeading = questionHeadings[index];
      const title = heading[2].trim();
      if (episode !== index + 1 || Number(questionHeading[1]) !== episode || questionHeading[2].trim() !== title) {
        throw new Error("Santa's Shelf: chapter title or order mismatch " + language + "/" + level + "/" + episode);
      }
      const body = story
        .slice((heading.index ?? 0) + heading[0].length, chapterHeadings[index + 1]?.index ?? story.length)
        .trim();
      const questionBlock = questionSource.slice(
        (questionHeading.index ?? 0) + questionHeading[0].length,
        questionHeadings[index + 1]?.index ?? questionSource.length
      );
      const questionHeadingsInChapter = [...questionBlock.matchAll(/^### ([1-5])\. ([^\n]+)$/gm)];
      if (body.length < 200 || questionHeadingsInChapter.length !== 5) {
        throw new Error("Santa's Shelf: missing final story/questions " + language + "/" + level + "/" + episode);
      }
      const keys = answerKeys[language][level][index];
      const questions = questionHeadingsInChapter.map((q, qIndex): ReadingQuestion => {
        if (Number(q[1]) !== qIndex + 1) throw new Error("Santa's Shelf: question order mismatch");
        const rawOptions = questionBlock.slice(
          (q.index ?? 0) + q[0].length,
          questionHeadingsInChapter[qIndex + 1]?.index ?? questionBlock.length
        );
        const options = [...rawOptions.matchAll(/^\*\*([A-D])\.\*\*\s+(.+?)\s*$/gm)];
        if (options.length !== 4 || options.some((o, i) => o[1] !== "ABCD"[i])) {
          throw new Error("Santa's Shelf: invalid final choices " + language + "/" + level + "/" + episode);
        }
        const choices = options.map(o => o[2].trim()) as [string, string, string, string];
        if (new Set(choices).size !== 4) throw new Error("Santa's Shelf: duplicate answer choice");
        const answerIndex = "ABCD".indexOf(keys[qIndex]);
        if (answerIndex < 0) throw new Error("Santa's Shelf: missing answer");
        return {
          id: "ss-" + language + "-" + level + "-" + String(episode).padStart(2, "0") + "-q" + (qIndex + 1),
          question: q[2].trim(),
          choices,
          correctAnswer: choices[answerIndex],
          channels: ["reading"],
        };
      });
      return { episode, title, body, questions };
    });
  }
);

export function getSantaTranslatedChapter(language: SantaTranslatedLanguage, level: SantaLevel, episode: number) {
  if (!Number.isInteger(episode) || episode < 1 || episode > SANTA_EPISODE_COUNT) return null;
  return getSantaTranslatedChapters(language, level)[episode - 1] ?? null;
}
export function santaLocalizedChapterHref(language: SantaTranslatedLanguage, level: SantaLevel, episode: number) {
  return "/learn/santas-shelf/" + language + "/" + level + "/" + episode + "/reading";
}
export function santaLocalizedSessionSlug(language: SantaTranslatedLanguage, level: SantaLevel, episode: number) {
  return "santas-shelf-" + language + "-" + level + "-" + String(episode).padStart(2, "0");
}
