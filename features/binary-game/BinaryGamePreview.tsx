"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  PREVIEW_COLS,
  PREVIEW_ROWS,
  buildGameGrid,
  buildIdleGrid,
  gameNodePosition,
  gridCenter,
  initialMoverCount,
  pickMoverPositions,
  posKey,
  randomMoveDelayMs,
  randomNeighbor,
  swapCells,
  vortexOffset,
  type BitGrid,
  type GridPos,
} from "@/features/binary-game/gridUtils";

type Phase = "live" | "freeze" | "vortex" | "game";

const FREEZE_MS = 300;
const VORTEX_MS = 900;
const GAME_HOLD_MS = 5200;

/**
 * Quiet live binary field for the Home page — click to resolve into GAME.
 * Reusable scaffold for a future full game experience.
 */
export function BinaryGamePreview() {
  const [phase, setPhase] = useState<Phase>("live");
  const [grid, setGrid] = useState<BitGrid>(() => buildIdleGrid());
  const [nodePos, setNodePos] = useState<GridPos>(() => gridCenter());
  const [showGameButton, setShowGameButton] = useState(false);

  const phaseRef = useRef<Phase>("live");
  const nodeRef = useRef<GridPos>(gridCenter());
  const moversRef = useRef<GridPos[]>([]);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetLive = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const startNode = gridCenter();
    nodeRef.current = startNode;
    moversRef.current = pickMoverPositions(initialMoverCount(), startNode);
    setGrid(buildIdleGrid());
    setNodePos(startNode);
    setShowGameButton(false);
    phaseRef.current = "live";
    setPhase("live");
  }, []);

  useEffect(() => {
    resetLive();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetLive]);

  useEffect(() => {
    if (phase !== "live") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      if (cancelled || phaseRef.current !== "live") return;

      setGrid((current) => {
        const next = current.map((row) => [...row]);
        const node = nodeRef.current;
        const neighbor = randomNeighbor(node);

        if (neighbor) {
          swapCells(next, node, neighbor);
          nodeRef.current = neighbor;
        }

        moversRef.current = moversRef.current.map((pos) => {
          const moverNeighbor = randomNeighbor(pos, nodeRef.current);
          if (moverNeighbor) {
            swapCells(next, pos, moverNeighbor);
            return moverNeighbor;
          }
          return pos;
        });

        return next;
      });

      setNodePos({ ...nodeRef.current });
      timer = setTimeout(tick, randomMoveDelayMs());
    };

    timer = setTimeout(tick, randomMoveDelayMs());

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase]);

  const handleActivate = useCallback(() => {
    if (phaseRef.current !== "live") return;

    phaseRef.current = "freeze";
    setPhase("freeze");

    window.setTimeout(() => {
      phaseRef.current = "vortex";
      setPhase("vortex");
    }, FREEZE_MS);

    window.setTimeout(() => {
      const gameNode = gameNodePosition();
      nodeRef.current = gameNode;
      phaseRef.current = "game";
      setGrid(buildGameGrid());
      setNodePos(gameNode);
      setPhase("game");
      setShowGameButton(true);
    }, FREEZE_MS + VORTEX_MS);

    resetTimerRef.current = window.setTimeout(() => {
      resetLive();
    }, FREEZE_MS + VORTEX_MS + GAME_HOLD_MS);
  }, [resetLive]);

  const vortexActive = phase === "vortex";
  const showNode =
    phase === "live" ||
    phase === "freeze" ||
    phase === "vortex" ||
    phase === "game";

  return (
    <div className="binary-game-preview-wrap">
      <button
        type="button"
        className="binary-game-preview"
        onClick={handleActivate}
        aria-label="Binary data field"
        disabled={phase !== "live"}
      >
        <div
          className={`binary-game-preview-grid${vortexActive ? " binary-game-preview-grid--vortex" : ""}${phase === "game" ? " binary-game-preview-grid--game" : ""}`}
          style={
            {
              "--preview-cols": PREVIEW_COLS,
              "--preview-rows": PREVIEW_ROWS,
            } as CSSProperties
          }
        >
          {grid.map((row, rowIndex) =>
            row.map((bit, colIndex) => {
              const isNode =
                showNode &&
                nodePos.row === rowIndex &&
                nodePos.col === colIndex;
              const offset = vortexOffset(rowIndex, colIndex);

              return (
                <span
                  key={posKey({ row: rowIndex, col: colIndex })}
                  className="binary-game-preview-cell"
                  style={
                    {
                      "--vortex-x": offset.x,
                      "--vortex-y": offset.y,
                    } as CSSProperties
                  }
                >
                  {isNode ? (
                    <span
                      className={`binary-game-preview-node${phase === "game" ? " binary-game-preview-node--hold" : ""}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="binary-game-preview-bit">{bit}</span>
                  )}
                </span>
              );
            }),
          )}
        </div>
      </button>

      <a
        href="/game"
        className={`binary-game-preview-cta${showGameButton ? " binary-game-preview-cta--visible" : ""}`}
        aria-hidden={!showGameButton}
        tabIndex={showGameButton ? 0 : -1}
      >
        Game
      </a>
    </div>
  );
}
