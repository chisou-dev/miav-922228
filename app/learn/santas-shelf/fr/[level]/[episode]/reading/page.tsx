import type { Metadata } from "next";
import {
  santaTranslatedParams, santaTranslatedMetadata, SantaTranslatedReaderPage
} from "@/features/santas-shelf/TranslatedReaderPage";

type Props = { params: Promise<{ level: string; episode: string }> };

export function generateStaticParams() {
  return santaTranslatedParams();
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level, episode } = await params;
  return santaTranslatedMetadata("fr", level, episode);
}
export default async function Page({ params }: Props) {
  const { level, episode } = await params;
  return <SantaTranslatedReaderPage language="fr" level={level} episode={episode} />;
}
