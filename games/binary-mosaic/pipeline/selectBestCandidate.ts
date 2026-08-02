/**
 * Candidate selection pipeline (Phase2-14) — orchestration only.
 *
 * Flow: CreatorIntent → generateLevelCandidates → each (solve → evaluate) →
 *       select best among passed → (PASS) createUserLevel → CandidatePipelineResult
 *
 * Ranking (comparePassedCandidates) includes Phase2-17 generation quality as a
 * soft tie-break among passed candidates — does not change Evaluator gates.
 *
 * Sibling to createUserLevel.ts — does not change that module's responsibilities.
 * Does not reimplement Generator / Solver / Evaluator.
 * Does not mutate LevelData schema or touch the public catalog.
 * No React / UI / audio / network.
 */

import {
  EvaluationProfile,
  evaluateLevel,
  generateLevelCandidates,
  solveLevel,
  type CreatorIntent,
  type EvaluateLevelOptions,
  type EvaluatorDifficulty,
  type EvaluatorResult,
  type GeneratorError,
  type LevelData,
  type SolverResult,
} from "@/games/binary-mosaic/core";
import {
  createUserLevel,
  type CreateUserLevelResult,
} from "@/games/binary-mosaic/progress/userLevels";
import { assessGenerationQuality } from "@/games/binary-mosaic/puzzle/generationQuality";

// ---------------------------------------------------------------------------
// Error codes / result
// ---------------------------------------------------------------------------

export const CandidatePipelineErrorCode = {
  GENERATE_FAILED: "GENERATE_FAILED",
  /** At least one LevelData was produced, but none passed evaluation. */
  NO_PASSING_CANDIDATE: "NO_PASSING_CANDIDATE",
  SAVE_FAILED: "SAVE_FAILED",
} as const;

export type CandidatePipelineErrorCode =
  (typeof CandidatePipelineErrorCode)[keyof typeof CandidatePipelineErrorCode];

/** One generated candidate after Solver + Evaluator. */
export type CandidateEvaluation = {
  index: number;
  levelData: LevelData;
  solverResult: SolverResult;
  evaluatorResult: EvaluatorResult;
};

export type CandidatePipelineResult = {
  success: boolean;
  intent: CreatorIntent;
  profile: EvaluationProfile;
  /** Best among passed candidates (only when success, or when save failed after pick). */
  selectedLevelData?: LevelData;
  selectedSolverResult?: SolverResult;
  selectedEvaluatorResult?: EvaluatorResult;
  /** Index into `candidates` of the selected entry. */
  selectedIndex?: number;
  /** Present only when a UserLevel was persisted. */
  savedUserLevelId?: string;
  /** All evaluated candidates (comparison info on fail / success). */
  candidates?: CandidateEvaluation[];
  errorCode?: CandidatePipelineErrorCode;
  /** Generator errors when generate failed; otherwise light notes. */
  errors?: GeneratorError[];
  message?: string;
  /** Raw createUserLevel failure reason when SAVE_FAILED. */
  saveReason?: Extract<CreateUserLevelResult, { ok: false }>["reason"];
};

export type RunCandidateSelectionPipelineOptions = {
  /** Default USER_LEVEL for Creator / user-submitted levels. */
  profile?: EvaluationProfile;
  /**
   * How many LevelData candidates to request from generateLevelCandidates.
   * Passed through as CreatorIntent.candidateLimit (generator clamps 1–16).
   * Default: 4 (or intent.candidateLimit if set).
   */
  candidateLimit?: number;
  /** Optional evaluateLevel threshold overrides. */
  thresholds?: EvaluateLevelOptions["thresholds"];
  /** Solver solutionLimit (default 3, matches createUserLevel pipeline). */
  solutionLimit?: number;
  /** Optional fixed id / timestamp for createUserLevel (tests). */
  userLevelId?: string;
  createdAt?: string;
};

/** Default when neither options nor intent specify candidateLimit. */
export const DEFAULT_CANDIDATE_LIMIT = 4;

/**
 * Mid piece-count preference for balance scoring.
 * Soft evaluator band is roughly [2, 24]; mid ≈ 13.
 */
const PIECE_COUNT_BALANCE_MID = 13;

// ---------------------------------------------------------------------------
// Selection ranking (among passed EvaluatorResults only)
// ---------------------------------------------------------------------------

/**
 * Difficulty preference: medium > hard > easy.
 * (Prefer a satisfying challenge over trivial or extreme.)
 */
function difficultyRank(d: EvaluatorDifficulty): number {
  switch (d) {
    case "medium":
      return 2;
    case "hard":
      return 1;
    case "easy":
      return 0;
  }
}

/**
 * Piece-balance score (higher better):
 * - lower barPieceRate preferred
 * - pieceCount closer to mid band preferred
 */
function pieceBalanceScore(result: EvaluatorResult): number {
  const { barPieceRate, pieceCount } = result.metrics;
  const barPart = 1 - barPieceRate;
  const countPart =
    1 - Math.min(1, Math.abs(pieceCount - PIECE_COUNT_BALANCE_MID) / PIECE_COUNT_BALANCE_MID);
  return barPart * 0.7 + countPart * 0.3;
}

/**
 * Compare two passed candidates. Returns &lt; 0 if `a` is better than `b`.
 *
 * Priority:
 * 1. Evaluator score (higher)
 * 2. Difficulty band (medium preferred)
 * 3. rotationMeaningful === true preferred
 * 4. Generation quality score (higher — less clustered / ordered; Phase2-17)
 * 5. Piece balance (lower bar rate / mid pieceCount)
 * 6. Stable index (lower index wins ties)
 *
 * Generation quality does **not** replace Evaluator PASS/FAIL; it only
 * ranks among candidates that already passed.
 */
export function comparePassedCandidates(
  a: CandidateEvaluation,
  b: CandidateEvaluation,
): number {
  const ea = a.evaluatorResult;
  const eb = b.evaluatorResult;

  if (eb.score !== ea.score) return eb.score - ea.score;

  const diffA = difficultyRank(ea.difficulty);
  const diffB = difficultyRank(eb.difficulty);
  if (diffB !== diffA) return diffB - diffA;

  const rotA = ea.metrics.rotationMeaningful ? 1 : 0;
  const rotB = eb.metrics.rotationMeaningful ? 1 : 0;
  if (rotB !== rotA) return rotB - rotA;

  const gqA = assessGenerationQuality(a.levelData, a.solverResult).score;
  const gqB = assessGenerationQuality(b.levelData, b.solverResult).score;
  if (gqB !== gqA) return gqB - gqA;

  const balA = pieceBalanceScore(ea);
  const balB = pieceBalanceScore(eb);
  if (balB !== balA) return balB - balA;

  return a.index - b.index;
}

/** Pick best among passed candidates; `undefined` if none passed. */
export function selectBestPassedCandidate(
  candidates: CandidateEvaluation[],
): CandidateEvaluation | undefined {
  const passed = candidates.filter((c) => c.evaluatorResult.passed);
  if (passed.length === 0) return undefined;
  let best = passed[0];
  for (let i = 1; i < passed.length; i += 1) {
    if (comparePassedCandidates(passed[i], best) < 0) {
      best = passed[i];
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Generate multiple LevelData candidates, solve+evaluate each, select best,
 * and save a UserLevel when the best passes.
 *
 * If no candidate passes evaluation, does **not** save; returns failure with
 * all candidate comparison results.
 */
export function runCandidateSelectionPipeline(
  intent: CreatorIntent,
  options: RunCandidateSelectionPipelineOptions = {},
): CandidatePipelineResult {
  const profile = options.profile ?? EvaluationProfile.USER_LEVEL;
  const solutionLimit = options.solutionLimit ?? 3;
  const candidateLimit =
    options.candidateLimit ?? intent.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;

  const gen = generateLevelCandidates({ ...intent, candidateLimit });
  if (!gen.ok || gen.candidates.length < 1) {
    return {
      success: false,
      intent,
      profile,
      errorCode: CandidatePipelineErrorCode.GENERATE_FAILED,
      errors: gen.errors,
      message: gen.errors[0]?.message ?? "generateLevelCandidates produced no candidate",
    };
  }

  const candidates: CandidateEvaluation[] = gen.candidates.map((cand, index) => {
    const levelData = cand.level;
    const solverResult = solveLevel(levelData, { solutionLimit });
    const evaluatorResult = evaluateLevel(levelData, solverResult, {
      profile,
      thresholds: options.thresholds,
    });
    return { index, levelData, solverResult, evaluatorResult };
  });

  const best = selectBestPassedCandidate(candidates);
  if (!best) {
    return {
      success: false,
      intent,
      profile,
      candidates,
      errorCode: CandidatePipelineErrorCode.NO_PASSING_CANDIDATE,
      errors: gen.errors.length > 0 ? gen.errors : undefined,
      message: `No candidate passed evaluation (${candidates.length} evaluated)`,
    };
  }

  const saved = createUserLevel({
    levelData: best.levelData,
    creatorIntent: intent,
    seed: intent.seed,
    evaluationProfile: profile,
    evaluatorResult: best.evaluatorResult,
    userLevelId: options.userLevelId,
    createdAt: options.createdAt,
  });

  if (!saved.ok) {
    return {
      success: false,
      intent,
      profile,
      selectedLevelData: best.levelData,
      selectedSolverResult: best.solverResult,
      selectedEvaluatorResult: best.evaluatorResult,
      selectedIndex: best.index,
      candidates,
      errorCode: CandidatePipelineErrorCode.SAVE_FAILED,
      saveReason: saved.reason,
      message: `createUserLevel failed: ${saved.reason}`,
    };
  }

  return {
    success: true,
    intent,
    profile,
    selectedLevelData: best.levelData,
    selectedSolverResult: best.solverResult,
    selectedEvaluatorResult: best.evaluatorResult,
    selectedIndex: best.index,
    savedUserLevelId: saved.record.userLevelId,
    candidates,
  };
}
