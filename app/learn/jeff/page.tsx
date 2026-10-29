import Image from "next/image";
import { EDITORIAL_ART } from "@/features/library/editorialArt";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { JEFF_LANGUAGES, JEFF_LANGUAGE_LABELS } from "@/features/jeff/catalog";

export const metadata = readingTestMetadata({
  title: "Jeff — 14-Episode Fiction in Three Languages | MIAV LEARN",
  description: "Read Jeff, a free 14-episode fiction series in English, Spanish, or French, with beginner, intermediate, and advanced editions. Read or listen, then answer five comprehension questions.",
  path: "/learn/jeff",
});
export default function JeffHome() {
  return (
    <ReadingTestFrame eyebrow="MIAV LEARN · FEATURED" title="Jeff" summary="An American working in Japan slowly becomes part of a place he barely knows. Fourteen connected stories, told in three languages.">
      <section className="mx-auto mt-9 max-w-3xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[var(--line)]">
          <Image src={EDITORIAL_ART.jeff.src} alt={EDITORIAL_ART.jeff.alt}
            fill sizes="(max-width: 768px) 100vw, 740px"
            className="object-cover"/>
        </div>
        <p className="mx-auto mt-5 max-w-lg text-center text-sm leading-[1.85] text-[var(--foreground-muted)]">
          In a small restaurant and on the streets he walks each day, Jeff starts to recognize the people around him. Not every encounter is easy.
        </p>
        <h2 className="text-center text-lg">Choose a language</h2>
        <ul className="mt-7 grid gap-4 sm:grid-cols-3">
          {JEFF_LANGUAGES.map((language) => (
            <li key={language}>
              <a href={`/learn/jeff/${language}`} className="block border border-[var(--line)] px-5 py-8 text-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
                <span className="block text-lg">{JEFF_LANGUAGE_LABELS[language]}</span>
                <span className="mt-3 block text-sm text-[var(--foreground-muted)]">3 levels · 14 episodes</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm leading-relaxed text-[var(--foreground-muted)]">Levels are editorial guides, not formal CEFR assessments. Stories remain fiction, not grammar worksheets.</p>
      </section>
    </ReadingTestFrame>
  );
}
