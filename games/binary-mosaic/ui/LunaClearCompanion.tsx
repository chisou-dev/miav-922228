"use client";

import { useMemo } from "react";
import { LunaSprite } from "@/engine/luna";
import type { LunaAnimationId } from "@/engine/luna/atlas";
import type { ClearPhase } from "@/games/binary-mosaic/types";

type Props = {
  phase: ClearPhase;
};

function phaseToAnimation(phase: ClearPhase): LunaAnimationId | null {
  switch (phase) {
    case "reveal":
      return "sit";
    case "fireworks":
      return "tail_wag";
    case "victory":
      return "bark";
    case "done":
      return "sit";
    default:
      return null;
  }
}

/** Luna mascot — clear celebration only (Phase 3 v1). */
export function LunaClearCompanion({ phase }: Props) {
  const animation = useMemo(() => phaseToAnimation(phase), [phase]);
  if (!animation) return null;

  const barkFx = phase === "victory";

  return (
    <div
      className={`mosaic-clear-luna mosaic-clear-luna--${phase}`}
      aria-hidden="true"
    >
      {barkFx ? <span className="mosaic-clear-luna-bark">ワン!</span> : null}
      <LunaSprite animation={animation} scale={0.42} />
    </div>
  );
}
