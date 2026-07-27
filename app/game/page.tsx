import type { Metadata } from "next";
import { GameIndexPage } from "@/features/miav-games";

export const metadata: Metadata = {
  title: "Game | MIAV-922228",
  description: "MIAV-922228 — interactive experience (coming soon).",
};

export default function GameRoutePage() {
  return <GameIndexPage />;
}
