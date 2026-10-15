import type { Metadata } from "next";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";

const description = "Improve your English through stories.";

export const metadata: Metadata = readingTestMetadata({
  title: "MIAV LEARN | MIAV-922228",
  description,
  path: "/learn",
});

const cards = [
  {
    href: "/reading-test",
    title: "Reading Test",
    text: "Read a story. Race the clock. Test what you remember.",
  },
  {
    href: "/listening-test",
    title: "Listening Test",
    text: "Listen to a story. No text. Test what you heard.",
  },
] as const;

export default function LearnPage() {
  return (
    <ReadingTestFrame eyebrow="MIAV" title="MIAV LEARN" summary={description}>
      <ul className="mx-auto mt-14 grid max-w-3xl gap-6 sm:mt-16 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <a
              href={card.href}
              className="flex h-full min-h-40 flex-col border border-[var(--line)] px-6 py-8 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            >
              <h2 className="text-[clamp(1.35rem,4vw,1.75rem)] font-medium leading-snug tracking-[0.03em]">
                {card.title}
              </h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
                {card.text}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </ReadingTestFrame>
  );
}
