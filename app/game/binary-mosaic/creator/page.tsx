import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { CreatorPanel } from "@/games/binary-mosaic/ui/CreatorPanel";
import "@/games/binary-mosaic/styles/mosaic.css";

export const metadata: Metadata = {
  title: "Binary Mosaic Creator | MIAV Games",
  description: "Create user levels from text — auto-generate, save on PASS, play locally.",
};

export default function BinaryMosaicCreatorPage() {
  return (
    <GameShell title="Binary Mosaic Creator" compact>
      <CreatorPanel />
    </GameShell>
  );
}
