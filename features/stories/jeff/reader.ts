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
  "jeff",
  "manuscripts",
  "en-advanced.md",
);

/**
 * Render the approved advanced English original as free literary fiction.
 * Do not duplicate or rewrite the manuscript. Keep MIAV LEARN untouched.
 */
export const getJeffAdvancedChapter = cache(async (chapterNumber: number) => {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 14) {
    throw new Error(`Invalid Jeff chapter: ${chapterNumber}`);
  }

  const manuscript = readFileSync(sourceFile, "utf8");
  const headings = [...manuscript.matchAll(/^# Jeff — Episode +([0-9]+) *: *(.+?) *$/gm)];
  if (headings.length !== 14) {
    throw new Error("Jeff advanced manuscript must have exactly 14 chapters");
  }

  const found = headings[chapterNumber - 1];
  if (!found || Number(found[1]) !== chapterNumber) {
    throw new Error(`Jeff manuscript chapter missing: ${chapterNumber}`);
  }
  const next = headings[chapterNumber];
  const bodyMarkdown = manuscript
    .slice((found.index ?? 0) + found[0].length, next?.index ?? manuscript.length)
    .trim();
  if (bodyMarkdown.length < 200) {
    throw new Error(`Jeff manuscript chapter is empty: ${chapterNumber}`);
  }

  const bodyHtml = String(await remark().use(breaks).use(html).process(bodyMarkdown));
  return {
    title: (found[2] ?? "").trim(),
    bodyHtml,
  };
});
