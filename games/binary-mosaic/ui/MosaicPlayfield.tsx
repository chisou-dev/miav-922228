"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  binaryMosaicConfig,
  getAllLevels,
  getLevel,
  getNextLevelId,
} from "@/games/binary-mosaic/config";
import { bitsToText } from "@/games/binary-mosaic/puzzle/binaryText";
import {
  absoluteCells,
  buildActiveMask,
  canPlaceOnBoard,
  extractPiecesFromLevel,
  rotateShape,
  snapOrigin,
} from "@/games/binary-mosaic/puzzle/geometry";
import {
  buildPatternResult,
  formatTime,
} from "@/games/binary-mosaic/puzzle/scoring";
import {
  allPiecesPlaced,
  buildPieceExpectations,
  findWrongPlacedPieces,
} from "@/games/binary-mosaic/puzzle/validation";
import type {
  ClearPhase,
  PatternResult,
  PieceRuntime,
} from "@/games/binary-mosaic/types";

type RejectMarker = {
  row: number;
  col: number;
  bit: 0 | 1;
  pieceIndex: number;
};
import { ClearSequence } from "@/games/binary-mosaic/ui/ClearSequence";
import { PieceView } from "@/games/binary-mosaic/ui/PieceView";

type DragState = {
  pieceId: string;
  grabOffsetX: number;
  grabOffsetY: number;
  x: number;
  y: number;
};

function createPieces(levelId: number): PieceRuntime[] {
  const level = getLevel(levelId);
  if (!level) return [];
  const { pieces } = extractPiecesFromLevel(level);
  return pieces.map((piece) => ({
    id: `p-${piece.pieceIndex}`,
    pieceIndex: piece.pieceIndex,
    baseShape: piece.baseShape,
    rotation: 0 as const,
    placed: null,
  }));
}

function readBoardBits(
  level: NonNullable<ReturnType<typeof getLevel>>,
  pieces: PieceRuntime[],
): (0 | 1)[] | null {
  const mask = buildActiveMask(level.solution);
  const grid: ((0 | 1) | null)[][] = Array.from({ length: level.rows }, () =>
    Array.from({ length: level.cols }, () => null),
  );

  for (const piece of pieces) {
    if (!piece.placed) return null;
    const shape = rotateShape(piece.baseShape, piece.rotation);
    for (const cell of absoluteCells(shape, piece.placed)) {
      grid[cell.row][cell.col] = cell.bit;
    }
  }

  const flat: (0 | 1)[] = [];
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const key = `${r},${c}`;
      if (mask && !mask.has(key)) continue;
      const bit = grid[r][c];
      if (bit == null) return null;
      flat.push(bit);
    }
  }
  return flat;
}

function MosaicPlayfield({
  levelId,
  onClearContinue,
}: {
  levelId: number;
  onClearContinue: (nextLevelId: number | null) => void;
}) {
  const level = getLevel(levelId)!;
  const meta = useMemo(() => extractPiecesFromLevel(level), [level]);
  const expectations = useMemo(
    () => buildPieceExpectations(level),
    [level],
  );
  const activeMask = useMemo(
    () => buildActiveMask(level.solution),
    [level.solution],
  );
  const cellPx = binaryMosaicConfig.cellPx;
  const boardRef = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<PieceRuntime[]>([]);
  const dragRef = useRef<DragState | null>(null);

  const [pieces, setPieces] = useState<PieceRuntime[]>(() =>
    createPieces(levelId),
  );
  const [hintOn, setHintOn] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [result, setResult] = useState<PatternResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectMarkers, setRejectMarkers] = useState<RejectMarker[]>([]);
  const startRef = useRef(performance.now());
  const clearedRef = useRef(false);

  piecesRef.current = pieces;
  dragRef.current = drag;

  useEffect(() => {
    clearedRef.current = false;
    setPieces(createPieces(levelId));
    setHintOn(false);
    setHintUsed(false);
    setMoves(0);
    setElapsed(0);
    setRunning(true);
    setDrag(null);
    setClearing(false);
    setClearPhase("idle");
    setResult(null);
    setSelectedId(null);
    setRejectMarkers([]);
    startRef.current = performance.now();
  }, [levelId]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsed((performance.now() - startRef.current) / 1000);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const occupiedExcept = useCallback((exceptId: string | null) => {
    const set = new Set<string>();
    for (const piece of piecesRef.current) {
      if (!piece.placed || piece.id === exceptId) continue;
      const shape = rotateShape(piece.baseShape, piece.rotation);
      for (const cell of absoluteCells(shape, piece.placed)) {
        set.add(`${cell.row},${cell.col}`);
      }
    }
    return set;
  }, []);

  const decodedReady = useMemo(() => {
    const flat = readBoardBits(level, pieces);
    if (!flat) return null;
    const text = bitsToText(flat);
    if (text !== level.targetText) return null;
    return text;
  }, [level, pieces]);

  useEffect(() => {
    if (!decodedReady || clearedRef.current || !running) return;
    clearedRef.current = true;
    setRunning(false);
    const completionTimeSec = (performance.now() - startRef.current) / 1000;
    setResult(
      buildPatternResult({
        completionTimeSec,
        moves,
        hintUsed,
        pieceCount: pieces.length,
        decodedText: decodedReady,
      }),
    );
    setClearing(true);
    setClearPhase("fireworks");
  }, [decodedReady, running, moves, hintUsed, pieces.length]);

  const bumpMove = () => setMoves((m) => m + 1);

  const rejectWrongPieces = useCallback(
    (current: PieceRuntime[]) => {
      const wrong = findWrongPlacedPieces(current, expectations);
      if (wrong.length === 0) return current;

      const byIndex = new Map(
        expectations.map((e) => [e.pieceIndex, e]),
      );
      const markers: RejectMarker[] = wrong.map((piece) => {
        const exp = byIndex.get(piece.pieceIndex)!;
        return {
          row: exp.anchor.row,
          col: exp.anchor.col,
          bit: exp.anchor.bit,
          pieceIndex: piece.pieceIndex,
        };
      });

      setRejectMarkers((prev) => {
        const next = [...prev];
        for (const marker of markers) {
          if (
            !next.some(
              (m) =>
                m.pieceIndex === marker.pieceIndex &&
                m.row === marker.row &&
                m.col === marker.col,
            )
          ) {
            next.push(marker);
          }
        }
        return next;
      });

      const wrongIds = new Set(wrong.map((p) => p.id));
      return current.map((p) =>
        wrongIds.has(p.id) ? { ...p, placed: null } : p,
      );
    },
    [expectations],
  );

  const afterPlacement = useCallback(
    (nextPieces: PieceRuntime[]) => {
      if (!allPiecesPlaced(nextPieces)) return nextPieces;
      const flat = readBoardBits(level, nextPieces);
      if (flat && bitsToText(flat) === level.targetText) return nextPieces;
      return rejectWrongPieces(nextPieces);
    },
    [level, rejectWrongPieces],
  );

  const rotatePiece = (pieceId: string) => {
    setPieces((prev) =>
      prev.map((piece) => {
        if (piece.id !== pieceId) return piece;
        const nextRot = ((piece.rotation + 1) % 4) as 0 | 1 | 2 | 3;
        if (!piece.placed) return { ...piece, rotation: nextRot };
        const shape = rotateShape(piece.baseShape, nextRot);
        const ok = canPlaceOnBoard({
          rows: level.rows,
          cols: level.cols,
          shape,
          origin: piece.placed,
          occupied: occupiedExcept(pieceId),
          activeMask,
        });
        if (!ok) return { ...piece, rotation: nextRot, placed: null };
        return { ...piece, rotation: nextRot };
      }),
    );
    bumpMove();
  };

  const onPiecePointerDown = (
    event: ReactPointerEvent,
    piece: PieceRuntime,
  ) => {
    if (clearing) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedId(piece.id);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({
      pieceId: piece.id,
      grabOffsetX: event.clientX - rect.left,
      grabOffsetY: event.clientY - rect.top,
      x: rect.left,
      y: rect.top,
    });
    if (piece.placed) {
      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? { ...p, placed: null } : p)),
      );
    }
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      setDrag({
        ...current,
        x: event.clientX - current.grabOffsetX,
        y: event.clientY - current.grabOffsetY,
      });
    };

    const onUp = (event: PointerEvent) => {
      const current = dragRef.current;
      const board = boardRef.current;
      setDrag(null);
      if (!board || !current) return;
      const piece = piecesRef.current.find((p) => p.id === current.pieceId);
      if (!piece) return;

      const shape = rotateShape(piece.baseShape, piece.rotation);
      const boardRect = board.getBoundingClientRect();
      const localX = event.clientX - boardRect.left;
      const localY = event.clientY - boardRect.top;
      const inside =
        localX >= -cellPx &&
        localY >= -cellPx &&
        localX <= boardRect.width + cellPx &&
        localY <= boardRect.height + cellPx;

      if (!inside) {
        bumpMove();
        return;
      }

      const origin = snapOrigin(
        shape,
        level.rows,
        level.cols,
        (current.y - boardRect.top) / cellPx,
        (current.x - boardRect.left) / cellPx,
      );

      const ok = canPlaceOnBoard({
        rows: level.rows,
        cols: level.cols,
        shape,
        origin,
        occupied: occupiedExcept(current.pieceId),
        activeMask,
      });

      if (ok) {
        setRejectMarkers((prev) =>
          prev.filter((m) => m.pieceIndex !== piece.pieceIndex),
        );
        setPieces((prev) =>
          afterPlacement(
            prev.map((p) =>
              p.id === current.pieceId ? { ...p, placed: origin } : p,
            ),
          ),
        );
      }
      bumpMove();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    drag,
    cellPx,
    level,
    occupiedExcept,
    activeMask,
    afterPlacement,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r" && selectedId && !clearing) {
        rotatePiece(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const boardW = level.cols * cellPx;
  const boardH = level.rows * cellPx;
  const draggingPiece = drag
    ? pieces.find((p) => p.id === drag.pieceId)
    : null;

  return (
    <div className="mosaic-play">
      <header className="mosaic-hud">
        <div className="mosaic-hud-item">
          <span className="mosaic-hud-label">Target</span>
          <span>{level.targetText}</span>
        </div>
        <div className="mosaic-hud-item">
          <span className="mosaic-hud-label">Time</span>
          <span>{formatTime(elapsed)}</span>
        </div>
        <div className="mosaic-hud-item">
          <span className="mosaic-hud-label">Moves</span>
          <span>{moves}</span>
        </div>
        {level.hintAllowed ? (
          <button
            type="button"
            className={`mosaic-btn mosaic-btn--ghost ${hintOn ? "is-on" : ""}`}
            onClick={() => {
              setHintOn((v) => {
                const next = !v;
                if (next) setHintUsed(true);
                return next;
              });
            }}
            disabled={clearing}
          >
            Hint
          </button>
        ) : null}
        {selectedId ? (
          <button
            type="button"
            className="mosaic-btn mosaic-btn--ghost"
            onClick={() => rotatePiece(selectedId)}
            disabled={clearing}
          >
            Rotate
          </button>
        ) : null}
      </header>

      <div className="mosaic-stage">
        <div
          className="mosaic-board-wrap"
          style={{ width: boardW, minWidth: boardW }}
        >
          <div
            ref={boardRef}
            className="mosaic-board"
            style={{ width: boardW, height: boardH }}
            aria-label="Binary frame"
          >
          {Array.from({ length: level.rows * level.cols }).map((_, i) => {
            const row = Math.floor(i / level.cols);
            const col = i % level.cols;
            if (activeMask && !activeMask.has(`${row},${col}`)) return null;
            return (
              <span
                key={i}
                className="mosaic-board-cell"
                style={{
                  width: cellPx,
                  height: cellPx,
                  left: col * cellPx,
                  top: row * cellPx,
                }}
              />
            );
          })}

          {rejectMarkers.map((marker) => (
            <span
              key={`reject-${marker.pieceIndex}-${marker.row}-${marker.col}`}
              className="mosaic-reject-marker"
              style={{
                left: marker.col * cellPx,
                top: marker.row * cellPx,
                width: cellPx,
                height: cellPx,
              }}
            >
              {marker.bit}
            </span>
          ))}

          {hintOn &&
            meta.pieces.map((def) => {
              const runtime = pieces.find(
                (p) => p.pieceIndex === def.pieceIndex,
              );
              if (runtime?.placed) return null;
              return (
                <div
                  key={`hint-${def.pieceIndex}`}
                  className="mosaic-hint"
                  style={{
                    left: def.target.col * cellPx,
                    top: def.target.row * cellPx,
                  }}
                >
                  <PieceView
                    shape={def.baseShape}
                    rotation={def.targetRotation}
                    cellPx={cellPx}
                    ghost
                  />
                </div>
              );
            })}

          {pieces.map((piece) => {
            if (!piece.placed || drag?.pieceId === piece.id) return null;
            return (
              <div
                key={piece.id}
                className="mosaic-on-board"
                style={{
                  left: piece.placed.col * cellPx,
                  top: piece.placed.row * cellPx,
                }}
              >
                <PieceView
                  shape={piece.baseShape}
                  rotation={piece.rotation}
                  cellPx={cellPx}
                  glowing={clearPhase === "glow"}
                  dissolving={clearPhase === "dissolve"}
                  onPointerDown={(e) => onPiecePointerDown(e, piece)}
                />
              </div>
            );
          })}
          </div>
        </div>

        <div className="mosaic-tray" aria-label="Binary pieces">
          {pieces.map((piece) => {
            const isDragging = drag?.pieceId === piece.id;
            const isPlaced = piece.placed != null && !isDragging;
            return (
              <div
                key={piece.id}
                className={`mosaic-tray-slot${isPlaced ? " is-empty" : ""}`}
              >
                {!isPlaced ? (
                  <>
                    <PieceView
                      shape={piece.baseShape}
                      rotation={piece.rotation}
                      cellPx={cellPx}
                      className={selectedId === piece.id ? "is-selected" : ""}
                      onPointerDown={(e) => onPiecePointerDown(e, piece)}
                    />
                    <button
                      type="button"
                      className="mosaic-rotate-mini"
                      aria-label="Rotate piece"
                      disabled={clearing}
                      onClick={() => {
                        setSelectedId(piece.id);
                        rotatePiece(piece.id);
                      }}
                    >
                      ⟲
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {draggingPiece && drag ? (
        <div
          className="mosaic-drag-layer"
          style={{ left: drag.x, top: drag.y }}
        >
          <PieceView
            shape={draggingPiece.baseShape}
            rotation={draggingPiece.rotation}
            cellPx={cellPx}
          />
        </div>
      ) : null}

      <ClearSequence
        active={clearing}
        boardCells={level.rows * level.cols}
        result={result}
        onPhase={setClearPhase}
        onDone={() => {
          setClearing(false);
          setClearPhase("idle");
          onClearContinue(getNextLevelId(levelId));
        }}
      />
    </div>
  );
}

export function BinaryMosaicGame() {
  const levels = getAllLevels();
  const [levelId, setLevelId] = useState(levels[0]?.id ?? 1);
  const [screen, setScreen] = useState<"select" | "play">("select");

  if (screen === "select") {
    return (
      <div className="mosaic-root">
        <p className="mosaic-lead">
          Assemble glass binary fragments into a clean bit field. Each finished
          board decodes to real ASCII text — not decoration.
        </p>
        <ul className="mosaic-level-list">
          {levels.map((level) => (
            <li key={level.id}>
              <button
                type="button"
                className="mosaic-level-btn"
                onClick={() => {
                  setLevelId(level.id);
                  setScreen("play");
                }}
              >
                <span>{level.title}</span>
                <span className="mosaic-level-meta">
                  {level.targetText} ·{" "}
                  {extractPiecesFromLevel(level).pieces.length} pieces
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mosaic-lead" style={{ marginTop: "2rem" }}>
          From around Level {binaryMosaicConfig.silhouetteFromLevel}, frames can
          become silhouettes (dog and other shapes) that resolve into binary
          pictures.
        </p>
      </div>
    );
  }

  return (
    <div className="mosaic-root">
      <div className="mosaic-play-top">
        <button
          type="button"
          className="mosaic-btn mosaic-btn--ghost"
          onClick={() => setScreen("select")}
        >
          Levels
        </button>
        <h2 className="mosaic-level-title">{getLevel(levelId)?.title}</h2>
        <span className="mosaic-play-spacer" />
      </div>
      <MosaicPlayfield
        key={levelId}
        levelId={levelId}
        onClearContinue={(nextId) => {
          if (nextId != null) {
            setLevelId(nextId);
            return;
          }
          setScreen("select");
        }}
      />
    </div>
  );
}
