import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import breaks from "remark-breaks";
import html from "remark-html";
import {
  defaultLocale,
  getContentLocale,
  isLocale,
  type Locale,
} from "@/lib/locale";

const contentRoot = path.join(process.cwd(), "content", "chapters");

export type ChapterPresentation = "reading" | "threshold";

export type ChapterMeta = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  published: string | null;
  locale: Locale;
  presentation: ChapterPresentation;
};

export type ChapterDocument = ChapterMeta & {
  bodyMarkdown: string;
  bodyHtml: string;
};

function chapterDirectory(locale: Locale): string {
  return path.join(contentRoot, locale);
}

function chapterFilePath(locale: Locale, slug: string): string {
  return path.join(chapterDirectory(locale), `${slug}.md`);
}

function parseChapterFile(
  filePath: string,
  fallbackLocale: Locale,
  fallbackSlug: string,
): ChapterMeta & { bodyMarkdown: string } {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const number = Number(data.number);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid chapter number in ${filePath}`);
  }

  const slug =
    typeof data.slug === "string" && data.slug.length > 0
      ? data.slug
      : fallbackSlug;

  const title =
    typeof data.title === "string" && data.title.length > 0
      ? data.title
      : slug;

  const summary = typeof data.summary === "string" ? data.summary : "";

  const published =
    typeof data.published === "string" && data.published.length > 0
      ? data.published
      : data.published instanceof Date
        ? data.published.toISOString().slice(0, 10)
        : null;

  const localeValue =
    typeof data.locale === "string" && isLocale(data.locale)
      ? data.locale
      : fallbackLocale;

  const presentation: ChapterPresentation =
    data.presentation === "threshold" ? "threshold" : "reading";

  return {
    number,
    slug,
    title,
    summary,
    published,
    locale: localeValue,
    presentation,
    bodyMarkdown: content.trim(),
  };
}

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(breaks).use(html).process(markdown);
  return String(result);
}

export function getChapterSlugs(locale: Locale = defaultLocale): string[] {
  const dir = chapterDirectory(locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}

export function getAllChapters(
  locale: Locale = getContentLocale(),
): ChapterMeta[] {
  return getChapterSlugs(locale)
    .map((slug) => {
      const parsed = parseChapterFile(
        chapterFilePath(locale, slug),
        locale,
        slug,
      );
      const { bodyMarkdown: _body, ...meta } = parsed;
      return meta;
    })
    .sort((a, b) => a.number - b.number);
}

export async function getChapterBySlug(
  slug: string,
  locale: Locale = getContentLocale(),
): Promise<ChapterDocument | null> {
  const filePath = chapterFilePath(locale, slug);
  if (!fs.existsSync(filePath)) return null;

  const parsed = parseChapterFile(filePath, locale, slug);
  const bodyHtml = parsed.bodyMarkdown
    ? await markdownToHtml(parsed.bodyMarkdown)
    : "";

  return {
    ...parsed,
    bodyHtml,
  };
}

export function getAdjacentChapters(
  slug: string,
  locale: Locale = getContentLocale(),
): {
  previous: ChapterMeta | null;
  next: ChapterMeta | null;
} {
  const list = getAllChapters(locale);
  const index = list.findIndex((chapter) => chapter.slug === slug);
  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}
