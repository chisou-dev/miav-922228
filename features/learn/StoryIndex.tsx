import Link from "next/link";
import { getReadingStories } from "@/features/reading-test/catalog";
import { countEnglishWords } from "@/features/reading-test/measure";
import { readingLevelLabel } from "@/features/reading-test/readability";
import { StartReadingLink } from "@/features/reading-test/StartReadingLink";
import type { ReadingLevel, ReadingStory } from "@/features/reading-test/types";
import { StartListeningLink } from "@/features/listening-test/StartListeningLink";

const levels: readonly ReadingLevel[] = [1, 2, 3, 4, 5];

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
      <section aria-label="Featured: Jeff" className="mx-auto max-w-2xl border border-[var(--line)] px-5 py-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Featured · Jeff · 14 episodes</p>
        <h2 className="mt-4 text-2xl">Learn with Jeff</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">Three languages, three difficulty levels. Reading and Listening.</p>
        <Link href="/learn/jeff" className="mt-6 inline-block underline underline-offset-4">Choose language and level →</Link>
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
                      {group.map((story) => (
                        <li key={story.slug} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
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
                      ))}
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
