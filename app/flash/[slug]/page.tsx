import type { Metadata } from "next";
import {
  FlashPiecePage,
  allFlashParams,
} from "@/features/library/LibraryPages";
import { getFlashPiece } from "@/features/library/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return allFlashParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const piece = getFlashPiece(slug);
  if (!piece) return { title: "Flash Fiction | Takashi Yabe" };
  return {
    title: piece.seo.title,
    description: piece.seo.description,
  };
}

export default async function FlashRoutePage({ params }: Props) {
  const { slug } = await params;
  return <FlashPiecePage slug={slug} />;
}
