/**
 * Smoke: Generator determinism + optional Solver orchestrator check.
 *
 * Usage: npx tsx scripts/smoke-generator.mts
 *
 * Generator itself must not import Solver — this script is the orchestrator.
 */
import {
  generateLevel,
  type CreatorIntent,
} from "@/games/binary-mosaic/core/generator";
import { solveLevel } from "@/games/binary-mosaic/core/solver";
import { usedPieceCount } from "@/games/binary-mosaic/core/levelData";

const intent: CreatorIntent = {
  targetText: "HI",
  boardSize: { rows: 2, cols: 8 },
  pieceCount: 3,
  rotateQuota: 2,
  hintAllowed: true,
  seed: 4242,
  title: "Smoke: HI",
  draftId: 0,
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const a = generateLevel(intent);
  const b = generateLevel(intent);

  assert(a.ok && a.candidates.length === 1, `generate failed: ${JSON.stringify(a.errors)}`);
  assert(b.ok && b.candidates.length === 1, "second generate failed");

  const la = a.candidates[0].level;
  const lb = b.candidates[0].level;

  assert(
    JSON.stringify(la.solution) === JSON.stringify(lb.solution),
    "same seed must yield same solution",
  );
  assert(
    JSON.stringify(la.bits) === JSON.stringify(lb.bits),
    "same seed must yield same bits",
  );
  assert(
    JSON.stringify(la.rotatablePieceIndices) ===
      JSON.stringify(lb.rotatablePieceIndices),
    "same seed must yield same rotatablePieceIndices",
  );

  assert(usedPieceCount(la) === intent.pieceCount, "pieceCount mismatch");
  assert(la.rows === 2 && la.cols === 8, "board size mismatch");
  assert(la.targetText === "HI", "targetText mismatch");
  assert(la.hintAllowed === true, "hintAllowed mismatch");
  assert(la.frame === "rect", "frame default");
  assert(!("seed" in la), "seed must not appear on LevelData");

  const rot = la.rotatablePieceIndices ?? [];
  assert(
    rot.length === intent.rotateQuota,
    `rotatablePieceIndices.length=${rot.length} !== rotateQuota=${intent.rotateQuota}`,
  );

  const zero = generateLevel({ ...intent, rotateQuota: 0 });
  assert(zero.ok, "rotateQuota=0 should still pack");
  assert(
    !zero.candidates[0].level.rotatablePieceIndices ||
      zero.candidates[0].level.rotatablePieceIndices.length === 0,
    "rotateQuota=0 must omit/empty rotatablePieceIndices",
  );

  // Orchestrator-style: call Solver from this script only
  const solved = solveLevel(la, { solutionLimit: 3 });
  console.log(
    JSON.stringify(
      {
        ok: a.ok,
        pieceCount: usedPieceCount(la),
        rotatablePieceIndices: rot,
        deterministic: true,
        solver: {
          status: solved.status,
          solvable: solved.solvable,
          solutionCount: solved.solutionCount,
        },
        genMs: a.metrics.elapsedMs,
      },
      null,
      2,
    ),
  );

  if (!solved.solvable) {
    console.warn("warn: generated sample not solvable (pack may be MULTI/NONE for tiny board)");
  }
}

main();
