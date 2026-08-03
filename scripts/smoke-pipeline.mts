/**
 * Smoke: Generation pipeline orchestrator (Phase2-8).
 *
 * Confirms:
 * - PASS path saves a UserLevel
 * - GENERATE_FAILED / EVAL_FAILED do not save
 * - public getAllLevelData() stays 31
 *
 * Usage: npx tsx scripts/smoke-pipeline.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import type { CreatorIntent } from "@/games/binary-mosaic/core/generator";
import {
  PipelineErrorCode,
  runCreateUserLevelPipeline,
} from "@/games/binary-mosaic/pipeline/createUserLevel";
import {
  createMemoryUserLevelsKv,
  listUserLevels,
  setUserLevelsStorage,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const BASE_INTENT: CreatorIntent = {
  targetText: "HI",
  boardSize: { rows: 2, cols: 8 },
  pieceCount: 3,
  rotateQuota: 1,
  hintAllowed: true,
  seed: 90210,
  title: "Smoke pipeline",
  draftId: 0,
};

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 31, `expected 31 public levels, got ${publicBefore}`);

  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(listUserLevels().length === 0, "memory store should start empty");

  // --- GENERATE_FAILED: invalid intent, no save ---
  const genFail = runCreateUserLevelPipeline({
    ...BASE_INTENT,
    pieceCount: 0,
    targetText: "",
  });
  assert(genFail.success === false, "invalid intent must fail");
  assert(
    genFail.errorCode === PipelineErrorCode.GENERATE_FAILED,
    `expected GENERATE_FAILED, got ${genFail.errorCode}`,
  );
  assert(genFail.savedUserLevelId === undefined, "gen fail must not save id");
  assert(listUserLevels().length === 0, "gen fail must not increase store");

  // --- EVAL_FAILED: force hard fail via thresholds, no save ---
  const evalFail = runCreateUserLevelPipeline(BASE_INTENT, {
    profile: EvaluationProfile.USER_LEVEL,
    thresholds: { minPieceCount: 99 },
  });
  assert(evalFail.success === false, "forced eval must fail");
  assert(
    evalFail.errorCode === PipelineErrorCode.EVAL_FAILED ||
      evalFail.errorCode === PipelineErrorCode.NOT_UNIQUE,
    `expected EVAL_FAILED/NOT_UNIQUE, got ${evalFail.errorCode}`,
  );
  assert(evalFail.levelData !== undefined, "eval fail should still have levelData");
  assert(evalFail.solverResult !== undefined, "eval fail should have solverResult");
  assert(evalFail.evaluatorResult?.passed === false, "evaluator must not pass");
  assert(evalFail.savedUserLevelId === undefined, "eval fail must not save id");
  assert(listUserLevels().length === 0, "eval fail must not increase store");

  // --- PASS path: save UserLevel ---
  let pass = runCreateUserLevelPipeline(BASE_INTENT, {
    profile: EvaluationProfile.USER_LEVEL,
  });

  if (!pass.success) {
    for (const seed of [1111, 2222, 3333, 4444, 5555, 7777, 8888, 4242]) {
      pass = runCreateUserLevelPipeline(
        { ...BASE_INTENT, seed },
        { profile: EvaluationProfile.USER_LEVEL },
      );
      if (pass.success) break;
    }
  }

  assert(pass.success, `PASS path failed: ${pass.errorCode} ${pass.message}`);
  assert(pass.levelData !== undefined, "PASS must include levelData");
  assert(pass.solverResult !== undefined, "PASS must include solverResult");
  assert(pass.evaluatorResult?.passed === true, "PASS evaluator must pass");
  assert(
    typeof pass.savedUserLevelId === "string" &&
      pass.savedUserLevelId.startsWith("user:"),
    "PASS must return savedUserLevelId",
  );
  assert(!("seed" in (pass.levelData ?? {})), "LevelData must stay seed-free");
  assert(listUserLevels().length === 1, "PASS must persist exactly one user level");
  assert(
    listUserLevels()[0].userLevelId === pass.savedUserLevelId,
    "stored id mismatch",
  );

  const publicAfter = getAllLevelData().length;
  assert(publicAfter === 31, `public levels mutated: ${publicAfter}`);
  assert(publicAfter === publicBefore, "public catalog count changed");

  setUserLevelsStorage(null);

  console.log(
    JSON.stringify(
      {
        ok: true,
        savedUserLevelId: pass.savedUserLevelId,
        score: pass.evaluatorResult?.score,
        difficulty: pass.evaluatorResult?.difficulty,
        publicLevels: publicAfter,
        genFailCode: genFail.errorCode,
        evalFailCode: evalFail.errorCode,
      },
      null,
      2,
    ),
  );
}

main();
