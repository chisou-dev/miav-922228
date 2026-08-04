/**
 * Evaluate Binary Block levels via core/solver + core/evaluator.
 *
 * Usage: npx tsx scripts/evaluate-levels.mts
 *        npm run evaluate:levels
 *        npx tsx scripts/evaluate-levels.mts --profile=PUBLIC_CAMPAIGN
 *        npx tsx scripts/evaluate-levels.mts --profile USER_LEVEL
 *
 * Default profile: PUBLIC_CAMPAIGN (Phase1 multi-ok for L1–20).
 * Orchestrator only: solveLevel → evaluateLevel (evaluator does not call solver).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_EVALUATION_PROFILE,
  EvaluationProfile,
  evaluateLevel,
  type EvaluatorReasonCode,
  type EvaluatorResult,
} from "@/games/binary-mosaic/core/evaluator";
import type { LevelData } from "@/games/binary-mosaic/core/levelData";
import { solveLevel } from "@/games/binary-mosaic/core/solver";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEVELS_PATH = join(ROOT, "games/binary-mosaic/levels/levels.json");
const REPORT_PATH = join(ROOT, "scripts/level-evaluate-report.json");

type ReportRow = {
  id: number;
  word: string;
  passed: boolean;
  score: number;
  difficulty: EvaluatorResult["difficulty"];
  reasons: EvaluatorReasonCode[];
  metrics: EvaluatorResult["metrics"];
  solver: {
    status: string;
    unique: boolean;
    solvable: boolean;
    exploredNodes: number;
    elapsedMs: number;
  };
};

function parseProfile(argv: string[]): EvaluationProfile {
  const profiles = new Set(Object.values(EvaluationProfile));
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--profile=")) {
      const value = arg.slice("--profile=".length);
      if (profiles.has(value as EvaluationProfile)) {
        return value as EvaluationProfile;
      }
      throw new Error(
        `unknown profile "${value}"; expected one of ${[...profiles].join(", ")}`,
      );
    }
    if (arg === "--profile") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--profile requires a value");
      }
      if (profiles.has(value as EvaluationProfile)) {
        return value as EvaluationProfile;
      }
      throw new Error(
        `unknown profile "${value}"; expected one of ${[...profiles].join(", ")}`,
      );
    }
  }
  return DEFAULT_EVALUATION_PROFILE;
}

function main(): void {
  const profile = parseProfile(process.argv.slice(2));
  const levels = JSON.parse(
    readFileSync(LEVELS_PATH, "utf-8"),
  ) as LevelData[];
  const sorted = [...levels].sort((a, b) => a.id - b.id);
  if (sorted.length !== 35) {
    throw new Error(`expected 35 levels, got ${sorted.length}`);
  }

  const rows: ReportRow[] = [];
  const reasonCounts = new Map<EvaluatorReasonCode, number>();
  let passedN = 0;

  console.log(`Profile: ${profile}`);
  console.log(
    `${"Lv".padStart(3)} ${"Pass".padStart(4)} ${"Score".padStart(5)} ${"Diff".padEnd(6)} ${"Bar%".padStart(5)} ${"Max".padStart(3)} ${"Pc".padStart(3)} ${"Nodes".padStart(8)} Reasons`,
  );

  for (const level of sorted) {
    const solver = solveLevel(level, { solutionLimit: 3 });
    const ev = evaluateLevel(level, solver, { profile });
    if (ev.passed) passedN += 1;
    for (const r of ev.reasons) {
      reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
    }

    const barPct = (ev.metrics.barPieceRate * 100).toFixed(0);
    console.log(
      `${String(level.id).padStart(3)} ${(ev.passed ? "OK" : "NG").padStart(4)} ${String(ev.score).padStart(5)} ${ev.difficulty.padEnd(6)} ${barPct.padStart(5)} ${String(ev.metrics.maxPieceSize).padStart(3)} ${String(ev.metrics.pieceCount).padStart(3)} ${String(ev.metrics.exploredNodes).padStart(8)} ${ev.reasons.join(",") || "-"}`,
    );

    rows.push({
      id: level.id,
      word: level.targetText,
      passed: ev.passed,
      score: ev.score,
      difficulty: ev.difficulty,
      reasons: ev.reasons,
      metrics: ev.metrics,
      solver: {
        status: solver.status,
        unique: solver.unique,
        solvable: solver.solvable,
        exploredNodes: solver.exploredNodes,
        elapsedMs: Math.round(solver.elapsedTimeMs),
      },
    });
  }

  const summary = {
    profile,
    levels: rows.length,
    passed: passedN,
    failed: rows.length - passedN,
    reasonCounts: Object.fromEntries(
      [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]),
    ),
  };

  console.log();
  console.log("=== Summary ===");
  console.log(`Profile: ${summary.profile}`);
  console.log(`Passed: ${summary.passed}/${summary.levels}`);
  console.log(`Failed: ${summary.failed}/${summary.levels}`);
  console.log("Reason counts:", JSON.stringify(summary.reasonCounts));

  const report = { summary, levels: rows };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${REPORT_PATH}`);
}

main();
