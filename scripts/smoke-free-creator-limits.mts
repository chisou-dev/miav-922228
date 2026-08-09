/**
 * Local Free Creator checks: piece counts 3 / 5 / 8 with rotateQuota=1,
 * UNIQUE + evaluator PASS, save/import/share roundtrips.
 * Does not touch campaign levels.json.
 *
 * Usage: npx tsx scripts/smoke-free-creator-limits.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { usedPieceCount } from "@/games/binary-mosaic/core";
import { createAutoCreatorIntent } from "@/games/binary-mosaic/creator/autoIntent";
import {
  FREE_CREATOR_MAX_PIECES,
  FREE_CREATOR_MIN_PIECES,
  FREE_CREATOR_ROTATABLE_COUNT,
} from "@/games/binary-mosaic/creator/freeCreatorLimits";
import { runPreviewCandidates } from "@/games/binary-mosaic/pipeline/previewCandidates";
import {
  buildChallengeLink,
  decodeChallengeLinkPayload,
} from "@/games/binary-mosaic/progress/challengeLink";
import {
  encodeUserLevelShareCode,
  importUserLevelFromShareCode,
} from "@/games/binary-mosaic/progress/shareCode";
import {
  createMemoryUserLevelsKv,
  createUserLevel,
  listUserLevels,
  setUserLevelsStorage,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function tryGenerate(
  pieceCount: number,
  text: string,
  seeds: number[],
) {
  for (const seed of seeds) {
    const intent = createAutoCreatorIntent(text, {
      seed,
      pieceCount,
      rotateQuota: FREE_CREATOR_ROTATABLE_COUNT,
      hintAllowed: true,
    });
    assert(intent.pieceCount === pieceCount, `intent pcs ${intent.pieceCount}`);
    assert(
      intent.rotateQuota === FREE_CREATOR_ROTATABLE_COUNT,
      `intent rot ${intent.rotateQuota}`,
    );
    const preview = runPreviewCandidates(intent, {
      profile: EvaluationProfile.USER_LEVEL,
      candidateLimit: 24,
    });
    if (
      !preview.success ||
      !preview.selectedLevelData ||
      !preview.selectedEvaluatorResult?.passed
    ) {
      continue;
    }
    const level = preview.selectedLevelData;
    const rot = level.rotatablePieceIndices?.length ?? 0;
    const pcs = usedPieceCount(level);
    if (rot !== FREE_CREATOR_ROTATABLE_COUNT) continue;
    if (pcs !== pieceCount) continue;
    if (!preview.selectedEvaluatorResult.metrics.unique) continue;
    return { intent, preview, level, seed, text };
  }
  return null;
}

function main() {
  assert(FREE_CREATOR_MIN_PIECES === 3, "min");
  assert(FREE_CREATOR_MAX_PIECES === 8, "max");
  assert(FREE_CREATOR_ROTATABLE_COUNT === 1, "rot");

  setUserLevelsStorage(createMemoryUserLevelsKv());
  const seeds = [
    1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 101, 202, 303, 404, 505, 707, 1111,
    2222, 3333, 4242, 90210,
  ];
  const reports: Record<string, unknown>[] = [];

  const cases: { pcs: number; text: string }[] = [
    { pcs: 3, text: "HI" },
    { pcs: 5, text: "HELLO" },
    { pcs: 8, text: "HELLO" },
  ];

  for (const { pcs, text } of cases) {
    const hit = tryGenerate(pcs, text, seeds);
    assert(hit, `no PASS UNIQUE Free Creator level for ${pcs} pieces`);
    const { preview, level, seed } = hit;
    const rot = level.rotatablePieceIndices!.length;
    assert(rot === 1, `rotatable count ${rot}`);
    assert(preview.selectedEvaluatorResult!.passed, "eval pass");
    assert(preview.selectedEvaluatorResult!.metrics.unique, "unique");
    assert(preview.selectedEvaluatorResult!.metrics.solvable, "solvable");

    const saved = createUserLevel({
      levelData: level,
      creatorIntent: preview.intent,
      seed: preview.intent.seed,
      evaluationProfile: preview.profile,
      evaluatorResult: preview.selectedEvaluatorResult!,
      creatorName: "FreeSmoke",
      title: `Free ${pcs}`,
      description: "smoke",
      hintLimit: 3,
    });
    assert(saved.ok, `save failed for ${pcs}`);

    const share = encodeUserLevelShareCode(saved.record);
    const imported = importUserLevelFromShareCode(share);
    assert(imported.ok, `share import failed for ${pcs}`);
    assert(
      (imported.record.levelData.rotatablePieceIndices?.length ?? 0) === 1,
      "share keeps rot=1",
    );

    const link = buildChallengeLink(saved.record);
    assert(link.ok, `challenge encode failed for ${pcs}`);
    const decoded = decodeChallengeLinkPayload(link.payload);
    assert(decoded.ok, `challenge decode failed for ${pcs}`);
    assert(
      (decoded.record.levelData.rotatablePieceIndices?.length ?? 0) === 1,
      "challenge keeps rot",
    );

    reports.push({
      pieces: pcs,
      text,
      seed,
      unique: true,
      rotatable: rot,
      evalPassed: true,
      savedUserLevelId: saved.record.userLevelId,
      shareOk: true,
      challengeOk: true,
    });
  }

  // Legacy multi-rotate UserLevel must still import (not Free-clamped on load).
  const legacyIntent = createAutoCreatorIntent("WORLD", {
    seed: 424242,
    pieceCount: 10,
    rotateQuota: 3,
  });
  // Generator may still produce this for non-Free callers.
  assert(legacyIntent.pieceCount === 10, "generator still accepts 10");
  assert(legacyIntent.rotateQuota === 3, "generator still accepts rot=3");

  assert(listUserLevels().length === 3, "three Free saves");
  setUserLevelsStorage(null);

  console.log(JSON.stringify({ ok: true, reports }, null, 2));
}

main();
