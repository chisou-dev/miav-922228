import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadingStories } from "@/features/reading-test/catalog";
import { countEnglishWords } from "@/features/reading-test/measure";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { readingLevelLabel } from "@/features/reading-test/readability";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { StartReadingLink } from "@/features/reading-test/StartReadingLink";
import type { ReadingLevel, ReadingStory } from "@/features/reading-test/types";

const description =
  "Read a short story, measure your reading speed, and answer five questions to check your understanding.";

export const metadata: Metadata = readingTestMetadata({
  title: "Read a Story. Test Your Reading. | MIAV-922228",
  description,
  path: "/reading-test",
});

const levels: readonly ReadingLevel[] = [1, 2, 3, 4, 5];

const steps = [
  "Choose a story",
  "Read at your own pace",
  "Answer five questions",
  "See your results and discover the author",
] as const;

function minutesLabel(minutes: number) {
  const unit = minutes === 1 ? "minute" : "minutes";
  return `About ${minutes} ${unit} at 200 WPM`;
}

function storiesAtLevel(stories: readonly ReadingStory[], level: ReadingLevel) {
  return stories.filter((story) => story.level === level);
}

export default function ReadingTestPage() {
  const stories = getReadingStories();
  if (stories.length === 0) notFound();

  return (
    <ReadingTestFrame
      eyebrow="Reading Test"
      title="Read a Story. Test Your Reading."
      summary={description}
    >
      <ol className="mx-auto mt-12 max-w-md space-y-3 text-left text-[0.95rem] leading-relaxed text-[var(--foreground)] sm:mt-14">
        {steps.map((step, index) => (
          <li key={step}>
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      <div className="mt-14 space-y-14 text-center sm:mt-16">
        {levels.map((level) => {
          const group = storiesAtLevel(stories, level);
          const automatic = group.every((story) => story.levelSource === "automatic");

          return (
            <section key={level} aria-labelledby={`reading-level-${level}`}>
              <h2
                id={`reading-level-${level}`}
                className="text-[0.95rem] tracking-[0.04em] text-[var(--foreground)]"
              >
                Level {level} — {readingLevelLabel(level)}
              </h2>
              {group.length === 0 ? (
                <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
                  No stories yet.
                </p>
              ) : (
                <>
                  {automatic ? (
                    <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--foreground-muted)]">
                      Estimated automatically from the text.
                    </p>
                  ) : null}
                  <ul className="mt-8 space-y-12">
                    {group.map((story) => (
                      <li key={story.slug}>
                        {story.seriesTitle ? (
                          <p className="text-[0.8rem] tracking-[0.08em] text-[var(--foreground-muted)]">
                            {story.seriesTitle}
                          </p>
                        ) : null}
                        <h3
                          className={`text-[clamp(1.35rem,4vw,1.75rem)] font-medium leading-snug tracking-[0.03em] text-[var(--foreground)] ${story.seriesTitle ? "mt-2" : ""}`}
                        >
                          {story.title}
                        </h3>
                        {story.contentType === "series-opening" ? (
                          <p className="mt-3 text-[0.8rem] tracking-[0.08em] text-[var(--foreground-muted)]">
                            Series opening
                          </p>
                        ) : null}
                        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
                          {countEnglishWords(story.body)} words
                        </p>
                        <p className="mt-1 text-[0.95rem] leading-relaxed text-[var(--foreground-muted)]">
                          {minutesLabel(story.estimatedMinutes)}
                        </p>
                        <p className="mt-8">
                          <StartReadingLink
                            href={`/reading-test/${story.slug}`}
                            slug={story.slug}
                            title={story.title}
                          />
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </div>
      <p className="mx-auto mt-14 max-w-md text-center text-[0.8rem] leading-relaxed text-[var(--foreground-muted)]">
        The minute count is a guide at 200 words per minute. Your reading time is measured during the test.
      </p>
    </ReadingTestFrame>
  );
}
