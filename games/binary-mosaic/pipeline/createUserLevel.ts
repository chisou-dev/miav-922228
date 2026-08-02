/**
 * User-level generation pipeline (Phase2-8) — orchestration only.
 *
 * Flow: CreatorIntent → generateLevel → solveLevel → evaluateLevel →
 *       (PASS) createUserLevel → PipelineResult
 *
 * Does not reimplement Generator / Solver / Evaluator.
 * Does not mutate LevelData schema or touch the public catalog.
 * No React / UI / audio / network.
 */

import {
  EvaluationProfile,
  EvaluatorReasonCode,
  evaluateLevel,
  generateLevel,
  solveLevel,
  type CreatorIntent,
  type EvaluateLevelOptions,
  type EvaluatorResult,
  type GeneratorError,
  type LevelData,
  type SolverResult,
} from "@/games/binary-mosaic/core";
import {
  createUserLevel,
  type CreateUserLevelResult,
} from "@/games/binary-mosaic/progress/userLevels";

// ---------------------------------------------------------------------------
// Error codes / result
// ---------------------------------------------------------------------------

export const PipelineErrorCode = {
  GENERATE_FAILED: "GENERATE_FAILED",
  NOT_UNIQUE: "NOT_UNIQUE",
  EVAL_FAILED: "EVAL_FAILED",
  SAVE_FAILED: "SAVE_FAILED",
} as const;

export type PipelineErrorCode =
  (typeof PipelineErrorCode)[keyof typeof PipelineErrorCode];

export type PipelineResult = {
  success: boolean;
  intent: CreatorIntent;
  profile: EvaluationProfile;
  levelData?: LevelData;
  solverResult?: SolverResult;
  evaluatorResult?: EvaluatorResult;
  /** Present only when a UserLevel was persisted. */
  savedUserLevelId?: string;
  errorCode?: PipelineErrorCode;
  /** Generator errors when generate failed; otherwise light notes. */
  errors?: GeneratorError[];
  message?: string;
  /** Raw createUserLevel failure reason when SAVE_FAILED. */
  saveReason?: Extract<CreateUserLevelResult, { ok: false }>["reason"];
};

export type RunCreateUserLevelPipelineOptions = {
  /** Default USER_LEVEL for Creator / user-submitted levels. */
  profile?: EvaluationProfile;
  /** Optional evaluateLevel threshold overrides. */
  thresholds?: EvaluateLevelOptions["thresholds"];
  /** Solver solutionLimit (default 3, matches CreatorPanel). */
  solutionLimit?: number;
  /** Optional fixed id / timestamp for createUserLevel (tests). */
  userLevelId?: string;
  createdAt?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evalErrorCode(result: EvaluatorResult): PipelineErrorCode {
  if (result.reasons.includes(EvaluatorReasonCode.NOT_UNIQUE)) {
    return PipelineErrorCode.NOT_UNIQUE;
  }
  return PipelineErrorCode.EVAL_FAILED;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run generate → solve → evaluate → (PASS) save UserLevel.
 * On any failure, returns results gathered so far and does **not** save.
 */
export function runCreateUserLevelPipeline(
  intent: CreatorIntent,
  options: RunCreateUserLevelPipelineOptions = {},
): PipelineResult {
  const profile = options.profile ?? EvaluationProfile.USER_LEVEL;
  const solutionLimit = options.solutionLimit ?? 3;

  const gen = generateLevel(intent);
  if (!gen.ok || gen.candidates.length < 1) {
    return {
      success: false,
      intent,
      profile,
      errorCode: PipelineErrorCode.GENERATE_FAILED,
      errors: gen.errors,
      message: gen.errors[0]?.message ?? "generateLevel produced no candidate",
    };
  }

  const levelData = gen.candidates[0].level;
  const solverResult = solveLevel(levelData, { solutionLimit });
  const evaluatorResult = evaluateLevel(levelData, solverResult, {
    profile,
    thresholds: options.thresholds,
  });

  if (!evaluatorResult.passed) {
    return {
      success: false,
      intent,
      profile,
      levelData,
      solverResult,
      evaluatorResult,
      errorCode: evalErrorCode(evaluatorResult),
      message: `evaluateLevel failed: ${evaluatorResult.reasons.join(", ") || "not passed"}`,
    };
  }

  const saved = createUserLevel({
    levelData,
    creatorIntent: intent,
    seed: intent.seed,
    evaluationProfile: profile,
    evaluatorResult,
    userLevelId: options.userLevelId,
    createdAt: options.createdAt,
  });

  if (!saved.ok) {
    return {
      success: false,
      intent,
      profile,
      levelData,
      solverResult,
      evaluatorResult,
      errorCode: PipelineErrorCode.SAVE_FAILED,
      saveReason: saved.reason,
      message: `createUserLevel failed: ${saved.reason}`,
    };
  }

  return {
    success: true,
    intent,
    profile,
    levelData,
    solverResult,
    evaluatorResult,
    savedUserLevelId: saved.record.userLevelId,
  };
}
