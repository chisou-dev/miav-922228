"use client";

import { useEffect, useRef } from "react";
import { AudioManager } from "@/features/audio";

/**
 * Keep AudioManager game-state in sync with playfield lifecycle.
 * Starts BGM immediately on enable (from the beginning); never stacks loops.
 */
export function useBit8Audio(enabled = true, stage = 1) {
  const audioRef = useRef(AudioManager.getInstance());

  useEffect(() => {
    const audio = audioRef.current;
    if (!enabled) {
      audio.setGameState("pause", { stage });
      return;
    }
    let cancelled = false;
    void audio.unlock().then(() => {
      if (cancelled) return;
      audio.setGameState("playing", { stage });
      audio.restartBgm();
    });
    return () => {
      cancelled = true;
      audio.setGameState("pause", { stage });
    };
  }, [enabled, stage]);

  return audioRef.current;
}
