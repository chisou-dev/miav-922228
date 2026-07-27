/** External games project — miav-site never bundles game code. */
export function getGamesBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GAMES_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return "https://miav-games.vercel.app";
  }
  return "http://localhost:3001";
}

export function gamesLibraryUrl(): string {
  return `${getGamesBaseUrl()}/game`;
}
