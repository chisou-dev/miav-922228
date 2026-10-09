"use client";

import { useState } from "react";
import {
  getReentryUserVolume,
  setReentryUserVolume,
} from "./reentryAudio";

export function ReentryAudioControl() {
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(getReentryUserVolume);

  return (
    <div className="pointer-events-auto absolute right-5 top-5 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-sm border border-white/15 bg-black/35 px-3 py-2 text-[0.68rem] font-medium tracking-[0.16em] text-white/85 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        aria-label={volume <= 0.001 ? "Unmute reentry audio" : "Reentry volume"}
        aria-expanded={open}
      >
        {volume <= 0.001 ? "MUTE" : "AUDIO"}
      </button>
      {open && (
        <div className="flex items-center gap-2 rounded-sm border border-white/12 bg-black/70 px-3 py-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            aria-label="Master volume"
            className="h-1 w-28 accent-white"
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              setReentryUserVolume(next);
            }}
          />
          <button
            type="button"
            className="text-[0.62rem] tracking-[0.12em] text-white/75 underline"
            onClick={() => {
              const next = volume <= 0.001 ? 0.82 : 0;
              setVolume(next);
              setReentryUserVolume(next);
            }}
          >
            {volume <= 0.001 ? "ON" : "OFF"}
          </button>
        </div>
      )}
    </div>
  );
}
