import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListeningSession } from "@/features/listening-test/ListeningSession";
import { getReadingStories, getReadingStory } from "@/features/reading-test/catalog";
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
      title: "Listening Test",
      description: "Listen to a story and check what you heard.",
      path: "/listening-test",
    });
  }

  return readingTestMetadata({
    title: `${story.title} | Listening Test`,
    description: "Listen to a story without the text, then answer five questions.",
    path: `/listening-test/${story.slug}`,
  });
}

export default async function ListeningStoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getReadingStory(slug);
  if (!story) notFound();

  return (
    <ListeningSession
      slug={story.slug}
      title={story.title}
      body={story.body}
      questions={story.listeningQuestions ?? story.questions}
      continueUrl={story.continueUrl}
    />
  );
}
