"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDecoded,
  createFirework,
  createVictoryJingle,
  stopActiveGameLoop,
} from "@/features/audio";
import { textToBits } from "@/games/binary-mosaic/puzzle/binaryText";
import { formatTime } from "@/games/binary-mosaic/puzzle/scoring";
import { FireworksCanvas } from "@/games/binary-mosaic/ui/FireworksCanvas";
import type { ClearPhase, PatternResult } from "@/games/binary-mosaic/types";

type Props = {
  active: boolean;
  onDone: () => void;
  /** When false, Victory Jingle is skipped (muted). */
  soundEnabled?: boolean;
  result: PatternResult | null;
};

/**
 * Decoded + white flash → fireworks → Victory Jingle → Continue
 * Clear SE plays sequentially (no overlap); BGM is stopped before SE start.
 */
const PHASES: { phase: ClearPhase; ms: number }[] = [
  { phase: "reveal", ms: 550 },
  { phase: "fireworks", ms: 1600 },
  { phase: "victory", ms: 1600 },
  { phase: "done", ms: 0 },
];

const FIREWORKS_MS = 1600;

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function ClearSequence({
  active,
  onDone,
  soundEnabled = false,
  result,
}: Props) {
  const [phase, setPhase] = useState<ClearPhase>("idle");
  const word = result?.decodedText ?? "";
  const trueBits = useMemo(
    () => (word ? textToBits(word) : []),
    [word],
  );
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    let cancelled = false;

    const run = async () => {
      stopActiveGameLoop();

      for (const step of PHASES) {
        if (cancelled) return;
        if (step.phase === "done") {
          setPhase("done");
          return;
        }

        setPhase(step.phase);

        if (step.phase === "reveal") {
          await Promise.all([
            waitMs(step.ms),
            soundRef.current ? createDecoded() : Promise.resolve(),
          ]);
        } else if (step.phase === "fireworks") {
          await Promise.all([
            waitMs(step.ms),
            soundRef.current ? createFirework() : Promise.resolve(),
          ]);
        } else if (step.phase === "victory") {
          if (soundRef.current) {
            await createVictoryJingle();
          } else {
            await waitMs(step.ms);
          }
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active || phase === "idle") return null;

  const showDecoded =
    phase === "reveal" ||
    phase === "fireworks" ||
    phase === "victory" ||
    phase === "done";

  return (
    <div className={`mosaic-clear mosaic-clear--${phase}`} role="status">
      {phase === "reveal" ? (
        <div className="mosaic-clear-flash" aria-hidden="true" />
      ) : null}

      {phase === "fireworks" ? (
        <FireworksCanvas
          active
          durationMs={FIREWORKS_MS}
          sourceBits={trueBits}
        />
      ) : null}

      {showDecoded && word ? (
        <div className="mosaic-hello mosaic-hello--decoded">{word}</div>
      ) : null}

      {phase === "done" && result && (
        <div className="mosaic-result">
          <dl>
            <div>
              <dt>Decoded</dt>
              <dd>{result.decodedText}</dd>
            </div>
            <div>
              <dt>Completion Time</dt>
              <dd>{formatTime(result.completionTimeSec)}</dd>
            </div>
            <div>
              <dt>Moves</dt>
              <dd>{result.moves}</dd>
            </div>
            <div>
              <dt>Hint</dt>
              <dd>{result.hintUsed ? "ON" : "OFF"}</dd>
            </div>
            <div className="mosaic-result-score">
              <dt>Pattern Score</dt>
              <dd>{result.patternScore}</dd>
            </div>
          </dl>
          <button type="button" className="mosaic-btn" onClick={onDone}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
