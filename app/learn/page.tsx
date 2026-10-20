import Link from "next/link";
import Image from "next/image";
import { EDITORIAL_ART } from "@/features/library/editorialArt";
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
      <section className="mx-auto mt-12 max-w-3xl overflow-hidden border border-[var(--line)] sm:flex">
        <Link href="/learn/jeff" aria-label="Explore Jeff stories"
          className="relative block aspect-[16/9] w-full shrink-0 border-b border-[var(--line)] sm:aspect-auto sm:w-[45%] sm:border-b-0 sm:border-r">
          <Image src={EDITORIAL_ART.jeff.src} alt={EDITORIAL_ART.jeff.alt}
            fill sizes="(max-width: 639px) 100vw, 340px"
            className="object-cover"/>
        </Link>
        <div className="px-6 py-7 text-left sm:px-8 sm:py-9">
          <p className="text-xs tracking-[0.16em] text-[var(--foreground-muted)] uppercase">Featured series · 14 episodes</p>
          <h2 className="mt-4 text-3xl">Jeff</h2>
          <p className="mt-3 max-w-lg text-[0.95rem] leading-[1.85] text-[var(--foreground-muted)]">
            Working in a small Japanese restaurant, Jeff begins to find his place through the people around him.
          </p>
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[var(--foreground-muted)]">
            Read in English, Spanish, or French. Three levels.
          </p>
          <Link href="/learn/jeff" className="mt-5 inline-flex min-h-11 items-center underline underline-offset-4">
            Explore Jeff →
          </Link>
        </div>
      </section>
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
