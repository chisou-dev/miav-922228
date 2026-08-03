/**
 * Smoke: Candidate selection pipeline (Phase2-14).
 *
 * Confirms:
 * - Multiple candidates generated + evaluated
 * - Best selected among passed
 * - PASS path saves a UserLevel
 * - public getAllLevelData() stays 31
 *
 * Usage: npx tsx scripts/smoke-candidate-pipeline.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import type { CreatorIntent } from "@/games/binary-mosaic/core/generator";
import {
  CandidatePipelineErrorCode,
  DEFAULT_CANDIDATE_LIMIT,
  runCandidateSelectionPipeline,
  selectBestPassedCandidate,
} from "@/games/binary-mosaic/pipeline/selectBestCandidate";
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
  title: "Smoke candidate pipeline",
  draftId: 0,
};

const CANDIDATE_LIMIT = 4;

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 31, `expected 31 public levels, got ${publicBefore}`);

  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(listUserLevels().length === 0, "memory store should start empty");

  // --- GENERATE_FAILED: invalid intent, no save ---
  const genFail = runCandidateSelectionPipeline(
    { ...BASE_INTENT, pieceCount: 0, targetText: "" },
    { candidateLimit: CANDIDATE_LIMIT },
  );
  assert(genFail.success === false, "invalid intent must fail");
  assert(
    genFail.errorCode === CandidatePipelineErrorCode.GENERATE_FAILED,
    `expected GENERATE_FAILED, got ${genFail.errorCode}`,
  );
  assert(genFail.savedUserLevelId === undefined, "gen fail must not save id");
  assert(listUserLevels().length === 0, "gen fail must not increase store");

  // --- NO_PASSING_CANDIDATE: force eval fail, still return all candidates ---
  const evalFail = runCandidateSelectionPipeline(BASE_INTENT, {
    profile: EvaluationProfile.USER_LEVEL,
    candidateLimit: CANDIDATE_LIMIT,
    thresholds: { minPieceCount: 99 },
  });
  assert(evalFail.success === false, "forced eval must fail");
  assert(
    evalFail.errorCode === CandidatePipelineErrorCode.NO_PASSING_CANDIDATE,
    `expected NO_PASSING_CANDIDATE, got ${evalFail.errorCode}`,
  );
  assert(
    (evalFail.candidates?.length ?? 0) >= 2,
    `expected multiple evaluated candidates, got ${evalFail.candidates?.length}`,
  );
  assert(
    evalFail.candidates?.every((c) => c.evaluatorResult.passed === false),
    "forced thresholds must fail every candidate",
  );
  assert(evalFail.savedUserLevelId === undefined, "eval fail must not save");
  assert(listUserLevels().length === 0, "eval fail must not increase store");
  assert(
    selectBestPassedCandidate(evalFail.candidates ?? []) === undefined,
    "no passed → selectBest undefined",
  );

  // --- PASS path: multiple candidates, best selected, save ---
  let pass = runCandidateSelectionPipeline(BASE_INTENT, {
    profile: EvaluationProfile.USER_LEVEL,
    candidateLimit: CANDIDATE_LIMIT,
  });

  if (!pass.success) {
    for (const seed of [1111, 2222, 3333, 4444, 5555, 7777, 8888, 4242]) {
      pass = runCandidateSelectionPipeline(
        { ...BASE_INTENT, seed },
        {
          profile: EvaluationProfile.USER_LEVEL,
          candidateLimit: CANDIDATE_LIMIT,
        },
      );
      if (pass.success) break;
    }
  }

  assert(pass.success, `PASS path failed: ${pass.errorCode} ${pass.message}`);
  assert(
    (pass.candidates?.length ?? 0) >= 2,
    `PASS should evaluate multiple candidates, got ${pass.candidates?.length}`,
  );
  assert(pass.selectedLevelData !== undefined, "PASS must include selectedLevelData");
  assert(pass.selectedSolverResult !== undefined, "PASS must include selectedSolverResult");
  assert(
    pass.selectedEvaluatorResult?.passed === true,
    "PASS selected evaluator must pass",
  );
  assert(
    typeof pass.selectedIndex === "number" &&
      pass.candidates?.[pass.selectedIndex]?.evaluatorResult.passed === true,
    "selectedIndex must point at a passed candidate",
  );

  const picked = selectBestPassedCandidate(pass.candidates ?? []);
  assert(picked !== undefined, "selectBest must find a passed candidate");
  assert(
    picked.index === pass.selectedIndex,
    "orchestrator selection must match selectBestPassedCandidate",
  );

  assert(
    typeof pass.savedUserLevelId === "string" &&
      pass.savedUserLevelId.startsWith("user:"),
    "PASS must return savedUserLevelId",
  );
  assert(!("seed" in (pass.selectedLevelData ?? {})), "LevelData must stay seed-free");
  assert(listUserLevels().length === 1, "PASS must persist exactly one user level");
  assert(
    listUserLevels()[0].userLevelId === pass.savedUserLevelId,
    "stored id mismatch",
  );

  const publicAfter = getAllLevelData().length;
  assert(publicAfter === 31, `public levels mutated: ${publicAfter}`);
  assert(publicAfter === publicBefore, "public catalog count changed");
  assert(DEFAULT_CANDIDATE_LIMIT === 4, "default candidate limit sanity");

  setUserLevelsStorage(null);

  const summary = (pass.candidates ?? []).map((c) => ({
    index: c.index,
    passed: c.evaluatorResult.passed,
    score: c.evaluatorResult.score,
    difficulty: c.evaluatorResult.difficulty,
    rotationMeaningful: c.evaluatorResult.metrics.rotationMeaningful,
    barPieceRate: c.evaluatorResult.metrics.barPieceRate,
    selected: c.index === pass.selectedIndex,
  }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        candidateLimit: CANDIDATE_LIMIT,
        evaluated: pass.candidates?.length,
        selectedIndex: pass.selectedIndex,
        savedUserLevelId: pass.savedUserLevelId,
        score: pass.selectedEvaluatorResult?.score,
        difficulty: pass.selectedEvaluatorResult?.difficulty,
        publicLevels: publicAfter,
        genFailCode: genFail.errorCode,
        evalFailCode: evalFail.errorCode,
        candidates: summary,
      },
      null,
      2,
    ),
  );
}

main();
