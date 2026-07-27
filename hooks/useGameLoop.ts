"use client";

import { useEffect, useRef } from "react";
import { GameLoop } from "@/engine/GameLoop";

/** React hook wrapper around engine GameLoop. */
export function useGameLoop(onTick: (deltaMs: number) => void, active = true) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!active) return;
    const loop = new GameLoop({
      onTick: (deltaMs) => onTickRef.current(deltaMs),
    });
    loop.start();
    return () => loop.stop();
  }, [active]);
}
