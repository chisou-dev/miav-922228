"use client";

import { useId, useMemo } from "react";
import {
  type DashGlyph,
  type DotGlyph,
  type MorseMark,
  type MorseMessage,
  hashSeed,
  pickDashGlyph,
  pickDotGlyph,
  textToMorse,
} from "./morse";

export type CosmicMorseDividerProps = {
  /** Primary Morse line (e.g. WRITER MEMO). */
  message: string;
  /** Secondary Morse line below (e.g. HANDY). */
  secondaryMessage?: string;
  className?: string;
};

/**
 * Locale-aware cosmic Morse divider — decorative signal between home blocks.
 * Real ITU Morse → star / planet / comet glyphs. Deterministic per message.
 */
export function CosmicMorseDivider({
  message,
  secondaryMessage,
  className,
}: CosmicMorseDividerProps) {
  const uid = useId().replace(/:/g, "");
  const primary = useMemo(() => textToMorse(message), [message]);
  const secondary = useMemo(
    () => (secondaryMessage ? textToMorse(secondaryMessage) : null),
    [secondaryMessage],
  );

  const label = [primary.normalized, secondary?.normalized]
    .filter(Boolean)
    .join(" · ");

  const cls = ["cosmic-morse-divider", className].filter(Boolean).join(" ");

  return (
    <div className={cls} role="presentation">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="cosmic-morse-divider__stack">
        <MorseRow message={primary} gradId={`${uid}-a`} />
        {secondary && secondary.words.length > 0 ? (
          <MorseRow message={secondary} gradId={`${uid}-b`} compact />
        ) : null}
      </div>
    </div>
  );
}

function MorseRow({
  message,
  gradId,
  compact = false,
}: {
  message: MorseMessage;
  gradId: string;
  compact?: boolean;
}) {
  if (message.words.length === 0) return null;

  const seed = hashSeed(message.normalized);
  let markIndex = 0;

  return (
    <div
      className={
        compact
          ? "cosmic-morse-divider__row cosmic-morse-divider__row--compact"
          : "cosmic-morse-divider__row"
      }
    >
      <svg
        className="cosmic-morse-divider__rail cosmic-morse-divider__rail--start"
        viewBox="0 0 48 12"
        width="48"
        height="12"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${gradId}-l`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <line
          x1="2"
          y1="6"
          x2="46"
          y2="6"
          stroke={`url(#${gradId}-l)`}
          strokeWidth="0.75"
        />
        <circle cx="46" cy="6" r="0.7" fill="currentColor" opacity="0.5" />
      </svg>

      <div className="cosmic-morse-divider__signals">
        {message.words.map((word, wi) => (
          <span key={`w-${wi}`} className="cosmic-morse-divider__word">
            {word.letters.map((letter, li) => {
              const glyphs = letter.marks.map((mark) => {
                const idx = markIndex++;
                return (
                  <Glyph
                    key={`${letter.char}-${li}-${idx}`}
                    mark={mark}
                    kind={
                      mark === "."
                        ? pickDotGlyph(seed, idx)
                        : pickDashGlyph(seed, idx)
                    }
                  />
                );
              });
              return (
                <span
                  key={`l-${wi}-${li}-${letter.char}`}
                  className="cosmic-morse-divider__letter"
                >
                  {glyphs}
                </span>
              );
            })}
          </span>
        ))}
      </div>

      <svg
        className="cosmic-morse-divider__rail cosmic-morse-divider__rail--end"
        viewBox="0 0 48 12"
        width="48"
        height="12"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${gradId}-r`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="2" cy="6" r="0.7" fill="currentColor" opacity="0.5" />
        <line
          x1="2"
          y1="6"
          x2="46"
          y2="6"
          stroke={`url(#${gradId}-r)`}
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
}

function Glyph({
  mark,
  kind,
}: {
  mark: MorseMark;
  kind: DotGlyph | DashGlyph;
}) {
  if (mark === ".") {
    return (
      <svg
        className={`cosmic-morse-divider__glyph cosmic-morse-divider__glyph--dot cosmic-morse-divider__glyph--${kind}`}
        viewBox="0 0 12 12"
        width="12"
        height="12"
        focusable="false"
      >
        <DotShape kind={kind as DotGlyph} />
      </svg>
    );
  }
  return (
    <svg
      className={`cosmic-morse-divider__glyph cosmic-morse-divider__glyph--dash cosmic-morse-divider__glyph--${kind}`}
      viewBox="0 0 22 12"
      width="22"
      height="12"
      focusable="false"
    >
      <DashShape kind={kind as DashGlyph} />
    </svg>
  );
}

function DotShape({ kind }: { kind: DotGlyph }) {
  switch (kind) {
    case "star":
      return (
        <g className="cmd-glow">
          <path
            d="M6 1.2 L6.7 4.6 L10.2 4.6 L7.4 6.7 L8.4 10.2 L6 8.2 L3.6 10.2 L4.6 6.7 L1.8 4.6 L5.3 4.6 Z"
            fill="currentColor"
            opacity="0.88"
          />
        </g>
      );
    case "orb":
      return (
        <g className="cmd-glow">
          <circle cx="6" cy="6" r="1.35" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "planet":
      return (
        <g className="cmd-glow">
          <circle
            cx="6"
            cy="6"
            r="2.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.85"
          />
          <circle cx="6" cy="6" r="0.55" fill="currentColor" opacity="0.55" />
        </g>
      );
    case "moon":
      return (
        <g className="cmd-glow">
          <path
            d="M7.2 2.4 A3.2 3.2 0 1 0 7.2 9.6 A2.35 2.35 0 1 1 7.2 2.4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.65"
            opacity="0.82"
          />
        </g>
      );
  }
}

function DashShape({ kind }: { kind: DashGlyph }) {
  switch (kind) {
    case "saturn":
      return (
        <g className="cmd-glow" transform="translate(11 6)">
          <circle
            r="2.15"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.65"
            opacity="0.88"
          />
          <ellipse
            rx="5.2"
            ry="1.35"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.55"
            transform="rotate(-18)"
          />
        </g>
      );
    case "comet":
      return (
        <g className="cmd-glow">
          <circle cx="4.2" cy="6" r="1.15" fill="currentColor" opacity="0.9" />
          <line
            x1="5.5"
            y1="6"
            x2="19.5"
            y2="6"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.55"
          />
          <line
            x1="7"
            y1="6.7"
            x2="17"
            y2="6.7"
            stroke="currentColor"
            strokeWidth="0.35"
            opacity="0.28"
          />
        </g>
      );
    case "orbit":
      return (
        <g className="cmd-glow" transform="translate(11 6)">
          <ellipse
            rx="7.5"
            ry="2.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.55"
            opacity="0.45"
          />
          <circle
            cx="5.2"
            cy="-0.4"
            r="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.65"
            opacity="0.85"
          />
        </g>
      );
    case "meteor":
      return (
        <g className="cmd-glow">
          <line
            x1="2"
            y1="6"
            x2="17.5"
            y2="6"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.62"
          />
          <circle cx="18.2" cy="6" r="1.05" fill="currentColor" opacity="0.88" />
        </g>
      );
  }
}
