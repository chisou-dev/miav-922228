import type { GameCatalogItem } from "@/types/game";

/** Single source for the Game Library UI. Add finished games here only. */
export const GAME_LIBRARY: GameCatalogItem[] = [
  {
    slug: "binary-mosaic",
    title: "Binary Mosaic",
    status: "available",
  },
  {
    slug: "binary-run",
    title: "Binary Run",
    status: "available",
  },
  {
    slug: null,
    title: "Coming Soon",
    status: "coming-soon",
  },
];

export function getAvailableGame(slug: string) {
  return GAME_LIBRARY.find(
    (item): item is Extract<GameCatalogItem, { status: "available" }> =>
      item.status === "available" && item.slug === slug,
  );
}

export function getPlayableGameSlugs(): string[] {
  return GAME_LIBRARY.filter((item) => item.status === "available").map(
    (item) => item.slug,
  );
}
