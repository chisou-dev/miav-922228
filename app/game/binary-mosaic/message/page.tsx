import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { BinaryMessagePanel } from "@/games/binary-mosaic/ui/BinaryMessagePanel";
import "@/games/binary-mosaic/styles/mosaic.css";

export const metadata: Metadata = {
  title: "Binary Message | MIAV Games",
  description:
    "Convert a short message to binary, copy it, or share it — decode binary back to text.",
};

export default function BinaryMessagePage() {
  return (
    <GameShell title="Binary Message" compact>
      <BinaryMessagePanel />
    </GameShell>
  );
}
