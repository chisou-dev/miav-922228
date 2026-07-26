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
  return {
    title: piece ? `${piece.title} | Flash Fiction` : "Flash Fiction | MIAV-922228",
  };
}

export default async function FlashRoutePage({ params }: Props) {
  const { slug } = await params;
  return <FlashPiecePage slug={slug} />;
}
