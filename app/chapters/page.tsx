import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { getAllChapters } from "@/lib/content/chapters";
import { getContentLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Chapter Archive | MIAV-922228",
  description:
    "A quiet archive of chapters from MIAV-922228 — literary records of Conversation, Accumulation, Preemption, and Absence.",
};

function formatArchiveDate(value: string | null): string {
  if (!value) return "Date unrecorded";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function ChaptersPage() {
  const locale = getContentLocale();
  const chapters = getAllChapters(locale);

  return (
    <SiteShell>
      <main className="pb-36 sm:pb-48">
        <section className="py-28 sm:py-36">
          <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
            Record
          </p>
          <h1 className="mt-10 max-w-xl text-[clamp(1.9rem,5vw,2.85rem)] font-medium leading-[1.25] tracking-[0.06em] text-[var(--foreground)]">
            Chapter Archive
          </h1>
          <p className="mt-12 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-14 sm:text-base sm:leading-[2.1]">
            A vault of chapters from MIAV-922228.
            <br />
            Each entry is a record in the work—held apart, readable in its own
            hour.
          </p>
        </section>

        <ol className="list-none">
          {chapters.map((chapter) => (
            <li
              key={chapter.slug}
              className="border-t border-[var(--line)] py-24 sm:py-32"
            >
              <article>
                <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
                  Chapter {String(chapter.number).padStart(2, "0")}
                </p>

                <h2 className="mt-6 text-[1.45rem] font-medium tracking-[0.05em] text-[var(--foreground)] sm:mt-8 sm:text-[1.75rem] sm:tracking-[0.06em]">
                  <a
                    href={`/chapters/${chapter.slug}`}
                    className="transition-opacity duration-300 hover:opacity-80"
                  >
                    {chapter.title}
                  </a>
                </h2>

                <p className="mt-5 text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)] sm:mt-6">
                  <time dateTime={chapter.published ?? undefined}>
                    {formatArchiveDate(chapter.published)}
                  </time>
                </p>

                <p className="mt-10 max-w-lg text-[0.95rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.15]">
                  {chapter.summary}
                </p>

                <p className="mt-14 sm:mt-16">
                  <a
                    href={`/chapters/${chapter.slug}`}
                    className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
                  >
                    Open record
                  </a>
                </p>
              </article>
            </li>
          ))}
        </ol>

        <p className="mt-8 border-t border-[var(--line)] pt-16 text-[0.72rem] leading-relaxed tracking-[0.12em] text-[var(--foreground-muted)] sm:pt-20">
          End of current archive — further chapters will be entered as they are
          recorded.
        </p>
      </main>
    </SiteShell>
  );
}
