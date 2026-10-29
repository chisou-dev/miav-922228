import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { remark } from "remark";
import breaks from "remark-breaks";
import html from "remark-html";

const sourceFile = path.join(
  process.cwd(),
  "content",
  "learn",
  "santas-shelf",
  "manuscripts",
  "en-advanced.md",
);

/**
 * Free children's-literature edition from the final approved advanced English
 * manuscript. Question material is deliberately excluded. Reading tests and
 * translations remain unmodified.
 */
export const getSantaShelfFictionChapter = cache(async (chapterNumber: number) => {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 6) {
    throw new Error(`Invalid Santa's Shelf chapter number: ${chapterNumber}`);
  }

  const source = readFileSync(sourceFile, "utf8");
  const headings = [...source.matchAll(/^## Chapter ([1-6]) — (.+)$/gm)];
  if (headings.length !== 6 || headings.some((h, i) => Number(h[1]) !== i + 1)) {
    throw new Error("Santa's Shelf advanced manuscript must contain six chapters in order");
  }

  const current = headings[chapterNumber - 1];
  const next = headings[chapterNumber];
  const segment = source.slice(
    (current.index ?? 0) + current[0].length,
    next?.index ?? source.length,
  );
  const questionsStart = segment.indexOf("\n### Reading Questions A — Advanced");
  if (questionsStart < 200) {
    throw new Error(`Santa's Shelf reading questions separator missing: ${chapterNumber}`);
  }
  const storyMarkdown = segment.slice(0, questionsStart).trim();
  if (storyMarkdown.length < 1000 || storyMarkdown.includes("#### Question")) {
    throw new Error(`Invalid Santa's Shelf chapter body: ${chapterNumber}`);
  }

  const bodyHtml = String(await remark().use(breaks).use(html).process(storyMarkdown));
  return { title: (current[2] ?? "").trim(), bodyHtml };
});
