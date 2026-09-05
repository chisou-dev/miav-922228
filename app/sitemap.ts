import type { MetadataRoute } from "next";
import {
  categories,
  flashHref,
  flashPieces,
  seriesHref,
  seriesList,
} from "@/features/library/catalog";
import { getAllChapters } from "@/features/stories/miav/chapters";
import {
  chapterArchivePath,
  chapterPath,
} from "@/features/stories/miav/edition";
import { getSiteUrl } from "@/features/shared/site";

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

  return [...staticRoutes, ...libraryRoutes, ...chapterRoutes];
}
