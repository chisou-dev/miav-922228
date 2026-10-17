import Link from "next/link";
import type { Metadata } from "next";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";

const description = "Enjoy stories through reading and listening.";

export const metadata: Metadata = readingTestMetadata({
  title: "MIAV LEARN | MIAV-922228",
  description,
  path: "/learn",
});

const cards = [
  {
    href: "/reading-test",
    title: "Reading",
    text: "Choose a story. Take your time, or try the clock.",
  },
  {
    href: "/listening-test",
    title: "Listening",
    text: "Listen without the text, then see what you remember.",
  },
] as const;

export default function LearnPage() {
  return (
    <ReadingTestFrame eyebrow="MIAV" title="MIAV LEARN" summary={description}>
      <div className="mx-auto mt-12 max-w-3xl border border-[var(--line)] p-7 text-center sm:p-10">
        <p className="text-xs tracking-[0.16em] text-[var(--foreground-muted)] uppercase">Featured series · 14 episodes</p>
        <h2 className="mt-4 text-3xl">Jeff</h2>
        <p className="mx-auto mt-3 max-w-lg text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">Learn through Jeff&apos;s life in Japan. English, Español and Français — beginner to advanced.</p>
        <Link href="/learn/jeff" className="mt-6 inline-block border border-[var(--line)] px-6 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">Explore Jeff →</Link>
      </div>
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
