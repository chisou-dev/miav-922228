import { gamesLibraryUrl } from "@/features/core/gamesUrl";

/** Links to the external miav-games project — no game code on miav-site. */
export function GameLink() {
  return (
    <a href={gamesLibraryUrl()} className="home-game-link">
      Game
    </a>
  );
}
