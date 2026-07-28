"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatTime } from "@/games/binary-mosaic/puzzle/scoring";
import type { ClearPhase, PatternResult } from "@/games/binary-mosaic/types";

type Props = {
  active: boolean;
  onDone: () => void;
  onPhase?: (phase: ClearPhase) => void;
  result: PatternResult | null;
  boardCells: number;
};

type FireworkParticle = {
  id: number;
  bit: "0" | "1";
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  spin: number;
};

const PHASES: { phase: ClearPhase; ms: number }[] = [
  { phase: "fireworks", ms: 2000 },
  { phase: "glow", ms: 500 },
  { phase: "dissolve", ms: 550 },
  { phase: "stream", ms: 700 },
  { phase: "reveal", ms: 700 },
  { phase: "done", ms: 0 },
];

const FIREWORKS_MS = 2000;

export function ClearSequence({
  active,
  onDone,
  onPhase,
  result,
  boardCells,
}: Props) {
  const [phase, setPhase] = useState<ClearPhase>("idle");
  const stream = useMemo(() => buildStream(boardCells * 3), [boardCells]);
  const fireworks = useMemo(
    () => (active ? buildFireworks(72) : []),
    [active],
  );

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
  const showFireworks = phase === "fireworks";

  return (
    <div className={`mosaic-clear mosaic-clear--${phase}`} role="status">
      {showFireworks ? (
        <div className="mosaic-fireworks" aria-hidden="true">
          {fireworks.map((p) => (
            <span
              key={p.id}
              className="mosaic-firework"
              style={
                {
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  fontSize: `${p.size}px`,
                  animationDelay: `${p.delay}ms`,
                  "--fw-dx": `${p.dx}vw`,
                  "--fw-dy": `${p.dy}vh`,
                  "--fw-spin": `${p.spin}deg`,
                  "--fw-duration": `${FIREWORKS_MS}ms`,
                } as CSSProperties
              }
            >
              {p.bit}
            </span>
          ))}
        </div>
      ) : null}

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

function buildFireworks(count: number): FireworkParticle[] {
  const particles: FireworkParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 28 + Math.random() * 55;
    particles.push({
      id: i,
      bit: Math.random() > 0.5 ? "1" : "0",
      x: 42 + Math.random() * 16,
      y: 55 + Math.random() * 20,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 18 - Math.random() * 25,
      size: 14 + Math.random() * 22,
      delay: Math.floor(Math.random() * 280),
      spin: (Math.random() - 0.5) * 720,
    });
  }
  // Extra bursts from a few launch points for a fuller sky
  for (let burst = 0; burst < 3; burst += 1) {
    const ox = 20 + burst * 30;
    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18;
      const dist = 20 + Math.random() * 40;
      particles.push({
        id: count + burst * 18 + i,
        bit: Math.random() > 0.5 ? "1" : "0",
        x: ox + Math.random() * 8,
        y: 48 + Math.random() * 18,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 12,
        size: 12 + Math.random() * 18,
        delay: 80 + burst * 120 + Math.floor(Math.random() * 200),
        spin: (Math.random() - 0.5) * 540,
      });
    }
  }
  return particles;
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
