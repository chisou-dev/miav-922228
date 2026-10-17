import type { Metadata } from "next";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { JEFF_LANGUAGES, JEFF_LANGUAGE_LABELS } from "@/features/jeff/catalog";

export const metadata: Metadata = {
  title: "Jeff — Learn with Stories | MIAV LEARN",
  description: "Follow Jeff in Japan. Practice reading and listening in English, Spanish, or French at three levels.",
};
export default function JeffHome() {
  return (
    <ReadingTestFrame eyebrow="MIAV LEARN · FEATURED" title="Jeff" summary="Fourteen connected stories about making a life in Japan. Choose your language and your level.">
      <section className="mx-auto mt-12 max-w-3xl">
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
