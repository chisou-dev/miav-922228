/**
 * Smoke: Auto CreatorIntent (Phase2-9).
 *
 * Confirms:
 * - targetText-only → full CreatorIntent
 * - Pipeline accepts that intent and can PASS → save UserLevel
 * - public getAllLevelData() stays 31
 *
 * Usage: npx tsx scripts/smoke-auto-intent.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import {
  createAutoCreatorIntent,
  tryCreateAutoCreatorIntent,
} from "@/games/binary-mosaic/creator/autoIntent";
import { runCreateUserLevelPipeline } from "@/games/binary-mosaic/pipeline/createUserLevel";
import {
  createMemoryUserLevelsKv,
  listUserLevels,
  setUserLevelsStorage,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 31, `expected 31 public levels, got ${publicBefore}`);

  // --- invalid text ---
  const bad = tryCreateAutoCreatorIntent("");
  assert(bad.ok === false, "empty text must fail");

  // --- auto intent from targetText only ---
  const intent = createAutoCreatorIntent("HI", { seed: 90210 });
  assert(intent.targetText === "HI", "targetText");
  assert(
    intent.boardSize.rows * intent.boardSize.cols === 16,
    `board must fit 16 bits, got ${intent.boardSize.rows}×${intent.boardSize.cols}`,
  );
  assert(intent.boardSize.cols === 8, "prefer campaign width 8");
  assert(intent.boardSize.rows === 2, "HI → 2×8");
  assert(intent.pieceCount >= 3 && intent.pieceCount <= 20, "pieceCount band");
  assert(intent.rotateQuota >= 0, "rotateQuota ≥ 0");
  assert(intent.hintAllowed === true, "hintAllowed default");
  assert(intent.seed === 90210, "seed from options");
  assert(intent.title === "User: HI", "default title");

  // determinism with seed
  const again = createAutoCreatorIntent("HI", { seed: 90210 });
  assert(
    JSON.stringify(again) === JSON.stringify(intent),
    "same seed+text must yield same intent",
  );

  console.log(
    "[auto-intent] decided fields:",
    JSON.stringify(
      {
        targetText: intent.targetText,
        boardSize: intent.boardSize,
        pieceCount: intent.pieceCount,
        rotateQuota: intent.rotateQuota,
        hintAllowed: intent.hintAllowed,
        seed: intent.seed,
        title: intent.title,
      },
      null,
      2,
    ),
  );

  // --- pipeline PASS path ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(listUserLevels().length === 0, "memory store should start empty");

  let pass = runCreateUserLevelPipeline(intent, {
    profile: EvaluationProfile.USER_LEVEL,
  });

  if (!pass.success) {
    for (const seed of [1111, 2222, 3333, 4444, 5555, 7777, 8888, 4242]) {
      const retry = createAutoCreatorIntent("HI", { seed });
      pass = runCreateUserLevelPipeline(retry, {
        profile: EvaluationProfile.USER_LEVEL,
      });
      if (pass.success) {
        console.log("[auto-intent] PASS with retry seed", seed, retry);
        break;
      }
    }
  }

  assert(pass.success, `PASS path failed: ${pass.errorCode} ${pass.message}`);
  assert(
    typeof pass.savedUserLevelId === "string" &&
      pass.savedUserLevelId.startsWith("user:"),
    "PASS must return savedUserLevelId",
  );
  assert(listUserLevels().length === 1, "PASS must persist exactly one user level");
  assert(!("seed" in (pass.levelData ?? {})), "LevelData must stay seed-free");

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
        intent: {
          boardSize: pass.intent.boardSize,
          pieceCount: pass.intent.pieceCount,
          rotateQuota: pass.intent.rotateQuota,
          seed: pass.intent.seed,
        },
      },
      null,
      2,
    ),
  );
}

main();
