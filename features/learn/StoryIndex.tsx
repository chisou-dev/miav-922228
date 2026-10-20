import Link from "next/link";
import Image from "next/image";
import { EDITORIAL_ART } from "@/features/library/editorialArt";
import { getReadingStories } from "@/features/reading-test/catalog";
import { countEnglishWords } from "@/features/reading-test/measure";
import { readingLevelLabel } from "@/features/reading-test/readability";
import { StartReadingLink } from "@/features/reading-test/StartReadingLink";
import type { ReadingLevel, ReadingStory } from "@/features/reading-test/types";
import { StartListeningLink } from "@/features/listening-test/StartListeningLink";

const levels: readonly ReadingLevel[] = [1, 2, 3, 4, 5];

function readingArt(story: ReadingStory) {
  if (story.slug === "after-the-rain") return EDITORIAL_ART.afterRain;
  if (story.slug === "the-day-i-couldnt-find-anyone") return EDITORIAL_ART.dayCouldntFindAnyone;
  if (story.slug === "lost-property") return EDITORIAL_ART.lostProperty;
  if (story.slug === "entrance") return EDITORIAL_ART.entrance;
  if (story.slug === "the-monster-chapter-1") return EDITORIAL_ART.theMonster;
  if (story.slug === "layers") return EDITORIAL_ART.layers;
  if (story.slug === "tissue") return EDITORIAL_ART.tissue;
  if (story.slug === "desk") return EDITORIAL_ART.desk;
  if (story.contentType !== "series-opening") return null;
  switch (story.seriesTitle) {
    case "MIAV-922228": return EDITORIAL_ART.miav;
    case "JAPAN 8000Hz": return EDITORIAL_ART.japan8000hz;
    case "Fourth Period": return EDITORIAL_ART.fourthPeriod;
    case "Next Time I See You": return EDITORIAL_ART.nextTimeISeeYou;
    case "After ¥50 Million": return EDITORIAL_ART.after50Million;
    default: return null;
  }
}

function minutesLabel(minutes: number) {
  const unit = minutes === 1 ? "minute" : "minutes";
  return `About ${minutes} ${unit} at 200 WPM`;
}

function storiesAtLevel(stories: readonly ReadingStory[], level: ReadingLevel) {
  return stories.filter((story) => story.level === level);
}

export function StoryIndex({ mode }: { mode: "reading" | "listening" }) {
  const stories = getReadingStories();

  return (
    <div className="mt-14 space-y-14 text-center sm:mt-16">
      <section aria-label="Featured: Jeff" className="mx-auto max-w-2xl overflow-hidden border border-[var(--line)] text-left sm:flex">
        <Link href="/learn/jeff" className="relative block aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-[42%]"
          aria-label="Explore Jeff">
          <Image src={EDITORIAL_ART.jeff.src} alt={EDITORIAL_ART.jeff.alt}
            fill sizes="(max-width: 639px) 100vw, 270px" className="object-cover"/>
        </Link>
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Featured · Jeff · 14 episodes</p>
          <h2 className="mt-3 text-2xl">Jeff</h2>
          <p className="mt-3 text-sm leading-[1.8] text-[var(--foreground-muted)]">
            A new life in Japan begins with everyday misunderstandings and unexpected encounters.
          </p>
          <p className="mt-2 text-xs text-[var(--foreground-muted)]">English, Spanish and French · Three levels</p>
          <Link href="/learn/jeff" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">
            Choose language and level →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-3 text-left" aria-label="Choose a level">
        {levels.map((level) => {
          const group = storiesAtLevel(stories, level);
          const automatic = group.length > 0 && group.every((story) => story.levelSource === "automatic");
          return (
            <details
              key={level}
              name={`${mode}-levels`}
              className="group border border-[var(--line)]"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 text-left [&::-webkit-details-marker]:hidden sm:px-6">
                <span className="flex-1 text-[1.03rem] font-medium text-[var(--foreground)]">
                  Level {level} — {readingLevelLabel(level)}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {group.length} {group.length === 1 ? "story" : "stories"}
                </span>
                <span aria-hidden="true" className="text-lg text-[var(--foreground-muted)] transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-[var(--line)] px-5 pb-2 pt-4 sm:px-6">
                {group.length === 0 ? (
                  <p className="py-4 text-sm text-[var(--foreground-muted)]">No stories yet.</p>
                ) : (
                  <>
                    {automatic ? (
                      <p className="pb-3 text-xs text-[var(--foreground-muted)]">
                        Level estimated from the language of each story.
                      </p>
                    ) : null}
                    <ul className="divide-y divide-[var(--line)]">
                      {group.map((story) => {
                        const art = readingArt(story);
                        return (
                        <li key={story.slug} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                          {art ? (
                            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden border border-[var(--line)] sm:w-32">
                              <Image src={art.src} alt={art.alt} fill
                                sizes="(max-width: 639px) 100vw, 128px" className="object-cover"/>
                            </div>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            {story.seriesTitle ? (
                              <p className="text-xs tracking-[0.05em] text-[var(--foreground-muted)]">{story.seriesTitle}</p>
                            ) : null}
                            <h3 className="mt-1 text-[1.15rem] font-medium leading-snug text-[var(--foreground)]">{story.title}</h3>
                            {story.contentType === "series-opening" ? (
                              <p className="mt-1 text-xs text-[var(--foreground-muted)]">Series opening</p>
                            ) : null}
                            <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                              {countEnglishWords(story.body)} words · {minutesLabel(story.estimatedMinutes)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {mode === "reading" ? (
                              <StartReadingLink href={`/reading-test/${story.slug}`} slug={story.slug} title={story.title} />
                            ) : (
                              <StartListeningLink href={`/listening-test/${story.slug}`} slug={story.slug} title={story.title} />
                            )}
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
