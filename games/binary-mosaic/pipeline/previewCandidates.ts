/**
 * Creator preview pipeline (Phase2-15) — orchestration only, no save.
 *
 * Flow: CreatorIntent → generateLevelCandidates → each (solve → evaluate) →
 *       select best among passed → PreviewCandidatesResult (no createUserLevel)
 *
 * Ranking matches selectBestCandidate via its exported pure helpers
 * (comparePassedCandidates includes Phase2-17 generation quality).
 * Does not touch public catalog / Session.
 * No React / UI / audio / network.
 */

import {
  EvaluationProfile,
  evaluateLevel,
  generateLevelCandidates,
  solveLevel,
  type CreatorIntent,
  type EvaluateLevelOptions,
  type EvaluatorResult,
  type GeneratorError,
  type LevelData,
  type SolverResult,
} from "@/games/binary-mosaic/core";
import {
  DEFAULT_CANDIDATE_LIMIT,
  selectBestPassedCandidate,
  type CandidateEvaluation,
} from "@/games/binary-mosaic/pipeline/selectBestCandidate";

// ---------------------------------------------------------------------------
// Error codes / result
// ---------------------------------------------------------------------------

export const PreviewErrorCode = {
  GENERATE_FAILED: "GENERATE_FAILED",
  /** At least one LevelData was produced, but none passed evaluation. */
  NO_PASSING_CANDIDATE: "NO_PASSING_CANDIDATE",
} as const;

export type PreviewErrorCode =
  (typeof PreviewErrorCode)[keyof typeof PreviewErrorCode];

export type PreviewCandidatesResult = {
  success: boolean;
  intent: CreatorIntent;
  profile: EvaluationProfile;
  /** Best among passed candidates (only when success). */
  selectedLevelData?: LevelData;
  selectedSolverResult?: SolverResult;
  selectedEvaluatorResult?: EvaluatorResult;
  /** Index into `candidates` of the selected entry. */
  selectedIndex?: number;
  /** All evaluated candidates (comparison info on fail / success). */
  candidates?: CandidateEvaluation[];
  errorCode?: PreviewErrorCode;
  /** Generator errors when generate failed; otherwise light notes. */
  errors?: GeneratorError[];
  message?: string;
};

export type RunPreviewCandidatesOptions = {
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
};

export type { CandidateEvaluation };

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Generate multiple LevelData candidates, solve+evaluate each, select best.
 * Does **not** call createUserLevel / save — Creator UI saves explicitly.
 */
export function runPreviewCandidates(
  intent: CreatorIntent,
  options: RunPreviewCandidatesOptions = {},
): PreviewCandidatesResult {
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
      errorCode: PreviewErrorCode.GENERATE_FAILED,
      errors: gen.errors,
      message:
        gen.errors[0]?.message ?? "generateLevelCandidates produced no candidate",
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
      errorCode: PreviewErrorCode.NO_PASSING_CANDIDATE,
      errors: gen.errors.length > 0 ? gen.errors : undefined,
      message: `No candidate passed evaluation (${candidates.length} evaluated)`,
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
    candidates,
  };
}
