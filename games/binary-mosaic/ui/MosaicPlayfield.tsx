"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AudioManager } from "@/features/audio";
import {
  getAllLevels,
  getLevel,
  getNextLevelId,
} from "@/games/binary-mosaic/config";
import {
  boardWithPieces,
  tryPlacePiece,
  tryRotatePiece,
} from "@/games/binary-mosaic/core";
import { bitsToText } from "@/games/binary-mosaic/puzzle/binaryText";
import {
  buildBoardGrid,
  flattenBoardBits,
} from "@/games/binary-mosaic/puzzle/boardGrid";
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
  HINT_PENALTY_PER_USE,
} from "@/games/binary-mosaic/puzzle/scoring";
import {
  allPiecesPlaced,
  buildPieceExpectations,
  cellsForHintUses,
  findWrongPlacedPieces,
  HINT_MAX_USES,
  isPieceCorrectlyPlaced,
  listSolutionCells,
  nextHintCellAnywhere,
  nextHintCellForPiece,
} from "@/games/binary-mosaic/puzzle/validation";
import type {
  PatternResult,
  PieceRuntime,
} from "@/games/binary-mosaic/types";
import { PieceView } from "@/games/binary-mosaic/ui/PieceView";
import { SoundToggleIcon } from "@/games/binary-mosaic/ui/SoundToggleIcon";
import { useCellPx } from "@/games/binary-mosaic/ui/useCellPx";
import {
  isLevelCleared,
  isLevelUnlocked,
  loadProgress,
  recordLevelClear,
  type BinaryBlockProgress,
} from "@/games/binary-mosaic/progress/storage";
import {
  applyTrayOrder,
  pickTrayPatternIndex,
} from "@/games/binary-mosaic/puzzle/trayOrder";
import {
  initialRotationForRotatable,
  pickRotatablePieceIndices,
  rotatableCountForLevel,
  rotationFeatureStartsAt,
} from "@/games/binary-mosaic/puzzle/rotationPolicy";
import { useBit8Audio } from "@/hooks/useBit8Audio";

const ClearSequence = dynamic(
  () =>
    import("@/games/binary-mosaic/ui/ClearSequence").then((m) => ({
      default: m.ClearSequence,
    })),
  { ssr: false },
);

type RejectMarker = {
  row: number;
  col: number;
  bit: 0 | 1;
  pieceIndex: number;
};

type DropPreview = {
  origin: { row: number; col: number };
  valid: boolean;
  rows: number;
  cols: number;
};

type Cell = { row: number; col: number };

function createPieces(levelId: number): PieceRuntime[] {
  const level = getLevel(levelId);
  if (!level) return [];
  const { pieces } = extractPiecesFromLevel(level);
  const rotatableIds = new Set(
    pickRotatablePieceIndices(
      pieces,
      rotatableCountForLevel(levelId),
      level.rotatablePieceIndices,
    ),
  );
  const runtime: PieceRuntime[] = pieces.map((piece) => {
    const canRotate = rotatableIds.has(piece.pieceIndex);
    return {
      id: `p-${piece.pieceIndex}`,
      pieceIndex: piece.pieceIndex,
      baseShape: piece.baseShape,
      rotation: canRotate
        ? initialRotationForRotatable(piece.baseShape)
        : (0 as const),
      placed: null,
      canRotate,
    };
  });
  return applyTrayOrder(runtime, levelId, pickTrayPatternIndex());
}

function MosaicPlayfield({
  levelId,
  onClearContinue,
  onLevelCleared,
  soundOn,
  setSoundOn,
}: {
  levelId: number;
  onClearContinue: (nextLevelId: number | null) => void;
  onLevelCleared?: () => void;
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
  const cellPx = useCellPx();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragLayerRef = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<PieceRuntime[]>([]);
  const dragMetaRef = useRef({
    grabOffsetX: 0,
    grabOffsetY: 0,
    x: 0,
    y: 0,
  });
  const previewKeyRef = useRef("");

  const [pieces, setPieces] = useState<PieceRuntime[]>(() =>
    createPieces(levelId),
  );
  const [hintUses, setHintUses] = useState(0);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kbOrigin, setKbOrigin] = useState<Cell | null>(null);
  const [rejectMarkers, setRejectMarkers] = useState<RejectMarker[]>([]);
  const startRef = useRef(performance.now());
  const clearedRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const audio = AudioManager.getInstance();

  useEffect(() => {
    audio.setMuted(!soundOn);
  }, [soundOn, audio]);

  useBit8Audio(running && !clearing && soundOn, levelId);

  useEffect(() => {
    if (clearing) {
      audio.setGameState("clear", { stage: levelId });
      return;
    }
    if (running && soundOn) {
      audio.setGameState("playing", { stage: levelId });
    }
  }, [clearing, running, soundOn, levelId, audio]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    audio.setMuted(!next);
    if (next) {
      void audio.unlock().then(() => {
        if (running && !clearing) {
          audio.setGameState("playing", { stage: levelId });
        }
      });
      void audio.playSe("button");
    } else {
      audio.setGameState("pause", { stage: levelId });
    }
    setSoundOn(next);
  }, [audio, running, clearing, soundOn, setSoundOn, levelId]);

  const handleClearDone = useCallback(() => {
    void audio.playSe("button");
    setClearing(false);
    onClearContinue(getNextLevelId(levelId));
  }, [audio, levelId, onClearContinue]);

  const handleBackToLevels = useCallback(() => {
    void audio.playSe("button");
    audio.setGameState("menu");
    setClearing(false);
    onClearContinue(null);
  }, [audio, onClearContinue]);

  piecesRef.current = pieces;

  useEffect(() => {
    clearedRef.current = false;
    setPieces(createPieces(levelId));
    setHintUses(0);
    setMoves(0);
    setElapsed(0);
    setRunning(true);
    setDragPieceId(null);
    setDropPreview(null);
    setClearing(false);
    setResult(null);
    setSelectedId(null);
    setKbOrigin(null);
    setRejectMarkers([]);
    previewKeyRef.current = "";
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
    const flat = flattenBoardBits(level, pieces);
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
    const completionResult = buildPatternResult({
      completionTimeSec,
      moves,
      hintUses,
      pieceCount: pieces.length,
      decodedText: decodedReady,
    });
    recordLevelClear(level.id, completionResult);
    onLevelCleared?.();
    setResult(completionResult);
    setClearing(true);
  }, [
    decodedReady,
    running,
    moves,
    hintUses,
    pieces.length,
    level.id,
    onLevelCleared,
  ]);

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
      const flat = flattenBoardBits(level, nextPieces);
      if (flat && bitsToText(flat) === level.targetText) return nextPieces;
      return rejectWrongPieces(nextPieces);
    },
    [level, rejectWrongPieces],
  );

  const placeAtOrigin = useCallback(
    (pieceId: string, origin: Cell) => {
      setPieces((prev) => {
        const board = boardWithPieces(
          level.rows,
          level.cols,
          level.solution,
          prev,
        );
        const { board: nextBoard, ok } = tryPlacePiece(board, pieceId, origin);
        if (!ok) return prev;
        const placed = nextBoard.pieces as PieceRuntime[];
        const beforeIds = new Set(
          placed.filter((p) => p.placed).map((p) => p.id),
        );
        const next = afterPlacement(placed);
        const rejected = next.some(
          (p) => beforeIds.has(p.id) && !p.placed,
        );
        void audio.playSe(rejected ? "reject" : "snap");
        bumpMove();
        return next;
      });
    },
    [level, afterPlacement, audio],
  );

  const rotatePiece = useCallback(
    (pieceId: string) => {
      const target = piecesRef.current.find((p) => p.id === pieceId);
      if (!target?.canRotate) return;
      let rotated = false;
      setPieces((prev) => {
        const piece = prev.find((p) => p.id === pieceId);
        if (!piece?.canRotate) return prev;
        const board = boardWithPieces(
          level.rows,
          level.cols,
          level.solution,
          prev,
        );
        const { board: nextBoard, ok } = tryRotatePiece(board, pieceId);
        if (!ok) return prev;
        rotated = true;
        return nextBoard.pieces as PieceRuntime[];
      });
      if (rotated) {
        if (soundOn) void audio.rotate();
        bumpMove();
      }
    },
    [level, soundOn, audio],
  );

  const onPiecePointerDown = (
    event: ReactPointerEvent,
    piece: PieceRuntime,
  ) => {
    if (clearing) return;
    void audio.unlock();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedId(piece.id);
    setKbOrigin(null);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragMetaRef.current = {
      grabOffsetX: event.clientX - rect.left,
      grabOffsetY: event.clientY - rect.top,
      x: rect.left,
      y: rect.top,
    };
    setDragPieceId(piece.id);
    requestAnimationFrame(() => {
      if (dragLayerRef.current) {
        dragLayerRef.current.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      }
    });
    if (piece.placed) {
      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? { ...p, placed: null } : p)),
      );
    }
  };

  useEffect(() => {
    if (!dragPieceId) {
      setDropPreview(null);
      previewKeyRef.current = "";
      return;
    }

    const updatePreview = (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) {
        setDropPreview(null);
        return;
      }
      const piece = piecesRef.current.find((p) => p.id === dragPieceId);
      if (!piece) {
        setDropPreview(null);
        return;
      }
      const shape = rotateShape(piece.baseShape, piece.rotation);
      const bounds = shapeBounds(shape);
      const boardRect = board.getBoundingClientRect();
      const { x, y } = dragMetaRef.current;
      const localX = clientX - boardRect.left;
      const localY = clientY - boardRect.top;
      const inside =
        localX >= -cellPx &&
        localY >= -cellPx &&
        localX <= boardRect.width + cellPx &&
        localY <= boardRect.height + cellPx;

      if (!inside) {
        if (previewKeyRef.current !== "") {
          previewKeyRef.current = "";
          setDropPreview(null);
        }
        return;
      }

      const origin = snapOrigin(
        shape,
        level.rows,
        level.cols,
        (y - boardRect.top) / cellPx,
        (x - boardRect.left) / cellPx,
      );
      const valid = canPlaceOnBoard({
        rows: level.rows,
        cols: level.cols,
        shape,
        origin,
        occupied: occupiedExcept(dragPieceId),
        activeMask,
      });
      const key = `${origin.row},${origin.col},${valid}`;
      if (key === previewKeyRef.current) return;
      previewKeyRef.current = key;
      setDropPreview({
        origin,
        valid,
        rows: bounds.rows,
        cols: bounds.cols,
      });
    };

    const onMove = (event: PointerEvent) => {
      pendingDragRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (dragRafRef.current != null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingDragRef.current;
        if (!pending) return;
        const x = pending.clientX - dragMetaRef.current.grabOffsetX;
        const y = pending.clientY - dragMetaRef.current.grabOffsetY;
        dragMetaRef.current.x = x;
        dragMetaRef.current.y = y;
        if (dragLayerRef.current) {
          dragLayerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
        updatePreview(pending.clientX, pending.clientY);
      });
    };

    const onUp = (event: PointerEvent) => {
      const board = boardRef.current;
      setDragPieceId(null);
      setDropPreview(null);
      previewKeyRef.current = "";
      if (!board) return;
      const piece = piecesRef.current.find((p) => p.id === dragPieceId);
      if (!piece) return;

      const shape = rotateShape(piece.baseShape, piece.rotation);
      const boardRect = board.getBoundingClientRect();
      const { x, y } = dragMetaRef.current;
      const localX = event.clientX - boardRect.left;
      const localY = event.clientY - boardRect.top;
      const inside =
        localX >= -cellPx &&
        localY >= -cellPx &&
        localX <= boardRect.width + cellPx &&
        localY <= boardRect.height + cellPx;

      if (!inside) return;

      const origin = snapOrigin(
        shape,
        level.rows,
        level.cols,
        (y - boardRect.top) / cellPx,
        (x - boardRect.left) / cellPx,
      );

      const ok = canPlaceOnBoard({
        rows: level.rows,
        cols: level.cols,
        shape,
        origin,
        occupied: occupiedExcept(dragPieceId),
        activeMask,
      });

      if (ok) placeAtOrigin(dragPieceId, origin);
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
    dragPieceId,
    cellPx,
    level,
    occupiedExcept,
    activeMask,
    placeAtOrigin,
  ]);

  const trayPieceIds = useMemo(
    () => pieces.filter((p) => !p.placed).map((p) => p.id),
    [pieces],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (clearing) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setSelectedId(null);
        setKbOrigin(null);
        setDragPieceId(null);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const pool = trayPieceIds.length
          ? trayPieceIds
          : pieces.map((p) => p.id);
        if (pool.length === 0) return;
        const idx = selectedId ? pool.indexOf(selectedId) : -1;
        const next =
          pool[(idx + (event.shiftKey ? pool.length - 1 : 1)) % pool.length];
        setSelectedId(next);
        const nextPiece = piecesRef.current.find((p) => p.id === next);
        if (nextPiece && !nextPiece.placed) {
          setKbOrigin({ row: 0, col: 0 });
        } else {
          setKbOrigin(null);
        }
        return;
      }

      if (
        selectedId &&
        (event.key === "r" || event.key === "R")
      ) {
        const selected = piecesRef.current.find((p) => p.id === selectedId);
        if (selected?.canRotate) {
          event.preventDefault();
          rotatePiece(selectedId);
        }
        return;
      }

      if (
        selectedId &&
        kbOrigin &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.key,
        )
      ) {
        const piece = piecesRef.current.find((p) => p.id === selectedId);
        if (!piece || piece.placed) return;
        event.preventDefault();
        const shape = rotateShape(piece.baseShape, piece.rotation);
        const bounds = shapeBounds(shape);
        const delta = {
          ArrowUp: { row: -1, col: 0 },
          ArrowDown: { row: 1, col: 0 },
          ArrowLeft: { row: 0, col: -1 },
          ArrowRight: { row: 0, col: 1 },
        }[event.key]!;
        setKbOrigin((prev) => {
          const base = prev ?? { row: 0, col: 0 };
          return {
            row: Math.max(
              0,
              Math.min(level.rows - bounds.rows, base.row + delta.row),
            ),
            col: Math.max(
              0,
              Math.min(level.cols - bounds.cols, base.col + delta.col),
            ),
          };
        });
        return;
      }

      if (
        selectedId &&
        kbOrigin &&
        (event.key === "Enter" || event.key === " ")
      ) {
        const piece = piecesRef.current.find((p) => p.id === selectedId);
        if (!piece || piece.placed) return;
        event.preventDefault();
        placeAtOrigin(selectedId, kbOrigin);
        setKbOrigin(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    clearing,
    selectedId,
    kbOrigin,
    trayPieceIds,
    pieces,
    rotatePiece,
    placeAtOrigin,
    level.rows,
    level.cols,
  ]);

  const boardW = level.cols * cellPx;
  const boardH = level.rows * cellPx;
  const draggingPiece = dragPieceId
    ? pieces.find((p) => p.id === dragPieceId)
    : null;

  const solvedCells = useMemo(() => {
    const covered = new Set<string>();
    const byIndex = new Map(expectations.map((e) => [e.pieceIndex, e]));
    for (const piece of pieces) {
      if (!piece.placed || dragPieceId === piece.id) continue;
      const exp = byIndex.get(piece.pieceIndex);
      if (!exp || !isPieceCorrectlyPlaced(piece, exp)) continue;
      const shape = rotateShape(piece.baseShape, piece.rotation);
      for (const cell of absoluteCells(shape, piece.placed)) {
        covered.add(`${cell.row},${cell.col}`);
      }
    }
    return covered;
  }, [pieces, expectations, dragPieceId]);

  const hintCells = useMemo(
    () => cellsForHintUses(level, hintUses),
    [level, hintUses],
  );

  const solutionCellCount = useMemo(
    () => listSolutionCells(level).length,
    [level],
  );

  const rejectKeys = useMemo(
    () => new Set(rejectMarkers.map((m) => `${m.row},${m.col}`)),
    [rejectMarkers],
  );

  const hintUsesMaxed =
    hintUses >= HINT_MAX_USES || hintCells.length >= solutionCellCount;

  const boardBits = useMemo(
    () => buildBoardGrid(level, pieces, { excludePieceId: dragPieceId }),
    [pieces, level, dragPieceId],
  );

  const kbPreview = useMemo(() => {
    if (!selectedId || !kbOrigin || dragPieceId) return null;
    const piece = pieces.find((p) => p.id === selectedId);
    if (!piece || piece.placed) return null;
    const shape = rotateShape(piece.baseShape, piece.rotation);
    const bounds = shapeBounds(shape);
    const valid = canPlaceOnBoard({
      rows: level.rows,
      cols: level.cols,
      shape,
      origin: kbOrigin,
      occupied: occupiedExcept(selectedId),
      activeMask,
    });
    return {
      origin: kbOrigin,
      valid,
      rows: bounds.rows,
      cols: bounds.cols,
    };
  }, [
    selectedId,
    kbOrigin,
    dragPieceId,
    pieces,
    level,
    occupiedExcept,
    activeMask,
  ]);

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
          <span className="mosaic-hud-target">{level.targetText}</span>
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
            className={`mosaic-btn mosaic-btn--ghost ${hintUses > 0 ? "is-on" : ""}`}
            onClick={() => {
              if (hintUsesMaxed) return;
              void audio.playSe("button");
              setHintUses((n) => Math.min(HINT_MAX_USES, n + 1));
            }}
            disabled={clearing || hintUsesMaxed}
            title={`Reveal cells (−${HINT_PENALTY_PER_USE} pts each). 6 → 12 → all`}
          >
            Hint{hintUses > 0 ? ` ${hintUses}/${HINT_MAX_USES}` : ""}
          </button>
        ) : null}
        {selectedId &&
        pieces.some((p) => p.id === selectedId && p.canRotate) ? (
          <button
            type="button"
            className="mosaic-btn mosaic-btn--ghost"
            onClick={() => {
              void audio.playSe("button");
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
            className={`mosaic-board${dragPieceId ? " is-dragging" : ""}`}
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

          {hintCells.map((cell) => {
            const key = `${cell.row},${cell.col}`;
            if (rejectKeys.has(key)) return null;
            const met = solvedCells.has(key);
            return (
              <span
                key={`hint-${cell.row}-${cell.col}`}
                className={`mosaic-hint-marker${met ? " is-met" : ""}`}
                style={{
                  left: cell.col * cellPx,
                  top: cell.row * cellPx,
                  width: cellPx,
                  height: cellPx,
                }}
              >
                {cell.bit}
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

          {kbPreview ? (
            <div
              className={`mosaic-drop-preview mosaic-drop-preview--kb${kbPreview.valid ? "" : " is-invalid"}`}
              style={{
                left: kbPreview.origin.col * cellPx,
                top: kbPreview.origin.row * cellPx,
                width: kbPreview.cols * cellPx,
                height: kbPreview.rows * cellPx,
              }}
            />
          ) : null}

          {pieces.map((piece) => {
            if (!piece.placed || dragPieceId === piece.id) return null;
            return (
              <div
                key={piece.id}
                className="mosaic-on-board"
                data-tint={piece.pieceIndex % 6}
                style={{
                  left: piece.placed.col * cellPx,
                  top: piece.placed.row * cellPx,
                }}
              >
                <PieceView
                  shape={piece.baseShape}
                  rotation={piece.rotation}
                  cellPx={cellPx}
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
            const isDragging = dragPieceId === piece.id;
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
                    {piece.canRotate ? (
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

      {draggingPiece ? (
        <div
          ref={dragLayerRef}
          className="mosaic-drag-layer"
          style={{
            transform: `translate3d(${dragMetaRef.current.x}px, ${dragMetaRef.current.y}px, 0)`,
          }}
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
        onDone={handleClearDone}
        onBackToLevels={handleBackToLevels}
      />
    </div>
  );
}

export function BinaryMosaicGame() {
  const levels = getAllLevels();
  const [levelId, setLevelId] = useState(levels[0]?.id ?? 1);
  const [screen, setScreen] = useState<"select" | "play">("select");
  const [soundOn, setSoundOn] = useState(false);
  const [progress, setProgress] = useState<BinaryBlockProgress>(() =>
    loadProgress(),
  );
  const audio = AudioManager.getInstance();

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (screen === "select") setProgress(loadProgress());
  }, [screen]);

  useEffect(() => {
    audio.setMuted(!soundOn);
  }, [audio, soundOn]);

  const refreshProgress = useCallback(() => {
    setProgress(loadProgress());
  }, []);

  const toggleSelectSound = useCallback(() => {
    const next = !soundOn;
    audio.setMuted(!next);
    if (next) {
      void audio.unlock().then(() => {
        void audio.playSe("button");
      });
    }
    setSoundOn(next);
  }, [audio, soundOn]);

  // Visibility / screen → GameAudioState (no manual BGM event chains)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        audio.setGameState("pause", { stage: levelId });
        return;
      }
      if (soundOn && screen === "play") {
        audio.setGameState("playing", { stage: levelId });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [audio, soundOn, screen, levelId]);

  useEffect(() => {
    if (screen === "select") {
      audio.setGameState("menu");
    }
    return () => {
      audio.setGameState("menu");
    };
  }, [audio, screen]);

  useEffect(() => {
    return () => {
      audio.dispose();
    };
  }, [audio]);

  if (screen === "select") {
    return (
      <div className="mosaic-root">
        <div className="mosaic-chrome mosaic-chrome--select">
          <a href="/game" className="mosaic-chrome-link" onClick={() => audio.setGameState("menu")}>
            Game Library
          </a>
          <span className="mosaic-chrome-title">Binary Mosaic</span>
          <button
            type="button"
            className={`mosaic-btn mosaic-btn--ghost mosaic-btn--icon mosaic-btn--icon-sm mosaic-chrome-sound ${soundOn ? "is-on" : ""}`}
            onClick={toggleSelectSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Sound on" : "Sound off"}
            title={soundOn ? "Sound on" : "Sound off"}
          >
            <SoundToggleIcon
              muted={!soundOn}
              size={14}
              className="mosaic-sound-icon"
            />
          </button>
        </div>
        <p className="mosaic-lead">
          Assemble glass binary fragments into a clean bit field. Each finished
          board decodes to real ASCII text — not decoration. Clear a level to
          unlock the next.
        </p>
        <ul className="mosaic-level-list">
          {levels.map((level) => {
            const unlocked = isLevelUnlocked(progress, level.id);
            const cleared = isLevelCleared(progress, level.id);
            const key = String(level.id);
            const bestScore = progress?.bestScores[key];
            const bestTime = progress?.bestTimes[key];
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className={`mosaic-level-btn${cleared ? " is-cleared" : ""}${unlocked ? "" : " is-locked"}`}
                  disabled={!unlocked}
                  onClick={() => {
                    if (!unlocked) return;
                    void AudioManager.getInstance().playSe("button");
                    setLevelId(level.id);
                    setScreen("play");
                  }}
                >
                  <span>{level.title}</span>
                  <span className="mosaic-level-meta">
                    {unlocked ? (
                      <>
                        {level.targetText}
                        {cleared && bestScore != null && bestTime != null ? (
                          <>
                            {" "}
                            ·{" "}
                            <span
                              className={
                                bestScore >= 90
                                  ? "mosaic-level-best mosaic-level-best--high"
                                  : "mosaic-level-best"
                              }
                              title="Best Score"
                            >
                              <span
                                className={
                                  bestScore >= 100
                                    ? "mosaic-level-best-star mosaic-level-best-star--perfect"
                                    : "mosaic-level-best-star"
                                }
                                style={
                                  bestScore >= 100
                                    ? undefined
                                    : {
                                        animationDelay: `${((level.id * 37) % 100) / 10}s`,
                                      }
                                }
                                aria-hidden="true"
                              >
                                {bestScore >= 100 ? "✶" : "★"}
                              </span>{" "}
                              <span className="mosaic-level-best-num">
                                {bestScore}
                              </span>
                              {" · "}
                              <span className="mosaic-level-best-num">
                                {formatTime(bestTime)}
                              </span>
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span className="mosaic-level-lock">Locked</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mosaic-lead" style={{ marginTop: "2rem" }}>
          Rotation from Level {rotationFeatureStartsAt()}: L20–21 one piece ·
          L22–24 two · L25–28 three · L29–30 five. Tab to select · arrows to
          move · Enter to place · R to rotate.
        </p>
      </div>
    );
  }

  return (
    <div className="mosaic-root">
      <div className="mosaic-chrome">
        <a href="/game" className="mosaic-chrome-link" onClick={() => audio.setGameState("menu")}>
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
        onLevelCleared={refreshProgress}
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
