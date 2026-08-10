/**
 * Verify Binary Block levels via core/solver (canonical).
 *
 * Usage: npx tsx scripts/verify-levels-solver.mts
 *        npm run verify:levels
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  solveLevel,
  solveLevelVisible,
  type SolverResult,
} from "@/games/binary-mosaic/core/solver";
import type { LevelData } from "@/games/binary-mosaic/core/levelData";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEVELS_PATH = join(ROOT, "games/binary-mosaic/levels/levels.json");
const REPORT_PATH = join(ROOT, "scripts/level-verify-report.json");

function difficultyBand(lid: number): string {
  if (lid <= 10) return "early";
  if (lid <= 20) return "mid";
  if (lid <= 24) return "intro-hard";
  if (lid <= 27) return "advanced";
  return "final";
}

function uniquenessLabel(result: SolverResult, solutionLimit: number): string {
  if (result.status === "NONE") return "NONE";
  if (result.status === "UNIQUE") return "UNIQUE";
  if (result.status === "TIMEOUT") {
    if (result.solutionCount === 0) return "NONE/TO";
    if (result.solutionCount === 1) return "UNIQUE?/TO";
    return `MULTI>=${result.solutionCount}/TO`;
  }
  // MULTI
  if (result.solutionCount >= solutionLimit) {
    return `MULTI>=${solutionLimit}`;
  }
  return `MULTI=${result.solutionCount}`;
}

function main(): void {
  const levels = JSON.parse(
    readFileSync(LEVELS_PATH, "utf-8"),
  ) as LevelData[];
  const sorted = [...levels].sort((a, b) => a.id - b.id);
  if (sorted.length < 39 || sorted.length > 50) {
    throw new Error(`expected 39–50 levels, got ${sorted.length}`);
  }
  const expectedMax = sorted[sorted.length - 1]!.id;

  const solutionLimit = 3;
  const rowsOut: Record<string, unknown>[] = [];
  let fail = 0;
  let uniqueN = 0;
  let multiN = 0;
  let noneN = 0;
  let toN = 0;
  let solvableN = 0;
  let unique21_plus = 0;
  let unique21_need = 0;
  let visibleFail = 0;

  console.log(
    `${"Lv".padStart(3)} ${"Word".padEnd(12)} ${"Pc".padStart(3)} ${"Sol".padStart(5)} ${"Unique?".padStart(10)} ${"Vis?".padStart(8)} ${"Nodes".padStart(8)} ${"ms".padStart(7)} Band`,
  );

  for (const level of sorted) {
    const pieceIds = new Set<number>();
    for (const row of level.solution) {
      for (const v of row) {
        if (v >= 0) pieceIds.add(v);
      }
    }
    const pc = pieceIds.size;
    const result = solveLevel(level, { solutionLimit });
    const uniq = uniquenessLabel(result, solutionLimit);

    let visLabel = "-";
    if (level.id >= 40) {
      const vis = solveLevelVisible(level, { solutionLimit });
      visLabel = uniquenessLabel(vis, solutionLimit);
      if (!vis.unique) {
        visibleFail += 1;
        fail += 1;
      }
    }

    if (!result.solvable) {
      fail += 1;
    } else {
      solvableN += 1;
    }
    if (result.unique) uniqueN += 1;
    if (result.status === "MULTI") multiN += 1;
    if (result.status === "NONE") noneN += 1;
    if (result.timedOut) toN += 1;
    if (level.id >= 21) {
      unique21_need += 1;
      if (result.unique) unique21_plus += 1;
      else fail += 1;
    }

    console.log(
      `${String(level.id).padStart(3)} ${level.targetText.padEnd(12)} ${String(pc).padStart(3)} ${String(result.solutionCount).padStart(5)} ${uniq.padStart(10)} ${visLabel.padStart(8)} ${String(result.exploredNodes).padStart(8)} ${result.elapsedTimeMs.toFixed(0).padStart(7)} ${difficultyBand(level.id)}`,
    );

    rowsOut.push({
      id: level.id,
      word: level.targetText,
      pieces: pc,
      cells: level.rows * level.cols,
      solver_solutions_capped: result.solutionCount,
      uniqueness: uniq,
      visible_uniqueness: visLabel,
      solvable: result.solvable,
      unique: result.unique,
      status: result.status,
      solver_nodes: result.exploredNodes,
      timed_out: result.timedOut,
      elapsed_ms: Math.round(result.elapsedTimeMs),
    });
  }

  console.log();
  console.log("=== Summary ===");
  console.log(`Levels: ${rowsOut.length} (max id ${expectedMax})`);
  console.log(`Solvable (>=1): ${solvableN}/${rowsOut.length}`);
  console.log(
    `Solver UNIQUE: ${uniqueN}  MULTI: ${multiN}  NONE: ${noneN}  timed_out: ${toN}`,
  );
  console.log(`L21+ UNIQUE: ${unique21_plus}/${unique21_need}`);
  console.log(`L40+ visible UNIQUE failures: ${visibleFail}`);
  console.log(`Failures flagged: ${fail}`);

  writeFileSync(REPORT_PATH, `${JSON.stringify(rowsOut, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${REPORT_PATH}`);

  if (solvableN !== rowsOut.length || unique21_plus !== unique21_need || fail > 0) {
    process.exitCode = 1;
  }
}

main();
