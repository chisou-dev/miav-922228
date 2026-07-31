"use client";

import { useEffect, useRef } from "react";
import { AudioManager } from "@/features/audio";

/**
 * Keep AudioManager game-state in sync with playfield lifecycle.
 * Games should not drive BGM timers — only setGameState / playBgm via manager.
 */
export function useBit8Audio(enabled = true, stage = 1) {
  const audioRef = useRef(AudioManager.getInstance());

  useEffect(() => {
    const audio = audioRef.current;
    if (!enabled) {
      audio.setGameState("pause", { stage });
      return;
    }
    audio.setGameState("playing", { stage });
    return () => {
      audio.setGameState("pause", { stage });
    };
  }, [enabled, stage]);

  return audioRef.current;
}
