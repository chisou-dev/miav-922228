import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import breaks from "remark-breaks";
import html from "remark-html";
import {
  defaultLocale,
  type Locale,
} from "@/features/shared/locale";

const storiesRoot = path.join(process.cwd(), "content", "stories");

/**
 * Load series chapter markdown from content/stories/{seriesId}/{locale}/{slug}.md
 * Keeps MIAV archive (content/chapters) separate from other series.
 */
export async function getSeriesStoryChapter(
  seriesId: string,
  contentSlug: string,
  locale: Locale = defaultLocale,
): Promise<{ title: string; bodyHtml: string; bodyMarkdown: string } | null> {
  const preferred = path.join(
    storiesRoot,
    seriesId,
    locale,
    `${contentSlug}.md`,
  );
  const fallback = path.join(
    storiesRoot,
    seriesId,
    defaultLocale,
    `${contentSlug}.md`,
  );
  const filePath = fs.existsSync(preferred)
    ? preferred
    : fs.existsSync(fallback)
      ? fallback
      : null;
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const bodyMarkdown = content.trim();
  const title =
    typeof data.title === "string" && data.title.length > 0
      ? data.title
      : contentSlug;
  const result = await remark().use(breaks).use(html).process(bodyMarkdown);
  return {
    title,
    bodyMarkdown,
    bodyHtml: String(result),
  };
}

export function seriesStoryExists(
  seriesId: string,
  contentSlug: string,
  locale: Locale = defaultLocale,
): boolean {
  const preferred = path.join(
    storiesRoot,
    seriesId,
    locale,
    `${contentSlug}.md`,
  );
  const fallback = path.join(
    storiesRoot,
    seriesId,
    defaultLocale,
    `${contentSlug}.md`,
  );
  return fs.existsSync(preferred) || fs.existsSync(fallback);
}
