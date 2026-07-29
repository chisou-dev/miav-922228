"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Bit8Audio } from "@/features/audio";
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
  shapeBounds,
  snapOrigin,
} from "@/games/binary-mosaic/puzzle/geometry";
import { decodeBoardRows } from "@/games/binary-mosaic/puzzle/rowDecode";
import {
  buildPatternResult,
  formatTime,
} from "@/games/binary-mosaic/puzzle/scoring";
import {
  allPiecesPlaced,
  buildPieceExpectations,
  findWrongPlacedPieces,
  isPieceCorrectlyPlaced,
  nextHintCellAnywhere,
  nextHintCellForPiece,
} from "@/games/binary-mosaic/puzzle/validation";
import type {
  ClearPhase,
  PatternResult,
  PieceRuntime,
} from "@/games/binary-mosaic/types";
import { ClearSequence } from "@/games/binary-mosaic/ui/ClearSequence";
import { PieceView } from "@/games/binary-mosaic/ui/PieceView";
import { SoundToggleIcon } from "@/games/binary-mosaic/ui/SoundToggleIcon";
import { useBit8Audio } from "@/hooks/useBit8Audio";

type RejectMarker = {
  row: number;
  col: number;
  bit: 0 | 1;
  pieceIndex: number;
};

type DragState = {
  pieceId: string;
  grabOffsetX: number;
  grabOffsetY: number;
  x: number;
  y: number;
};

type DropPreview = {
  origin: { row: number; col: number };
  valid: boolean;
  rows: number;
  cols: number;
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
  soundOn,
  setSoundOn,
}: {
  levelId: number;
  onClearContinue: (nextLevelId: number | null) => void;
  soundOn: boolean;
  setSoundOn: (next: boolean) => void;
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
  const rotationAllowed = level.id >= binaryMosaicConfig.rotateFromLevel;
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
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [result, setResult] = useState<PatternResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectMarkers, setRejectMarkers] = useState<RejectMarker[]>([]);
  const startRef = useRef(performance.now());
  const clearedRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const audio = Bit8Audio.getInstance();

  useEffect(() => {
    audio.setMuted(!soundOn);
  }, [soundOn, audio]);

  useBit8Audio(running && !clearing && soundOn, levelId);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    audio.setMuted(!next);
    if (next) {
      void audio.unlock().then(() => {
        if (running && !clearing) void audio.startBgm(levelId);
      });
      void audio.play("button");
    } else {
      audio.stopBgm();
    }
    setSoundOn(next);
  }, [audio, running, clearing, soundOn, setSoundOn, levelId]);

  const handleClearPhase = useCallback((phase: ClearPhase) => {
    setClearPhase(phase);
  }, []);

  const handleClearDone = useCallback(() => {
    void audio.play("button");
    const nextId = getNextLevelId(levelId);
    setClearing(false);
    setClearPhase("idle");
    onClearContinue(nextId);
  }, [audio, levelId, onClearContinue]);

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
    setDropPreview(null);
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
    setClearPhase("reveal");
  }, [decodedReady, running, moves, hintUsed, pieces.length]);

  const bumpMove = () => setMoves((m) => m + 1);

  const rejectWrongPieces = useCallback(
    (current: PieceRuntime[]) => {
      const wrong = findWrongPlacedPieces(current, expectations);
      if (wrong.length === 0) return current;

      // One new permanent bit hint per rejected piece — markers never shrink.
      setRejectMarkers((prev) => {
        const revealed = new Set(prev.map((m) => `${m.row},${m.col}`));
        const next = [...prev];
        for (const piece of wrong) {
          const hint =
            nextHintCellForPiece(level, piece.pieceIndex, revealed) ??
            nextHintCellAnywhere(level, revealed);
          if (!hint) continue;
          const key = `${hint.row},${hint.col}`;
          revealed.add(key);
          next.push({
            row: hint.row,
            col: hint.col,
            bit: hint.bit,
            pieceIndex: hint.pieceIndex,
          });
        }
        return next;
      });

      const wrongIds = new Set(wrong.map((p) => p.id));
      return current.map((p) =>
        wrongIds.has(p.id) ? { ...p, placed: null } : p,
      );
    },
    [expectations, level],
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
    if (!rotationAllowed) return;
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
    void audio.unlock();
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
    if (!drag) {
      setDropPreview(null);
      return;
    }

    const updatePreview = (clientX: number, clientY: number) => {
      const board = boardRef.current;
      const current = dragRef.current;
      if (!board || !current) {
        setDropPreview(null);
        return;
      }
      const piece = piecesRef.current.find((p) => p.id === current.pieceId);
      if (!piece) {
        setDropPreview(null);
        return;
      }
      const shape = rotateShape(piece.baseShape, piece.rotation);
      const bounds = shapeBounds(shape);
      const boardRect = board.getBoundingClientRect();
      const localX = clientX - boardRect.left;
      const localY = clientY - boardRect.top;
      const inside =
        localX >= -cellPx &&
        localY >= -cellPx &&
        localX <= boardRect.width + cellPx &&
        localY <= boardRect.height + cellPx;

      if (!inside) {
        setDropPreview(null);
        return;
      }

      const origin = snapOrigin(
        shape,
        level.rows,
        level.cols,
        (current.y - boardRect.top) / cellPx,
        (current.x - boardRect.left) / cellPx,
      );
      const valid = canPlaceOnBoard({
        rows: level.rows,
        cols: level.cols,
        shape,
        origin,
        occupied: occupiedExcept(current.pieceId),
        activeMask,
      });
      setDropPreview({
        origin,
        valid,
        rows: bounds.rows,
        cols: bounds.cols,
      });
    };

    const onMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      pendingDragRef.current = {
        x: event.clientX - current.grabOffsetX,
        y: event.clientY - current.grabOffsetY,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (dragRafRef.current != null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingDragRef.current;
        const live = dragRef.current;
        if (!pending || !live) return;
        const next = { ...live, x: pending.x, y: pending.y };
        dragRef.current = next;
        setDrag(next);
        updatePreview(pending.clientX, pending.clientY);
      });
    };

    const onUp = (event: PointerEvent) => {
      const current = dragRef.current;
      const board = boardRef.current;
      setDrag(null);
      setDropPreview(null);
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

      // Exact snap only — never place on occupied cells (no nearby auto-shift).
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
        setPieces((prev) => {
          const placed = prev.map((p) =>
            p.id === current.pieceId ? { ...p, placed: origin } : p,
          );
          const beforeIds = new Set(
            placed.filter((p) => p.placed).map((p) => p.id),
          );
          const next = afterPlacement(placed);
          const rejected = next.some(
            (p) => beforeIds.has(p.id) && !p.placed,
          );
          void audio.play(rejected ? "reject" : "snap");
          return next;
        });
      }
      bumpMove();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, [
    drag,
    cellPx,
    level,
    occupiedExcept,
    activeMask,
    afterPlacement,
    audio,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        rotationAllowed &&
        event.key.toLowerCase() === "r" &&
        selectedId &&
        !clearing
      ) {
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

  const solvedCells = useMemo(() => {
    const covered = new Set<string>();
    const byIndex = new Map(expectations.map((e) => [e.pieceIndex, e]));
    for (const piece of pieces) {
      if (!piece.placed || drag?.pieceId === piece.id) continue;
      const exp = byIndex.get(piece.pieceIndex);
      if (!exp || !isPieceCorrectlyPlaced(piece, exp)) continue;
      const shape = rotateShape(piece.baseShape, piece.rotation);
      for (const cell of absoluteCells(shape, piece.placed)) {
        covered.add(`${cell.row},${cell.col}`);
      }
    }
    return covered;
  }, [pieces, expectations, drag]);

  const boardBits = useMemo(() => {
    const grid: ((0 | 1) | null)[][] = Array.from({ length: level.rows }, () =>
      Array.from({ length: level.cols }, () => null),
    );
    for (const piece of pieces) {
      if (!piece.placed || drag?.pieceId === piece.id) continue;
      const shape = rotateShape(piece.baseShape, piece.rotation);
      for (const cell of absoluteCells(shape, piece.placed)) {
        if (
          cell.row >= 0 &&
          cell.row < level.rows &&
          cell.col >= 0 &&
          cell.col < level.cols
        ) {
          grid[cell.row][cell.col] = cell.bit;
        }
      }
    }
    return grid;
  }, [pieces, level, drag]);

  const rowDecodes = useMemo(
    () =>
      decodeBoardRows({
        cols: level.cols,
        rows: level.rows,
        targetBits: level.bits,
        board: boardBits,
      }),
    [level, boardBits],
  );

  const showRowLetters = level.cols === 8;

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
        <button
          type="button"
          className={`mosaic-btn mosaic-btn--ghost mosaic-btn--icon ${soundOn ? "is-on" : ""}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Sound on" : "Sound off"}
          title={soundOn ? "Sound on" : "Sound off"}
        >
          <SoundToggleIcon muted={!soundOn} className="mosaic-sound-icon" />
        </button>
        {level.hintAllowed ? (
          <button
            type="button"
            className={`mosaic-btn mosaic-btn--ghost ${hintOn ? "is-on" : ""}`}
            onClick={() => {
              void audio.play("button");
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
        {rotationAllowed && selectedId ? (
          <button
            type="button"
            className="mosaic-btn mosaic-btn--ghost"
            onClick={() => {
              void audio.play("button");
              rotatePiece(selectedId);
            }}
            disabled={clearing}
          >
            Rotate
          </button>
        ) : null}
      </header>

      <div className="mosaic-stage">
        <div className="mosaic-board-cluster">
          {showRowLetters ? (
            <div
              className="mosaic-row-letters"
              style={{ height: boardH }}
              aria-label="Decoded row characters"
            >
              {rowDecodes.map((row, idx) => (
                <span
                  key={idx}
                  className={`mosaic-row-letter is-${row.status}`}
                  style={{ height: cellPx, lineHeight: `${cellPx}px` }}
                >
                  {row.glyph || (row.status === "partial" ? "·" : "")}
                </span>
              ))}
            </div>
          ) : null}

          <div
            className="mosaic-board-wrap"
            style={{ width: boardW, minWidth: boardW }}
          >
          <div
            ref={boardRef}
            className={`mosaic-board${drag ? " is-dragging" : ""}`}
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

          {rejectMarkers.map((marker) => {
            const key = `${marker.row},${marker.col}`;
            const met = solvedCells.has(key);
            return (
              <span
                key={`reject-${marker.pieceIndex}-${marker.row}-${marker.col}`}
                className={`mosaic-reject-marker${met ? " is-met" : ""}`}
                style={{
                  left: marker.col * cellPx,
                  top: marker.row * cellPx,
                  width: cellPx,
                  height: cellPx,
                }}
              >
                {marker.bit}
              </span>
            );
          })}

          {dropPreview ? (
            <div
              className={`mosaic-drop-preview${dropPreview.valid ? "" : " is-invalid"}`}
              style={{
                left: dropPreview.origin.col * cellPx,
                top: dropPreview.origin.row * cellPx,
                width: dropPreview.cols * cellPx,
                height: dropPreview.rows * cellPx,
              }}
            />
          ) : null}

          {hintOn &&
            !drag &&
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
        </div>

        <div className="mosaic-tray" aria-label="Binary pieces">
          {pieces.map((piece) => {
            const isDragging = drag?.pieceId === piece.id;
            const isPlaced = piece.placed != null && !isDragging;
            if (isPlaced) return null;
            const oriented = rotateShape(piece.baseShape, piece.rotation);
            const bounds = shapeBounds(oriented);
            const slotW = Math.max(bounds.cols * cellPx, cellPx * 2);
            const slotH = Math.max(bounds.rows * cellPx, cellPx * 2);
            return (
              <div
                key={piece.id}
                className="mosaic-tray-slot"
                style={{ width: slotW, height: slotH }}
              >
                {!isDragging ? (
                  <>
                    <PieceView
                      shape={piece.baseShape}
                      rotation={piece.rotation}
                      cellPx={cellPx}
                      className={selectedId === piece.id ? "is-selected" : ""}
                      onPointerDown={(e) => onPiecePointerDown(e, piece)}
                    />
                    {rotationAllowed ? (
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
                    ) : null}
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
          style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0)` }}
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
        result={result}
        soundEnabled={soundOn}
        onPhase={handleClearPhase}
        onDone={handleClearDone}
      />
    </div>
  );
}

export function BinaryMosaicGame() {
  const levels = getAllLevels();
  const [levelId, setLevelId] = useState(levels[0]?.id ?? 1);
  const [screen, setScreen] = useState<"select" | "play">("select");
  const [soundOn, setSoundOn] = useState(false);
  const audio = Bit8Audio.getInstance();

  // ページが非表示になったら BGM を止め、戻ったら再開
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        audio.stopBgm();
      } else if (soundOn && screen === "play") {
        void audio.startBgm(levelId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      // ゲーム画面を離れるときも必ず止める
      audio.stopBgm();
    };
  }, [audio, soundOn, screen, levelId]);

  if (screen === "select") {
    return (
      <div className="mosaic-root">
        <div className="mosaic-chrome">
          <a href="/game" className="mosaic-chrome-link" onClick={() => audio.stopBgm()}>
            Game Library
          </a>
          <span className="mosaic-chrome-title">Binary Mosaic</span>
        </div>
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
                  void Bit8Audio.getInstance().play("button");
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
          Rotation unlocks from Level {binaryMosaicConfig.rotateFromLevel}.
          From around Level {binaryMosaicConfig.silhouetteFromLevel}, frames can
          become silhouettes (dog and other shapes).
        </p>
      </div>
    );
  }

  return (
    <div className="mosaic-root">
      <div className="mosaic-chrome">
        <a href="/game" className="mosaic-chrome-link" onClick={() => audio.stopBgm()}>
          Game Library
        </a>
        <span className="mosaic-chrome-title">Binary Mosaic</span>
      </div>
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
        soundOn={soundOn}
        setSoundOn={setSoundOn}
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
