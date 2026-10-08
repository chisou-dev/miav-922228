import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getReadingStories,
  getReadingStory,
} from "@/features/reading-test/catalog";
import { ReadingSession } from "@/features/reading-test/ReadingSession";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getReadingStories().map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getReadingStory(slug);
  if (!story) {
    return readingTestMetadata({
      title: "5-Minute Reading Test",
      description: "Read a short story and check your reading speed and comprehension.",
      path: "/reading-test",
    });
  }

  return readingTestMetadata({
    title: `${story.title} | 5-Minute Reading Test`,
    description:
      "Read a short story and check your reading speed and comprehension.",
    path: `/reading-test/${story.slug}`,
  });
}

export default async function ReadingStoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getReadingStory(slug);
  if (!story) notFound();

  return (
    <ReadingSession
      slug={story.slug}
      title={story.title}
      body={story.body}
      questions={story.questions.map((question) => ({
        id: question.id,
        question: question.question,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
      }))}
      continueUrl={story.continueUrl}
    />
  );
}
