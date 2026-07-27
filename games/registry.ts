import type { ComponentType } from "react";

export type GameModule = {
  Game: ComponentType;
};

export type GameLoader = () => Promise<GameModule>;

/**
 * Lazy loaders — one entry per playable game.
 * Add a new line here when a game ships; do not import game code elsewhere.
 */
const loaders: Record<string, GameLoader> = {
  "binary-run": () => import("@/games/binary-run/Game"),
};

export function getGameLoader(slug: string): GameLoader | undefined {
  return loaders[slug];
}

export function getRegisteredGameSlugs(): string[] {
  return Object.keys(loaders);
}
