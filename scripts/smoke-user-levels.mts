/**
 * Smoke: UserLevel storage (Phase2-5).
 *
 * Pipeline: generate → solve → evaluate(USER_LEVEL) → createUserLevel → reload.
 * Confirms public getAllLevelData() stays 30 / unaffected.
 *
 * Usage: npx tsx scripts/smoke-user-levels.mts
 */
import {
  generateLevel,
  type CreatorIntent,
} from "@/games/binary-mosaic/core/generator";
import {
  EvaluationProfile,
  evaluateLevel,
} from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import { solveLevel } from "@/games/binary-mosaic/core/solver";
import {
  BINARY_BLOCK_USER_LEVELS_KEY,
  createMemoryUserLevelsKv,
  createUserLevel,
  DEFAULT_CREATOR_NAME,
  DEFAULT_PUBLISH_TITLE,
  DEVELOPER_CREDIT,
  deleteUserLevel,
  getUserLevel,
  listUserLevels,
  loadUserLevels,
  setUserLevelsStorage,
  USER_LEVELS_SCHEMA_VERSION,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 30, `expected 30 public levels, got ${publicBefore}`);

  setUserLevelsStorage(createMemoryUserLevelsKv());

  const intent: CreatorIntent = {
    targetText: "HI",
    boardSize: { rows: 2, cols: 8 },
    pieceCount: 3,
    rotateQuota: 1,
    hintAllowed: true,
    seed: 90210,
    title: "Smoke user level",
    draftId: 0,
  };

  const gen = generateLevel(intent);
  assert(gen.ok && gen.candidates.length >= 1, `generate failed: ${JSON.stringify(gen.errors)}`);

  const levelData = gen.candidates[0].level;
  assert(!("seed" in levelData), "seed must not appear on LevelData");

  const solved = solveLevel(levelData, { solutionLimit: 3 });
  assert(solved.solvable, `generated level not solvable: ${solved.status}`);

  const evaluated = evaluateLevel(levelData, solved, {
    profile: EvaluationProfile.USER_LEVEL,
  });

  // Gate: must not save when not passed
  if (!evaluated.passed) {
    const rejected = createUserLevel({
      levelData,
      creatorIntent: intent,
      seed: intent.seed,
      evaluationProfile: EvaluationProfile.USER_LEVEL,
      evaluatorResult: evaluated,
    });
    assert(rejected.ok === false && rejected.reason === "NOT_PASSED", "must reject !passed");
    console.warn(
      "warn: USER_LEVEL evaluate did not pass for HI sample; retrying softer seed pack…",
      evaluated.reasons,
    );
  }

  // Prefer a passed candidate; fall back to a few alternate seeds
  let passedEval = evaluated.passed ? evaluated : null;
  let passedLevel = evaluated.passed ? levelData : null;
  let passedIntent = intent;
  let passedSeed = intent.seed;

  if (!passedEval) {
    for (const seed of [1111, 2222, 3333, 4444, 5555, 7777, 8888]) {
      const altIntent: CreatorIntent = { ...intent, seed };
      const altGen = generateLevel(altIntent);
      if (!altGen.ok || altGen.candidates.length < 1) continue;
      const altLevel = altGen.candidates[0].level;
      const altSolved = solveLevel(altLevel, { solutionLimit: 3 });
      if (!altSolved.solvable) continue;
      const altEval = evaluateLevel(altLevel, altSolved, {
        profile: EvaluationProfile.USER_LEVEL,
      });
      if (altEval.passed) {
        passedEval = altEval;
        passedLevel = altLevel;
        passedIntent = altIntent;
        passedSeed = seed;
        break;
      }
    }
  }

  assert(passedEval && passedLevel, "could not produce a USER_LEVEL-passed candidate");

  const created = createUserLevel({
    levelData: passedLevel,
    creatorIntent: passedIntent,
    seed: passedSeed,
    evaluationProfile: EvaluationProfile.USER_LEVEL,
    evaluatorResult: passedEval,
  });
  assert(created.ok, `createUserLevel failed: ${JSON.stringify(created)}`);
  assert(created.record.userLevelId.startsWith("user:"), "id must be user:<uuid>");
  assert(created.record.evaluatorResult.passed === true, "stored result must be passed");
  assert(created.record.seed === passedSeed, "seed mismatch");
  assert(
    created.record.evaluationProfile === EvaluationProfile.USER_LEVEL,
    "profile mismatch",
  );
  assert(!("seed" in created.record.levelData), "LevelData must stay seed-free");
  assert(
    created.record.creatorName === DEFAULT_CREATOR_NAME,
    "omitted creatorName must default",
  );
  assert(
    created.record.developerCredit === DEVELOPER_CREDIT,
    "developerCredit must be fixed",
  );
  assert(
    created.record.title === passedLevel.title ||
      created.record.title === DEFAULT_PUBLISH_TITLE,
    "publish title must come from levelData.title or default",
  );
  assert(created.record.description === "", "publish description default");
  assert(created.record.published === false, "published default false");
  assert(created.record.publishedAt === null, "publishedAt default null");

  const reloaded = loadUserLevels();
  assert(reloaded.schemaVersion === USER_LEVELS_SCHEMA_VERSION, "schemaVersion");
  assert(reloaded.levels.length === 1, "expected 1 stored level");

  const byId = getUserLevel(created.record.userLevelId);
  assert(byId, "getUserLevel miss");
  assert(byId.userLevelId === created.record.userLevelId, "id round-trip");
  assert(byId.creatorIntent.targetText === passedIntent.targetText, "intent round-trip");
  assert(byId.evaluatorResult.score === passedEval.score, "score round-trip");
  assert(listUserLevels().length === 1, "listUserLevels");

  // Reject duplicate gate still works for a failed snapshot
  const failSnap = {
    ...passedEval,
    passed: false,
  };
  const blocked = createUserLevel({
    levelData: passedLevel,
    creatorIntent: passedIntent,
    seed: passedSeed,
    evaluationProfile: EvaluationProfile.USER_LEVEL,
    evaluatorResult: failSnap,
  });
  assert(blocked.ok === false && blocked.reason === "NOT_PASSED", "gate must block");

  assert(deleteUserLevel(created.record.userLevelId).ok === true, "delete failed");
  assert(listUserLevels().length === 0, "store should be empty after delete");
  assert(getUserLevel(created.record.userLevelId) === undefined, "deleted id still present");

  const publicAfter = getAllLevelData().length;
  assert(publicAfter === 30, `public levels mutated: ${publicAfter}`);
  assert(publicAfter === publicBefore, "public catalog count changed");

  setUserLevelsStorage(null);

  console.log(
    JSON.stringify(
      {
        ok: true,
        key: BINARY_BLOCK_USER_LEVELS_KEY,
        userLevelId: created.record.userLevelId,
        seed: passedSeed,
        score: passedEval.score,
        difficulty: passedEval.difficulty,
        publicLevels: publicAfter,
        schemaVersion: USER_LEVELS_SCHEMA_VERSION,
      },
      null,
      2,
    ),
  );
}

main();
