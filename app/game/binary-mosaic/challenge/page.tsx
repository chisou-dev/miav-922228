import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { ChallengePanel } from "@/games/binary-mosaic/ui/ChallengePanel";
import "@/games/binary-mosaic/styles/mosaic.css";

export const metadata: Metadata = {
  title: "Binary Block Challenge | MIAV Games",
  description:
    "Import a Share Code, browse Collection or Featured challenges — offline UserLevels, no re-eval.",
};

export default function BinaryMosaicChallengePage() {
  return (
    <GameShell title="Binary Block Challenge" compact>
      <ChallengePanel />
    </GameShell>
  );
}
