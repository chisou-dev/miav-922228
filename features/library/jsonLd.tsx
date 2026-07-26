import { AUTHOR_NAME, type BreadcrumbItem } from "@/features/library/catalog";
import { getSiteUrl } from "@/features/shared/site";

export function absoluteUrl(path: string) {
  const base = getSiteUrl().replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
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
};

/** Schema.org Book for individual works (chapters / flash). */
export function BookJsonLd({
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
        "@type": "Book",
        name: title,
        author: {
          "@type": "Person",
          name: AUTHOR_NAME,
        },
        description,
        genre,
        inLanguage,
        url: absoluteUrl(url),
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
        author: {
          "@type": "Person",
          name: AUTHOR_NAME,
        },
        description,
        genre,
        inLanguage,
        url: absoluteUrl(url),
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
