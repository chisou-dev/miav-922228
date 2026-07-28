import type { ReactNode } from "react";
import { LunaCompanion } from "@/components/LunaCompanion";
import type { LunaAnimationId } from "@/engine/luna/atlas";

type Props = {
  children: ReactNode;
  showLuna?: boolean;
  lunaAnimation?: LunaAnimationId;
};

/** Shared in-game chrome — canvas mounts inside children. */
export function GameLayout({
  children,
  showLuna = false,
  lunaAnimation = "sit",
}: Props) {
  return (
    <div className="game-layout">
      {children}
      {showLuna ? (
        <LunaCompanion variant="corner" animation={lunaAnimation} />
      ) : null}
    </div>
  );
}
