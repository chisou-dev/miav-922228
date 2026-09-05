import { AUTHOR_NAME, type BreadcrumbItem } from "@/features/library/catalog";
import { getSiteUrl } from "@/features/shared/site";

export function absoluteUrl(path: string) {
  const base = getSiteUrl().replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function authorPerson() {
  return {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: absoluteUrl("/author"),
  };
}

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type WorkFields = {
  title: string;
  description: string;
  genre: string;
  url: string;
  inLanguage?: string;
  hasPart?: readonly { name: string; position: number; url: string }[];
};

/** Schema.org Book for a literary work (series archive, flash, or continue landing). */
export function BookJsonLd({
  title,
  description,
  genre,
  url,
  inLanguage = "en",
  hasPart,
}: WorkFields) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Book",
        name: title,
        author: authorPerson(),
        description,
        genre,
        inLanguage,
        url: absoluteUrl(url),
        ...(hasPart && hasPart.length > 0
          ? {
              hasPart: hasPart.map((part) => ({
                "@type": "Chapter",
                name: part.name,
                position: part.position,
                url: absoluteUrl(part.url),
              })),
            }
          : {}),
      }}
    />
  );
}

/** Schema.org CreativeWorkSeries for series index pages. */
export function CreativeWorkSeriesJsonLd({
  title,
  description,
  genre,
  url,
  inLanguage = "en",
}: WorkFields) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "CreativeWorkSeries",
        name: title,
        author: authorPerson(),
        description,
        genre,
        inLanguage,
        url: absoluteUrl(url),
      }}
    />
  );
}

type ChapterFields = {
  name: string;
  description: string;
  position: number;
  url: string;
  workName: string;
  workUrl: string;
  inLanguage?: string;
};

/** Schema.org Chapter belonging to MIAV-922228 (or another Book work). */
export function ChapterJsonLd({
  name,
  description,
  position,
  url,
  workName,
  workUrl,
  inLanguage = "en",
}: ChapterFields) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Chapter",
        name,
        description,
        position,
        inLanguage,
        url: absoluteUrl(url),
        author: authorPerson(),
        isPartOf: {
          "@type": "Book",
          name: workName,
          url: absoluteUrl(workUrl),
          author: authorPerson(),
        },
      }}
    />
  );
}

/** Homepage: site (project) vs Person — distinct from the Book at /chapters. */
export function WebSiteJsonLd({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name,
        url: getSiteUrl(),
        description,
        inLanguage: "en",
        creator: authorPerson(),
      }}
    />
  );
}

/** Author page — only fields already published on /author. */
export function PersonJsonLd({ description }: { description: string }) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: AUTHOR_NAME,
        url: absoluteUrl("/author"),
        description,
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const withHref = items.filter((item) => item.href);
  if (withHref.length === 0) return null;

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: absoluteUrl(item.href) } : {}),
        })),
      }}
    />
  );
}
