import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/GameShell";
import { getGameLoader } from "@/games/registry";
import { getAvailableGame, getPlayableGameSlugs } from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPlayableGameSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getAvailableGame(slug);
  if (!entry) return { title: "Game | MIAV Games" };
  return {
    title: `${entry.title} | MIAV Games`,
    description: `${entry.title} — MIAV interactive game.`,
  };
}

export default async function GameSlugPage({ params }: Props) {
  const { slug } = await params;
  const entry = getAvailableGame(slug);
  const loader = getGameLoader(slug);

  if (!entry || !loader) notFound();

  const LoadedGame = dynamic(() => loader().then((mod) => ({ default: mod.Game })), {
    loading: () => <p className="game-loading">Loading…</p>,
  });

  return (
    <GameShell title={entry.title} compact={slug === "binary-mosaic"}>
      <LoadedGame />
    </GameShell>
  );
}
