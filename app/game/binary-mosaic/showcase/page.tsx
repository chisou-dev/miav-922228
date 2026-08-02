import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { ShowcasePanel } from "@/games/binary-mosaic/ui/ShowcasePanel";
import "@/games/binary-mosaic/styles/mosaic.css";

export const metadata: Metadata = {
  title: "Binary Mosaic Showcase | MIAV Games",
  description:
    "Present one UserLevel as a standalone work — metadata, Share Code, and Start Challenge.",
};

export default function BinaryMosaicShowcasePage() {
  return (
    <GameShell title="Binary Mosaic Showcase" compact>
      <ShowcasePanel />
    </GameShell>
  );
}
