"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DataNode } from "@/features/works-entry/DataNode";
import { MemoryUnlock } from "@/features/works-entry/MemoryUnlock";
import {
  GRID_CENTER,
  GRID_COLS,
  GRID_ROWS,
  buildBitGrid,
  positionsEqual,
  randomMoveDelayMs,
  randomNeighbor,
  vortexOffset,
  type GridPosition,
} from "@/features/works-entry/gridData";

const LIT_WINDOW_MS = 520;
const VORTEX_MS = 950;

type Phase = "play" | "vortex" | "unlocked";

/**
 * Binary grid with a single moving Data Node.
 * Catch it while lit to unlock the Works entrance.
 */
export function DataNodeGrid() {
  const bits = useMemo(() => buildBitGrid(), []);
  const [nodePos, setNodePos] = useState<GridPosition>(GRID_CENTER);
  const [lit, setLit] = useState(false);
  const [phase, setPhase] = useState<Phase>("play");

  useEffect(() => {
    if (phase !== "play") return;

    let cancelled = false;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    let litTimer: ReturnType<typeof setTimeout> | undefined;

    const pulseLit = () => {
      setLit(true);
      litTimer = setTimeout(() => setLit(false), LIT_WINDOW_MS);
    };

    const scheduleMove = () => {
      moveTimer = setTimeout(() => {
        if (cancelled) return;
        setNodePos((current) => randomNeighbor(current));
        pulseLit();
        scheduleMove();
      }, randomMoveDelayMs());
    };

    pulseLit();
    scheduleMove();

    return () => {
      cancelled = true;
      if (moveTimer) clearTimeout(moveTimer);
      if (litTimer) clearTimeout(litTimer);
    };
  }, [phase]);

  const handleSuccess = useCallback(() => {
    if (phase !== "play" || !lit) return;
    setLit(false);
    setPhase("vortex");
    window.setTimeout(() => setPhase("unlocked"), VORTEX_MS);
  }, [lit, phase]);

  const vortexActive = phase === "vortex" || phase === "unlocked";

  return (
    <div className="data-node-stage">
      <div
        className={`data-node-grid${vortexActive ? " data-node-grid--vortex" : ""}`}
        style={
          {
            "--grid-cols": GRID_COLS,
            "--grid-rows": GRID_ROWS,
          } as CSSProperties
        }
        role="presentation"
      >
        {bits.map((row, rowIndex) =>
          row.map((bit, colIndex) => {
            const isNode = positionsEqual(nodePos, { row: rowIndex, col: colIndex });
            const offset = vortexOffset(rowIndex, colIndex);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="data-node-cell"
                style={
                  {
                    "--vortex-x": offset.x,
                    "--vortex-y": offset.y,
                  } as CSSProperties
                }
              >
                {isNode ? (
                  <DataNode lit={lit && phase === "play"} onActivate={handleSuccess} />
                ) : (
                  <span className="data-node-bit" aria-hidden="true">
                    {bit}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      <MemoryUnlock visible={phase === "unlocked"} />
    </div>
  );
}
