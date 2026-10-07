"use client";

import { REENTRY_ART } from "./reentryArtPresentation";

function TeaserCraft() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-9 w-9"
      aria-hidden
    >
      <defs>
        <linearGradient id="miav-teaser-hull" x1="10" y1="52" x2="54" y2="14">
          <stop offset="0" stopColor="#6d7479" />
          <stop offset="0.42" stopColor="#e8e8e3" />
          <stop offset="0.78" stopColor="#f7f5ee" />
          <stop offset="1" stopColor="#aab0b3" />
        </linearGradient>
      </defs>
      <g transform="rotate(135 32 32)">
        <path
          d="M56 32 43 25 31 23 18 14 8 19l5 13-5 13 10 5 13-9 12-2Z"
          fill="#11171c"
          opacity=".85"
          transform="translate(-1 2)"
        />
        <path
          d="M56 32 43 25 31 23 18 14 8 19l5 13-5 13 10 5 13-9 12-2Z"
          fill="url(#miav-teaser-hull)"
          stroke="rgba(255,255,255,.55)"
          strokeWidth="1"
        />
        <path
          d="m45 32-8-4-5 4 5 4Z"
          fill="#0a1117"
          stroke="#7f929e"
          strokeWidth=".7"
        />
      </g>
    </svg>
  );
}

export function ReentryMobileTeaser({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex ${REENTRY_ART.mobileTeaser.buttonClass} shrink-0 items-center justify-center rounded-full border border-[var(--line)]/55 bg-[#070b10]/80 shadow-sm transition-colors hover:border-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]`}
      aria-label="Open atmospheric reentry experience"
    >
      <span
        className="reentry-teaser-float absolute inset-0 flex items-center justify-center opacity-90 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        <TeaserCraft />
      </span>
    </button>
  );
}
