"use client";

import { useEffect, useRef } from "react";
import { isBgmSuppressed } from "@/features/audio/bgmControl";
import { MiavSound } from "@/features/audio";

/** Procedural BGM for a game screen; cleans up on unmount. */
export function useBit8Audio(enabled = true, stage = 1) {
  const audioRef = useRef(MiavSound.getInstance());

  useEffect(() => {
    const audio = audioRef.current;
    if (!enabled || isBgmSuppressed()) {
      audio.stopBgm();
      return;
    }
    let cancelled = false;
    void audio.unlock().then(() => {
      if (cancelled || isBgmSuppressed()) return;
      void audio.startBgm(stage);
    });
    return () => {
      cancelled = true;
      audio.stopBgm();
    };
  }, [enabled, stage]);

  useEffect(() => {
    if (enabled && !isBgmSuppressed()) {
      audioRef.current.setBgmStage(stage);
    }
  }, [enabled, stage]);

  return audioRef.current;
}
