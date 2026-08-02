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
  expandHintCells,
  findWrongPlacedPieces,
  HINT_MAX_USES,
  HINT_ONE_PER_USE_FROM_LEVEL,
  isPieceCorrectlyPlaced,
  nextHintCellAnywhere,
  nextHintCellForPiece,
  type HintCell,
} from "@/games/binary-mosaic/puzzle/validation";
import type {
  LevelDef,
  PatternResult,
  PieceRuntime,
} from "@/games/binary-mosaic/types";
import { PieceView } from "@/games/binary-mosaic/ui/PieceView";
import { SoundToggleIcon } from "@/games/binary-mosaic/ui/SoundToggleIcon";
import { DeleteUserLevelModal } from "@/games/binary-mosaic/ui/DeleteUserLevelModal";
import { UsageGuideModal } from "@/games/binary-mosaic/ui/UsageGuideModal";
import { useCellPx } from "@/games/binary-mosaic/ui/useCellPx";
import { saveChallengeFeedback } from "@/games/binary-mosaic/progress/challengeFeedback";
import { deleteUserLevelAndRelated } from "@/games/binary-mosaic/progress/deleteUserLevelAndRelated";
import {
  createEmptyProgress,
  isLevelCleared,
  isLevelUnlocked,
  loadProgress,
  recordLevelClear,
  type BinaryBlockProgress,
} from "@/games/binary-mosaic/progress/storage";
import {
  BINARY_BLOCK_USER_LEVELS_KEY,
  getUserLevel,
  listUserLevels,
  DEFAULT_CREATOR_NAME,
  DEVELOPER_CREDIT,
  DEVELOPER_HOME_URL,
  USER_LEVELS_CHANGED_EVENT,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";
import {
  applyTrayOrder,
  pickTrayPatternIndex,
} from "@/games/binary-mosaic/puzzle/trayOrder";
import {
  initialRotationForRotatable,
  pickRotatablePieceIndices,
  rotatableCountForLevel,
} from "@/games/binary-mosaic/puzzle/rotationPolicy";
import { useBit8Audio } from "@/hooks/useBit8Audio";

/** Campaign = public L1–30; user = saved UserLevel (separate storage). */
type PlayMode = "campaign" | "user";

type ActivePlay =
  | { kind: "campaign"; levelId: number }
  | { kind: "user"; userLevelId: string; level: LevelDef };

/** Audio / tray seed — keep ≥1 so BGM stage hooks stay sane for draftId 0. */
function audioStageForLevel(level: LevelDef): number {
  return Math.max(1, level.id);
}

/**
 * Rotate quota: campaign table, or honor LevelData.rotatablePieceIndices
 * (UserLevels store explicit indices; draft ids are not in the L20–30 table).
 */
function rotateQuotaForPlay(level: LevelDef): number {
  const table = rotatableCountForLevel(level.id);
  const explicit = level.rotatablePieceIndices?.length ?? 0;
  return Math.max(table, explicit);
}

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

/** Build tray pieces from LevelData/LevelDef (campaign or user). */
function createPieces(level: LevelDef): PieceRuntime[] {
  const { pieces } = extractPiecesFromLevel(level);
  const rotatableIds = new Set(
    pickRotatablePieceIndices(
      pieces,
      rotateQuotaForPlay(level),
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
  return applyTrayOrder(runtime, level.id, pickTrayPatternIndex());
}

function MosaicPlayfield({
  level,
  playMode,
  userLevelId,
  onClearContinue,
  onLevelCleared,
  soundOn,
  setSoundOn,
}: {
  /** LevelData from campaign catalog or UserLevel.levelData. */
  level: LevelDef;
  playMode: PlayMode;
  /** Required when playMode === "user" — Challenge Feedback key. */
  userLevelId?: string;
  onClearContinue: (nextLevelId: number | null) => void;
  onLevelCleared?: () => void;
  soundOn: boolean;
  setSoundOn: (next: boolean) => void;
}) {
  const stageId = audioStageForLevel(level);
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
    createPieces(level),
  );
  const [hintUses, setHintUses] = useState(0);
  const [hintRevealed, setHintRevealed] = useState<HintCell[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [clearing, setClearing] = useState(false);
  const [feedbackSaveError, setFeedbackSaveError] = useState<string | null>(
    null,
  );
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

  useBit8Audio(running && !clearing && soundOn, stageId);

  useEffect(() => {
    if (clearing) {
      audio.setGameState("clear", { stage: stageId });
      return;
    }
    if (running && soundOn) {
      audio.setGameState("playing", { stage: stageId });
    }
  }, [clearing, running, soundOn, stageId, audio]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    audio.setMuted(!next);
    if (next) {
      void audio.unlock().then(() => {
        if (running && !clearing) {
          audio.setGameState("playing", { stage: stageId });
        }
      });
      void audio.playSe("button");
    } else {
      audio.setGameState("pause", { stage: stageId });
    }
    setSoundOn(next);
  }, [audio, running, clearing, soundOn, setSoundOn, stageId]);

  const handleClearDone = useCallback(() => {
    void audio.playSe("button");
    setClearing(false);
    // User levels: no public next-level unlock — return to select (null).
    if (playMode === "user") {
      onClearContinue(null);
      return;
    }
    onClearContinue(getNextLevelId(level.id));
  }, [audio, playMode, level.id, onClearContinue]);

  const handleBackToLevels = useCallback(() => {
    void audio.playSe("button");
    audio.setGameState("menu");
    setClearing(false);
    onClearContinue(null);
  }, [audio, onClearContinue]);

  piecesRef.current = pieces;

  useEffect(() => {
    clearedRef.current = false;
    setPieces(createPieces(level));
    setHintUses(0);
    setHintRevealed([]);
    setMoves(0);
    setElapsed(0);
    setRunning(true);
    setDragPieceId(null);
    setDropPreview(null);
    setClearing(false);
    setResult(null);
    setFeedbackSaveError(null);
    setSelectedId(null);
    setKbOrigin(null);
    setRejectMarkers([]);
    previewKeyRef.current = "";
    startRef.current = performance.now();
  }, [level]);

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
    // Campaign only: write binary_block_progress.clearedLevels (numeric public ids).
    // User levels: Challenge Feedback only — never push user ids into public progress.
    if (playMode === "campaign") {
      recordLevelClear(level.id, completionResult);
      onLevelCleared?.();
    } else if (playMode === "user" && userLevelId) {
      const saved = saveChallengeFeedback({
        userLevelId,
        clear: true,
        time: completionResult.completionTimeSec,
        moves: completionResult.moves,
        hintsUsed: completionResult.hintUses,
      });
      if (!saved.ok) {
        setFeedbackSaveError(saved.error);
      } else {
        setFeedbackSaveError(null);
      }
    }
    setResult(completionResult);
    setClearing(true);
  }, [
    decodedReady,
    running,
    moves,
    hintUses,
    pieces.length,
    level.id,
    playMode,
    userLevelId,
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

  const occupiedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const piece of pieces) {
      if (!piece.placed || dragPieceId === piece.id) continue;
      const shape = rotateShape(piece.baseShape, piece.rotation);
      for (const cell of absoluteCells(shape, piece.placed)) {
        set.add(`${cell.row},${cell.col}`);
      }
    }
    return set;
  }, [pieces, dragPieceId]);

  const hintCells = useMemo(
    () =>
      hintRevealed.filter(
        (cell) => !occupiedKeys.has(`${cell.row},${cell.col}`),
      ),
    [hintRevealed, occupiedKeys],
  );

  const rejectKeys = useMemo(
    () => new Set(rejectMarkers.map((m) => `${m.row},${m.col}`)),
    [rejectMarkers],
  );

  const hintUsesMaxed = useMemo(() => {
    if (hintUses >= HINT_MAX_USES) return true;
    const expanded = expandHintCells(
      level,
      hintUses + 1,
      hintRevealed,
      occupiedKeys,
    );
    return expanded.length <= hintRevealed.length;
  }, [hintUses, level, hintRevealed, occupiedKeys]);

  const hintTitle =
    level.id >= HINT_ONE_PER_USE_FROM_LEVEL
      ? `Reveal 1 empty cell (−${HINT_PENALTY_PER_USE} pts). Max ${HINT_MAX_USES}`
      : `Reveal empty cells (−${HINT_PENALTY_PER_USE} pts each). 6 → 12 → all`;

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
              const occupied = new Set<string>();
              for (const piece of piecesRef.current) {
                if (!piece.placed) continue;
                const shape = rotateShape(piece.baseShape, piece.rotation);
                for (const cell of absoluteCells(shape, piece.placed)) {
                  occupied.add(`${cell.row},${cell.col}`);
                }
              }
              setHintUses((n) => {
                const next = Math.min(HINT_MAX_USES, n + 1);
                setHintRevealed((prev) =>
                  expandHintCells(level, next, prev, occupied),
                );
                return next;
              });
            }}
            disabled={clearing || hintUsesMaxed}
            title={hintTitle}
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
            return (
              <span
                key={`hint-${cell.row}-${cell.col}`}
                className="mosaic-hint-marker"
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
      {feedbackSaveError ? (
        <p
          className="mosaic-creator-status mosaic-creator-status--fail mosaic-feedback-save-error"
          role="status"
        >
          {feedbackSaveError}
        </p>
      ) : null}
    </div>
  );
}

export function BinaryMosaicGame() {
  const levels = getAllLevels();
  const [active, setActive] = useState<ActivePlay>({
    kind: "campaign",
    levelId: levels[0]?.id ?? 1,
  });
  const [screen, setScreen] = useState<"select" | "play">("select");
  const [soundOn, setSoundOn] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [progress, setProgress] = useState<BinaryBlockProgress>(createEmptyProgress);
  const [userLevels, setUserLevels] = useState<UserLevelRecord[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [userLevelsMessage, setUserLevelsMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const audio = AudioManager.getInstance();
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const playLevel: LevelDef | undefined =
    active.kind === "campaign"
      ? getLevel(active.levelId)
      : active.level;
  const playStage = playLevel ? audioStageForLevel(playLevel) : 1;

  const refreshUserLevels = useCallback(() => {
    setUserLevels(listUserLevels());
  }, []);

  useEffect(() => {
    setProgress(loadProgress());
    refreshUserLevels();

    // Creator Play deep-link: /game/binary-mosaic?user=user:<uuid>
    try {
      const userId = new URLSearchParams(window.location.search).get("user");
      if (!userId) return;
      const record = getUserLevel(userId);
      if (!record) return;
      setActive({
        kind: "user",
        userLevelId: record.userLevelId,
        level: record.levelData as LevelDef,
      });
      setScreen("play");
    } catch {
      /* ignore bad URL / storage */
    }
  }, [refreshUserLevels]);

  useEffect(() => {
    if (screen === "select") {
      setProgress(loadProgress());
      refreshUserLevels();
    }
  }, [screen, refreshUserLevels]);

  // Cross-page / same-tab refresh after Creator save / import / delete
  useEffect(() => {
    const refresh = () => {
      refreshUserLevels();
    };
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === BINARY_BLOCK_USER_LEVELS_KEY || event.key === null) {
        refresh();
      }
    };
    window.addEventListener(USER_LEVELS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(USER_LEVELS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshUserLevels]);

  useEffect(() => {
    audio.setMuted(!soundOn);
  }, [audio, soundOn]);

  const refreshProgress = useCallback(() => {
    setProgress(loadProgress());
  }, []);

  const requestDeleteUserLevel = useCallback((userLevelId: string) => {
    setUserLevelsMessage(null);
    setDeleteTargetId(userLevelId);
  }, []);

  const cancelDeleteUserLevel = useCallback(() => {
    if (deleteBusy) return;
    setDeleteTargetId(null);
  }, [deleteBusy]);

  const confirmDeleteUserLevel = useCallback(() => {
    if (!deleteTargetId) return;
    setDeleteBusy(true);
    const id = deleteTargetId;
    window.setTimeout(() => {
      try {
        const result = deleteUserLevelAndRelated(id);
        if (!result.ok) {
          setUserLevelsMessage({ ok: false, text: result.error });
          setDeleteBusy(false);
          setDeleteTargetId(null);
          return;
        }
        if (active.kind === "user" && active.userLevelId === id) {
          setScreen("select");
          setActive({
            kind: "campaign",
            levelId: getAllLevels()[0]?.id ?? 1,
          });
        }
        refreshUserLevels();
        setUserLevelsMessage({ ok: true, text: "Challenge deleted." });
        setDeleteBusy(false);
        setDeleteTargetId(null);
      } catch {
        setUserLevelsMessage({
          ok: false,
          text: "Could not delete this challenge. Please try again.",
        });
        setDeleteBusy(false);
        setDeleteTargetId(null);
      }
    }, 0);
  }, [deleteTargetId, active, refreshUserLevels]);

  const startCampaign = useCallback((levelId: number) => {
    void AudioManager.getInstance().playSe("button");
    setActive({ kind: "campaign", levelId });
    setScreen("play");
  }, []);

  const startUserLevel = useCallback((userLevelId: string) => {
    const record = getUserLevel(userLevelId);
    if (!record) return;
    void AudioManager.getInstance().playSe("button");
    setActive({
      kind: "user",
      userLevelId: record.userLevelId,
      level: record.levelData as LevelDef,
    });
    setScreen("play");
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
        audio.setGameState("pause", { stage: playStage });
        return;
      }
      if (soundOn && screen === "play") {
        audio.setGameState("playing", { stage: playStage });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [audio, soundOn, screen, playStage]);

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
          <span className="mosaic-chrome-title">Binary Block</span>
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
        <nav className="mosaic-creator-entry" aria-label="Binary Block sections">
          <a href="/game/binary-mosaic/creator" className="mosaic-chrome-link">
            Creator
          </a>
          <span className="mosaic-creator-entry-sep" aria-hidden="true">
            ·
          </span>
          <a href="/game/binary-mosaic/challenge" className="mosaic-chrome-link">
            Challenge
          </a>
          <span className="mosaic-creator-entry-sep" aria-hidden="true">
            ·
          </span>
          <a
            href="/game/binary-mosaic/challenge?tab=collection"
            className="mosaic-chrome-link"
          >
            Collection
          </a>
          <span className="mosaic-creator-entry-sep" aria-hidden="true">
            ·
          </span>
          <a
            href="/game/binary-mosaic/challenge?tab=published"
            className="mosaic-chrome-link"
          >
            Published
          </a>
          <span className="mosaic-creator-entry-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="mosaic-guide-trigger"
            onClick={() => setGuideOpen(true)}
            aria-label="How to use Binary Block"
            aria-haspopup="dialog"
            aria-expanded={guideOpen}
          >
            How to use
          </button>
        </nav>
        <UsageGuideModal open={guideOpen} onClose={closeGuide} />

        <h3 className="mosaic-level-section">Campaign</h3>
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
                    startCampaign(level.id);
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

        <h3 className="mosaic-level-section mosaic-level-section--user">
          My levels
        </h3>
        {userLevelsMessage ? (
          <p
            className={
              userLevelsMessage.ok
                ? "mosaic-user-levels-msg mosaic-user-levels-msg--ok"
                : "mosaic-user-levels-msg mosaic-user-levels-msg--fail"
            }
            role="status"
          >
            {userLevelsMessage.text}
          </p>
        ) : null}
        {userLevels.length === 0 ? (
          <p className="mosaic-user-levels-empty">
            No saved user levels yet. Create one in Creator.
          </p>
        ) : (
          <ul className="mosaic-level-list">
            {userLevels.map((record) => {
              const ld = record.levelData;
              return (
                <li key={record.userLevelId} className="mosaic-user-level-row">
                  <button
                    type="button"
                    className="mosaic-level-btn"
                    onClick={() => startUserLevel(record.userLevelId)}
                  >
                    <span>{ld.title || "Untitled"}</span>
                    <span className="mosaic-level-meta">
                      {ld.targetText}
                      {" · "}
                      {ld.rows}×{ld.cols}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mosaic-btn mosaic-btn--danger mosaic-user-level-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteUserLevel(record.userLevelId);
                    }}
                    aria-label={`Delete ${ld.title || "Untitled"}`}
                  >
                    DELETE
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <DeleteUserLevelModal
          open={deleteTargetId != null}
          onCancel={cancelDeleteUserLevel}
          onConfirm={confirmDeleteUserLevel}
          busy={deleteBusy}
        />
      </div>
    );
  }

  if (!playLevel) {
    return (
      <div className="mosaic-root">
        <p className="mosaic-lead">Level not found.</p>
        <button
          type="button"
          className="mosaic-btn mosaic-btn--ghost"
          onClick={() => setScreen("select")}
        >
          Levels
        </button>
      </div>
    );
  }

  return (
    <div className="mosaic-root">
      <div className="mosaic-chrome">
        <a href="/game" className="mosaic-chrome-link" onClick={() => audio.setGameState("menu")}>
          Game Library
        </a>
        <span className="mosaic-chrome-title">Binary Block</span>
      </div>
      <div className="mosaic-play-top">
        <button
          type="button"
          className="mosaic-btn mosaic-btn--ghost"
          onClick={() => setScreen("select")}
        >
          Levels
        </button>
        <h2 className="mosaic-level-title">
          {playLevel.title}
          {active.kind === "user" ? (
            <span className="mosaic-level-title-tag"> · My level</span>
          ) : null}
        </h2>
        <span className="mosaic-play-spacer" />
      </div>
      <MosaicPlayfield
        key={
          active.kind === "campaign"
            ? `c-${active.levelId}`
            : `u-${active.userLevelId}`
        }
        level={playLevel}
        playMode={active.kind}
        userLevelId={
          active.kind === "user" ? active.userLevelId : undefined
        }
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        onLevelCleared={
          active.kind === "campaign" ? refreshProgress : undefined
        }
        onClearContinue={(nextId) => {
          if (active.kind === "user") {
            setScreen("select");
            return;
          }
          if (nextId != null) {
            setActive({ kind: "campaign", levelId: nextId });
            return;
          }
          setScreen("select");
        }}
      />
      {active.kind === "user" ? (
        <UserLevelCreditsFooter userLevelId={active.userLevelId} />
      ) : null}
    </div>
  );
}

/** UserLevel-only credit strip — reads record by activeUserLevelId. */
function UserLevelCreditsFooter({ userLevelId }: { userLevelId: string }) {
  const record = getUserLevel(userLevelId);
  const creatorName = record?.creatorName?.trim() || DEFAULT_CREATOR_NAME;
  const developerCredit = record?.developerCredit || DEVELOPER_CREDIT;
  return (
    <footer className="mosaic-user-credits" aria-label="Level credits">
      <div className="mosaic-user-credits-block">
        <span className="mosaic-user-credits-label">Created by</span>
        <span className="mosaic-user-credits-creator">{creatorName}</span>
      </div>
      <div className="mosaic-user-credits-block mosaic-user-credits-block--dev">
        <span className="mosaic-user-credits-label">Developer</span>
        <a
          href={DEVELOPER_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mosaic-user-credits-developer mosaic-developer-link"
        >
          {developerCredit}
        </a>
      </div>
    </footer>
  );
}
