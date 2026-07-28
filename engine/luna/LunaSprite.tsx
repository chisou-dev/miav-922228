"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { SpriteAnimation } from "@/engine/Animation";
import {
  getLunaFrameRect,
  LUNA_CELL_PX,
  LUNA_SHEET_HEIGHT,
  LUNA_SHEET_WIDTH,
  LUNA_SPRITESHEET_URL,
  resolveLunaAnimation,
  type LunaAnimationId,
} from "@/engine/luna/atlas";
import { preloadLunaSpritesheet } from "@/engine/luna/preload";
import { useGameLoop } from "@/hooks/useGameLoop";

export type LunaSpriteProps = {
  animation?: LunaAnimationId | "idle" | "blink" | "happy" | "side";
  /** Display scale (1 = 160px cell). */
  scale?: number;
  className?: string;
  style?: CSSProperties;
  playing?: boolean;
  "aria-label"?: string;
};

export function LunaSprite({
  animation = "sit",
  scale = 0.42,
  className,
  style,
  playing = true,
  "aria-label": ariaLabel = "Luna",
}: LunaSpriteProps) {
  const clip = useMemo(() => resolveLunaAnimation(animation), [animation]);
  const anim = useMemo(() => new SpriteAnimation(clip), [clip]);
  const animRef = useRef(anim);
  animRef.current = anim;

  const [frameId, setFrameId] = useState(clip.frames[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    animRef.current.reset();
    setFrameId(clip.frames[0]);
  }, [clip]);

  useEffect(() => {
    let cancelled = false;
    preloadLunaSpritesheet()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useGameLoop(
    (deltaMs) => {
      const next = animRef.current.advance(deltaMs);
      setFrameId((prev) => (prev === next ? prev : next));
    },
    playing && ready,
  );

  const rect = getLunaFrameRect(frameId);
  const displayW = LUNA_CELL_PX * scale;
  const displayH = LUNA_CELL_PX * scale;

  const spriteStyle: CSSProperties = {
    width: displayW,
    height: displayH,
    backgroundImage: ready ? `url(${LUNA_SPRITESHEET_URL})` : undefined,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`,
    backgroundSize: `${LUNA_SHEET_WIDTH * scale}px ${LUNA_SHEET_HEIGHT * scale}px`,
    ...style,
  };

  return (
    <span
      className={["luna-sprite", className].filter(Boolean).join(" ")}
      style={spriteStyle}
      role="img"
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
