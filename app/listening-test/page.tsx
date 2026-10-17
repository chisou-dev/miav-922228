import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryIndex } from "@/features/learn/StoryIndex";
import { getReadingStories } from "@/features/reading-test/catalog";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";

const description = "Listen to a story without the text, then see what stays with you.";

export const metadata: Metadata = readingTestMetadata({
  title: "Listening | MIAV LEARN",
  description,
  path: "/listening-test",
});

const steps = [
  "Choose a level and a story",
  "Listen without the text",
  "Answer five questions",
] as const;

export default function ListeningTestPage() {
  if (getReadingStories().length === 0) notFound();

  return (
    <ReadingTestFrame eyebrow="MIAV LEARN" title="Listening" summary={description}>
      <ol className="mx-auto mt-12 max-w-md space-y-3 text-left text-[0.95rem] leading-relaxed text-[var(--foreground)] sm:mt-14">
        {steps.map((step, index) => (
          <li key={step}>
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      <StoryIndex mode="listening" />
      <p className="mx-auto mt-14 max-w-md text-center text-[0.8rem] leading-relaxed text-[var(--foreground-muted)]">
        The story text is not shown. Playback uses the English voice on this device.
      </p>
    </ReadingTestFrame>
  );
}
