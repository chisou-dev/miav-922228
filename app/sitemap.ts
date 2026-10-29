import type { MetadataRoute } from "next";
import {
  categories,
  chapterHref,
  flashHref,
  flashPieces,
  seriesHref,
  seriesList,
} from "@/features/library/catalog";
import { getAllChapters } from "@/features/stories/miav/chapters";
import { nextTimeISeeYouWorkId } from "@/features/stories/next-time-i-see-you/work";
import { after50MillionWorkId } from "@/features/stories/after-50-million/work";
import {
  chapterArchivePath,
  chapterPath,
} from "@/features/stories/miav/edition";
import { getSiteUrl } from "@/features/shared/site";
import { JEFF_EPISODE_COUNT, JEFF_LANGUAGES, JEFF_LEVELS, jeffChapterHref } from "@/features/jeff/catalog";
import { SANTA_LEVELS, SANTA_EPISODE_COUNT, santaChapterHref } from "@/features/santas-shelf/catalog";
import { SANTA_LANGUAGES, SANTA_TRANSLATED_LANGUAGES, santaLocalizedChapterHref } from "@/features/santas-shelf/localized";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const enChapters = getAllChapters("en");
  const frChapters = getAllChapters("fr");
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/works`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}${chapterArchivePath("en")}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}${chapterArchivePath("en")}`,
          fr: `${baseUrl}${chapterArchivePath("fr")}`,
          "x-default": `${baseUrl}${chapterArchivePath("en")}`,
        },
      },
    },
    {
      url: `${baseUrl}${chapterArchivePath("fr")}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}${chapterArchivePath("en")}`,
          fr: `${baseUrl}${chapterArchivePath("fr")}`,
          "x-default": `${baseUrl}${chapterArchivePath("en")}`,
        },
      },
    },
    {
      url: `${baseUrl}/books`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/apps`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/author`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/world-map`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/site-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Keep the playable listening sessions discoverable through the language indexes,
  // while listing the 126 primary reading chapters without duplicate session URLs.
  const jeffRoutes: MetadataRoute.Sitemap = [
    "/learn",
    "/learn/jeff",
    "/reading-test",
    "/listening-test",
    ...JEFF_LANGUAGES.map((language) => `/learn/jeff/${language}`),
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route === "/learn/jeff" ? 0.85 : 0.75,
  }));

  const jeffEpisodeRoutes: MetadataRoute.Sitemap = JEFF_LANGUAGES.flatMap((language) =>
    JEFF_LEVELS.flatMap((level) =>
      Array.from({ length: JEFF_EPISODE_COUNT }, (_, i) => ({
        url: `${baseUrl}${jeffChapterHref(language, level, i + 1, "reading")}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.65,
      })),
    ),
  );

  const santaRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl + "/learn/santas-shelf",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...SANTA_LANGUAGES.map(language => ({
      url: baseUrl + "/learn/santas-shelf/" + language,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...SANTA_LEVELS.flatMap(level =>
      Array.from({ length: SANTA_EPISODE_COUNT }, (_, i) => ({
        url: baseUrl + santaChapterHref(level, i + 1),
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.65,
      }))
    ),
    ...SANTA_TRANSLATED_LANGUAGES.flatMap(language =>
      SANTA_LEVELS.flatMap(level =>
        Array.from({ length: SANTA_EPISODE_COUNT }, (_, i) => ({
          url: baseUrl + santaLocalizedChapterHref(language, level, i + 1),
          lastModified,
          changeFrequency: "monthly" as const,
          priority: 0.65,
        }))
      )
    ),
  ];

  const libraryRoutes: MetadataRoute.Sitemap = [
    ...categories.map((category) => ({
      url: `${baseUrl}${category.path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...seriesList.map((series) => ({
      url: `${baseUrl}${seriesHref(series.id)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: series.id === "miav-922228" ? 0.85 : 0.7,
    })),
    ...flashPieces.map((piece) => ({
      url: `${baseUrl}${flashHref(piece.slug)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ];

  const chapterRoutes: MetadataRoute.Sitemap = [];

  for (const chapter of enChapters) {
    const enPath = chapterPath(chapter.slug, "en");
    const frPath = chapterPath(chapter.slug, "fr");
    const modified = chapter.published
      ? new Date(`${chapter.published}T00:00:00Z`)
      : lastModified;
    const languages = {
      en: `${baseUrl}${enPath}`,
      fr: `${baseUrl}${frPath}`,
      "x-default": `${baseUrl}${enPath}`,
    };

    chapterRoutes.push({
      url: `${baseUrl}${enPath}`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages },
    });
  }

  for (const chapter of frChapters) {
    const enPath = chapterPath(chapter.slug, "en");
    const frPath = chapterPath(chapter.slug, "fr");
    const modified = chapter.published
      ? new Date(`${chapter.published}T00:00:00Z`)
      : lastModified;
    const languages = {
      en: `${baseUrl}${enPath}`,
      fr: `${baseUrl}${frPath}`,
      "x-default": `${baseUrl}${enPath}`,
    };

    chapterRoutes.push({
      url: `${baseUrl}${frPath}`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages },
    });
  }

  const indexedStoryIds = new Set([
    nextTimeISeeYouWorkId,
    after50MillionWorkId,
    "jeff",
  ]);
  const storyChapterRoutes: MetadataRoute.Sitemap = seriesList.flatMap(
    (series) => {
      if (!indexedStoryIds.has(series.id)) return [];
      return series.chapters
        .filter((chapter) => (series.id === "jeff" || chapter.contentSlug) && !chapter.continueReading)
        .map((chapter) => ({
          url: `${baseUrl}${chapterHref(series.id, chapter.pathSlug)}`,
          lastModified,
          changeFrequency: "monthly" as const,
          priority: 0.72,
        }));
    },
  );

  return [
    ...staticRoutes,
    ...jeffRoutes,
    ...jeffEpisodeRoutes,
    ...santaRoutes,
    ...libraryRoutes,
    ...chapterRoutes,
    ...storyChapterRoutes,
  ];
}
