"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTime } from "@/games/binary-mosaic/puzzle/scoring";
import type { ClearPhase, PatternResult } from "@/games/binary-mosaic/types";

type Props = {
  active: boolean;
  onDone: () => void;
  onPhase?: (phase: ClearPhase) => void;
  result: PatternResult | null;
  boardCells: number;
};

const PHASES: { phase: ClearPhase; ms: number }[] = [
  { phase: "glow", ms: 650 },
  { phase: "dissolve", ms: 700 },
  { phase: "stream", ms: 1100 },
  { phase: "reveal", ms: 900 },
  { phase: "done", ms: 0 },
];

export function ClearSequence({
  active,
  onDone,
  onPhase,
  result,
  boardCells,
}: Props) {
  const [phase, setPhase] = useState<ClearPhase>("idle");
  const stream = useMemo(() => buildStream(boardCells * 3), [boardCells]);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let i = 0;

    const run = () => {
      if (cancelled) return;
      const step = PHASES[i];
      if (!step) return;
      setPhase(step.phase);
      onPhase?.(step.phase);
      if (step.phase === "done") return;
      i += 1;
      timer = window.setTimeout(run, step.ms);
    };

    run();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [active, onPhase]);

  if (!active || phase === "idle") return null;

  const word = result?.decodedText ?? "";

  return (
    <div className={`mosaic-clear mosaic-clear--${phase}`} role="status">
      {(phase === "stream" || phase === "reveal" || phase === "done") && (
        <div className="mosaic-stream" aria-hidden="true">
          {stream.map((row, idx) => (
            <div key={idx} className="mosaic-stream-row">
              {row}
            </div>
          ))}
        </div>
      )}

      {(phase === "reveal" || phase === "done") && word ? (
        <div className="mosaic-hello">{word}</div>
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

function buildStream(count: number): string[] {
  const rows: string[] = [];
  let line = "";
  for (let i = 0; i < count; i += 1) {
    line += Math.random() > 0.5 ? "1" : "0";
    if (line.length >= 24) {
      rows.push(line);
      line = "";
    }
  }
  if (line) rows.push(line);
  return rows;
}
