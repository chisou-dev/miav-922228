import type { Metadata } from "next";
import {
  FlashPiecePage,
  allFlashParams,
} from "@/features/library/LibraryPages";
import { flashHref, getFlashPiece } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

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
  return libraryPageMetadata({
    title: piece.seo.title,
    description: piece.seo.description,
    path: flashHref(piece.slug),
    ogType: "article",
  });
}

export default async function FlashRoutePage({ params }: Props) {
  const { slug } = await params;
  return <FlashPiecePage slug={slug} />;
}
