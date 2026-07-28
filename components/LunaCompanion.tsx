"use client";

import { useEffect } from "react";
import { LunaSprite, type LunaSpriteProps } from "@/engine/luna/LunaSprite";
import { preloadLunaSpritesheet } from "@/engine/luna/preload";

export type LunaCompanionProps = Omit<LunaSpriteProps, "scale"> & {
  variant?: "corner" | "inline" | "library";
};

/** Site-wide Luna placement — uses the shared spritesheet only. */
export function LunaCompanion({
  variant = "corner",
  animation = "sit",
  playing = true,
  className,
  ...rest
}: LunaCompanionProps) {
  useEffect(() => {
    preloadLunaSpritesheet().catch(() => undefined);
  }, []);

  const scale =
    variant === "library" ? 0.5 : variant === "inline" ? 0.36 : 0.44;

  return (
    <div
      className={[
        "luna-companion",
        `luna-companion--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={false}
    >
      <LunaSprite
        animation={animation}
        scale={scale}
        playing={playing}
        aria-label="Luna"
        {...rest}
      />
    </div>
  );
}

export { LunaSprite } from "@/engine/luna/LunaSprite";
export {
  LUNA_ANIMATIONS,
  LUNA_SPRITESHEET_URL,
  resolveLunaAnimation,
  type LunaAnimationId,
} from "@/engine/luna/atlas";
export { preloadLunaSpritesheet } from "@/engine/luna/preload";
