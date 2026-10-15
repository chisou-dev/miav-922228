import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryIndex } from "@/features/learn/StoryIndex";
import { getReadingStories } from "@/features/reading-test/catalog";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";

const description =
  "Read a short story, measure your reading speed, and answer five questions to check your understanding.";

export const metadata: Metadata = readingTestMetadata({
  title: "Read a Story. Test Your Reading. | MIAV-922228",
  description,
  path: "/reading-test",
});

const steps = [
  "Choose a story",
  "Practice with no limit, or race a clock",
  "Answer five questions",
  "See your results and discover the author",
] as const;

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
      <StoryIndex mode="reading" />
      <p className="mx-auto mt-14 max-w-md text-center text-[0.8rem] leading-relaxed text-[var(--foreground-muted)]">
        The minute count is a guide at 200 words per minute. The clock starts when you press Start, and your reading time is measured from then.
      </p>
    </ReadingTestFrame>
  );
}
