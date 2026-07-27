import type { Metadata } from "next";
import { GameLibrary } from "@/components/GameLibrary";

export const metadata: Metadata = {
  title: "Game Library | MIAV Games",
  description: "Browse MIAV interactive games.",
};

export default function GameLibraryPage() {
  return <GameLibrary />;
}
