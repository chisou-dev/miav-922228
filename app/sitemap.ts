import type { MetadataRoute } from "next";
import { getAllChapters } from "@/lib/content/chapters";
import { getContentLocale } from "@/lib/locale";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const chapters = getAllChapters(getContentLocale());
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/chapters`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
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
  ];

  const chapterRoutes: MetadataRoute.Sitemap = chapters.map((chapter) => ({
    url: `${baseUrl}/chapters/${chapter.slug}`,
    lastModified: chapter.published
      ? new Date(`${chapter.published}T00:00:00Z`)
      : lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...chapterRoutes];
}
