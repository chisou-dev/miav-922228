"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLunaClip,
  LUNA_CELL_PX,
  LUNA_SHEET_HEIGHT,
  LUNA_SHEET_WIDTH,
  LUNA_SPRITESHEET_URL,
  type LunaAnimationId,
} from "@/engine/luna/atlas";
import {
  isLunaSpritesheetReady,
  preloadLunaSpritesheet,
} from "@/engine/luna/preload";

type Props = {
  animation: LunaAnimationId;
  scale?: number;
  className?: string;
};

/** Single-image Luna sprite — frame animation via background-position. */
export function LunaSprite({ animation, scale = 0.5, className }: Props) {
  const [ready, setReady] = useState(isLunaSpritesheetReady());
  const [frameIndex, setFrameIndex] = useState(0);
  const clip = useMemo(() => getLunaClip(animation), [animation]);

  useEffect(() => {
    let cancelled = false;
    preloadLunaSpritesheet()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setFrameIndex(0);
    const msPerFrame = 1000 / clip.fps;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (clip.loop) {
        setFrameIndex(i % clip.frames.length);
      } else {
        setFrameIndex(Math.min(i, clip.frames.length - 1));
      }
    }, msPerFrame);
    return () => window.clearInterval(id);
  }, [animation, clip.fps, clip.frames.length, clip.loop, ready]);

  if (!ready) return null;

  const sheetIndex = clip.frames[frameIndex] ?? clip.frames[0];
  const displayW = LUNA_CELL_PX * scale;
  const displayH = LUNA_CELL_PX * scale;

  return (
    <div
      className={className}
      role="img"
      aria-label="Luna"
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: `url(${LUNA_SPRITESHEET_URL})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${LUNA_SHEET_WIDTH * scale}px ${LUNA_SHEET_HEIGHT * scale}px`,
        backgroundPosition: `${-sheetIndex * LUNA_CELL_PX * scale}px 0`,
      }}
    />
  );
}
