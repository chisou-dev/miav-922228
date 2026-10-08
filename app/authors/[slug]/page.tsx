import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadingAuthor, getReadingStories } from "@/features/reading-test/catalog";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const slugs = new Set(
    getReadingStories().map((story) => story.authorSlug),
  );
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getReadingAuthor(slug);
  if (!author) return { title: "Author | 5-Minute Reading Test" };

  return libraryPageMetadata({
    title: `${author.name} | 5-Minute Reading Test`,
    description: `Stories by ${author.name} in the 5-minute reading test.`,
    path: `/authors/${author.slug}`,
  });
}

export default async function ReadingAuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getReadingAuthor(slug);
  if (!author) notFound();

  return (
    <ReadingTestFrame eyebrow="Author" title={author.name}>
      <ul className="mx-auto mt-14 max-w-md space-y-6 text-center sm:mt-16">
        {author.works.map((work) => (
          <li key={work.slug}>
            {work.seriesTitle ? (
              <p className="text-[0.8rem] tracking-[0.08em] text-[var(--foreground-muted)]">
                {work.seriesTitle}
              </p>
            ) : null}
            <a
              href={work.href}
              className="text-[0.95rem] leading-relaxed text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
            >
              {work.title}
            </a>
          </li>
        ))}
      </ul>
    </ReadingTestFrame>
  );
}
