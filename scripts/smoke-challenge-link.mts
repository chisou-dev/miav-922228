/**
 * Smoke: Direct Challenge Link encode → decode (no auto-save) → optional save.
 *
 * Does NOT call Generator / Solver / Evaluator / network.
 * Simulates "second context" by decoding a generated production-style URL.
 *
 * Usage: npx tsx scripts/smoke-challenge-link.mts
 */
import {
  buildChallengeLink,
  CHALLENGE_FRAGMENT_KEY,
  CHALLENGE_LINK_ORIGIN,
  CHALLENGE_LINK_PATH,
  decodeChallengeLinkPayload,
  MAX_CHALLENGE_LINK_LENGTH,
  readChallengePayloadFromHash,
} from "@/games/binary-mosaic/progress/challengeLink";
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import {
  createMemoryUserLevelsKv,
  DEVELOPER_CREDIT,
  exportUserLevelJson,
  getUserLevel,
  importUserLevelJson,
  listUserLevels,
  parseUserLevelJson,
  setUserLevelsStorage,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function makeFixture(overrides?: Partial<UserLevelRecord>): UserLevelRecord {
  return {
    userLevelId: "user:challenge-link-smoke-1",
    creatorIntent: {
      targetText: "HI",
      boardSize: { rows: 1, cols: 8 },
      pieceCount: 2,
      rotateQuota: 0,
      hintAllowed: false,
      seed: 77,
      title: "Challenge Link smoke",
      draftId: 0,
    },
    levelData: {
      id: 0,
      title: "Challenge Link smoke",
      rows: 1,
      cols: 8,
      frame: "rect",
      targetText: "HI",
      bits: [[0, 1, 0, 0, 1, 0, 0, 1]],
      solution: [[0, 0, 0, 0, 1, 1, 1, 1]],
      hintAllowed: false,
    },
    seed: 77,
    evaluationProfile: EvaluationProfile.USER_LEVEL,
    evaluatorResult: {
      passed: true,
      score: 80,
      difficulty: "medium",
      metrics: {
        unique: true,
        solvable: true,
        solverStatus: "UNIQUE",
        pieceCount: 2,
        maxPieceSize: 4,
        barPieceRate: 1,
        barPieceCount: 2,
        iBarCount: 1,
        exploredNodes: 4,
        elapsedTimeMs: 1,
        activeCellCount: 8,
        rotatablePieceCount: 0,
        meaningfulRotatableCount: 0,
        rotationMeaningful: true,
      },
      reasons: [],
      profile: EvaluationProfile.USER_LEVEL,
    },
    createdAt: "2026-08-02T00:00:00.000Z",
    creatorName: "Smoke Creator",
    developerCredit: DEVELOPER_CREDIT,
    title: "Challenge Link smoke",
    description: "",
    published: false,
    publishedAt: null,
    ...overrides,
  };
}

function makeLargeFixture(): UserLevelRecord {
  const rows = 12;
  const cols = 16;
  const bits = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ((r + c) % 2 === 0 ? 1 : 0) as 0 | 1),
  );
  const solution = bits.map((row, r) =>
    row.map((_, c) => ((r * cols + c) % 8) as number),
  );
  return makeFixture({
    userLevelId: "user:challenge-link-large",
    creatorIntent: {
      targetText: "ABCDEFGH",
      boardSize: { rows, cols },
      pieceCount: 24,
      rotateQuota: 4,
      hintAllowed: true,
      seed: 99,
      title: "Large challenge",
      draftId: 0,
    },
    levelData: {
      id: 0,
      title: "Large challenge",
      rows,
      cols,
      frame: "rect",
      targetText: "ABCDEFGH",
      bits,
      solution,
      hintAllowed: true,
      rotatablePieceIndices: [0, 1, 2, 3],
    },
    seed: 99,
    title: "Large challenge",
  });
}

function main(): void {
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const original = makeFixture();

  const built = buildChallengeLink(original, {
    baseUrl: `${CHALLENGE_LINK_ORIGIN}${CHALLENGE_LINK_PATH}`,
  });
  assert(built.ok, `build failed: ${JSON.stringify(built)}`);
  assert(
    built.url.startsWith(
      `${CHALLENGE_LINK_ORIGIN}${CHALLENGE_LINK_PATH}#${CHALLENGE_FRAGMENT_KEY}=`,
    ),
    `url shape: ${built.url.slice(0, 80)}`,
  );
  assert(
    !built.url.includes("?"),
    "Challenge Link must not use query params for payload",
  );
  assert(
    built.length <= MAX_CHALLENGE_LINK_LENGTH,
    `typical link too long: ${built.length}`,
  );

  console.log(`MAX_CHALLENGE_LINK_LENGTH=${MAX_CHALLENGE_LINK_LENGTH}`);
  console.log(`typical_link_length=${built.length}`);
  console.log(`typical_payload_length=${built.payload.length}`);

  // Second-context simulation: parse hash from absolute URL
  const hash = built.url.slice(built.url.indexOf("#"));
  const fromHash = readChallengePayloadFromHash(hash);
  assert(fromHash === built.payload, "hash extract must match payload");

  const decoded = decodeChallengeLinkPayload(fromHash!);
  assert(decoded.ok, `decode failed: ${JSON.stringify(decoded)}`);
  assert(
    decoded.record.userLevelId === original.userLevelId,
    "userLevelId mismatch",
  );
  assert(
    decoded.record.creatorName === original.creatorName,
    "creatorName mismatch",
  );
  assert(
    decoded.record.evaluatorResult.difficulty ===
      original.evaluatorResult.difficulty,
    "difficulty mismatch",
  );

  // Must NOT auto-save on decode
  assert(listUserLevels().length === 0, "decode must not write My levels");
  assert(
    getUserLevel(original.userLevelId) === undefined,
    "decode must not upsert",
  );

  // Optional save uses existing import validation
  const saved = importUserLevelJson(exportUserLevelJson(decoded.record));
  assert(saved.ok, `save failed: ${JSON.stringify(saved)}`);
  assert(getUserLevel(original.userLevelId) != null, "saved after import");

  // Invalid rejection
  const bad = decodeChallengeLinkPayload("not-a-valid-payload");
  assert(!bad.ok, "invalid payload must fail");

  const empty = decodeChallengeLinkPayload("");
  assert(!empty.ok, "empty payload must fail");

  // parseUserLevelJson validate-only
  const parsed = parseUserLevelJson(exportUserLevelJson(original));
  assert(parsed.ok && parsed.records.length === 1, "parseUserLevelJson");

  const large = makeLargeFixture();
  const largeBuilt = buildChallengeLink(large, {
    baseUrl: `${CHALLENGE_LINK_ORIGIN}${CHALLENGE_LINK_PATH}`,
  });
  if (largeBuilt.ok) {
    console.log(`large_link_length=${largeBuilt.length}`);
    const largeDecoded = decodeChallengeLinkPayload(largeBuilt.payload);
    assert(largeDecoded.ok, "large decode");
  } else {
    console.log(`large_link_rejected=${largeBuilt.reason}`);
    assert(largeBuilt.reason === "TOO_LARGE", "expect TOO_LARGE or ok");
  }

  console.log("smoke-challenge-link: OK");
}

main();
