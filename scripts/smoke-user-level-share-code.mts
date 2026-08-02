/**
 * Smoke: UserLevel Share Code encode → import roundtrip (Phase2-18/19).
 *
 * Does NOT call Generator / Solver / Evaluator.
 * Confirms Export/Import JSON still works and public 1–30 unaffected.
 *
 * Usage: npx tsx scripts/smoke-user-level-share-code.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import {
  BINARY_BLOCK_SHARE_INDEX_KEY,
  encodeUserLevelShareCode,
  encodeUserLevelShareCodeRaw,
  encodeUserLevelShortShareCode,
  ensureLocalShareAlias,
  formatGroupedShareCode,
  generateUserLevelShareCodes,
  importUserLevelFromShareCode,
  regenerateLocalShareAlias,
  shortUserLevelShareFingerprint,
  USER_LEVEL_SHARE_PREFIX,
  validateShareCode,
} from "@/games/binary-mosaic/progress/shareCode";
import {
  createMemoryUserLevelsKv,
  DEVELOPER_CREDIT,
  exportUserLevelJson,
  getUserLevel,
  importUserLevelJson,
  listUserLevels,
  saveUserLevel,
  setUserLevelsStorage,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function makeFixture(overrides?: Partial<UserLevelRecord>): UserLevelRecord {
  return {
    userLevelId: "user:share-code-smoke-1",
    creatorIntent: {
      targetText: "HI",
      boardSize: { rows: 1, cols: 8 },
      pieceCount: 2,
      rotateQuota: 0,
      hintAllowed: false,
      seed: 77,
      title: "Share Code smoke",
      draftId: 0,
    },
    levelData: {
      id: 0,
      title: "Share Code smoke",
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
    createdAt: "2026-08-01T00:00:00.000Z",
    creatorName: "ShareSmoke",
    developerCredit: DEVELOPER_CREDIT,
    title: "Share Code smoke",
    description: "",
    published: false,
    publishedAt: null,
    ...overrides,
  };
}

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 30, `expected 30 public levels, got ${publicBefore}`);

  setUserLevelsStorage(createMemoryUserLevelsKv());
  const original = makeFixture();
  assert(saveUserLevel(original), "save fixture failed");

  // --- Encode portable share code (grouped human-friendly) ---
  const code = encodeUserLevelShareCode(original);
  assert(
    code.startsWith(USER_LEVEL_SHARE_PREFIX),
    `prefix missing: ${code.slice(0, 20)}`,
  );
  assert(code.includes("-"), "grouped code should contain hyphens in body");
  assert(
    code.length > USER_LEVEL_SHARE_PREFIX.length + 20,
    "portable code should be longer than a fingerprint",
  );
  assert(validateShareCode(code), "grouped code should validate");

  // encode by id matches encode by record
  assert(
    encodeUserLevelShareCode(original.userLevelId) === code,
    "encode by id !== encode by record",
  );

  // Raw (Phase2-18) form still available
  const legacyRaw = encodeUserLevelShareCodeRaw(original);
  assert(
    !legacyRaw.slice(USER_LEVEL_SHARE_PREFIX.length).includes("-") ||
      /^[A-Za-z0-9_-]+$/.test(legacyRaw.slice(USER_LEVEL_SHARE_PREFIX.length)),
    "raw body is base64url",
  );
  assert(
    formatGroupedShareCode(legacyRaw) === code,
    "formatGroupedShareCode(raw) should match encode",
  );

  // --- Clear store, import from grouped share code ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(listUserLevels().length === 0, "store should be empty");

  const imported = importUserLevelFromShareCode(code);
  assert(imported.ok, `import failed: ${JSON.stringify(imported)}`);
  assert(!imported.upserted, "first import should insert");
  assert(
    deepEqual(imported.record, original),
    "share encode→import deep compare failed",
  );
  assert(
    deepEqual(getUserLevel(original.userLevelId), original),
    "persisted record mismatch",
  );

  // --- Legacy Phase2-18 unhyphenated code still imports ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const legacyImport = importUserLevelFromShareCode(legacyRaw);
  assert(
    legacyImport.ok,
    `legacy raw import failed: ${JSON.stringify(legacyImport)}`,
  );
  assert(
    deepEqual(legacyImport.record, original),
    "legacy Phase2-18 code must roundtrip",
  );

  // --- Upsert via share code ---
  const updated = makeFixture({
    seed: 101,
    creatorName: "UpdatedShare",
  });
  const upsert = importUserLevelFromShareCode(
    encodeUserLevelShareCode(updated),
  );
  assert(upsert.ok, `upsert import failed: ${JSON.stringify(upsert)}`);
  assert(upsert.upserted, "expected upsert");
  assert(listUserLevels().length === 1, "upsert must not duplicate");
  assert(getUserLevel(original.userLevelId)?.seed === 101, "upsert seed");

  // --- Short fingerprint (Phase2-18 same-device) ---
  assert(saveUserLevel(original), "re-save for fingerprint");
  const fp = shortUserLevelShareFingerprint(original.userLevelId);
  assert(fp.length === 6, `fingerprint length ${fp.length}`);
  const shortCode = encodeUserLevelShortShareCode(original.userLevelId);
  assert(
    shortCode === `${USER_LEVEL_SHARE_PREFIX}${fp}`,
    "short code format",
  );
  const local = importUserLevelFromShareCode(shortCode);
  assert(local.ok, `short import failed: ${JSON.stringify(local)}`);
  assert(
    local.record.userLevelId === original.userLevelId,
    "short fingerprint lookup id",
  );

  // Short code on empty store → NOT_FOUND
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const missing = importUserLevelFromShareCode(shortCode);
  assert(
    !missing.ok && missing.reason === "NOT_FOUND",
    "short code must not invent levels",
  );

  // --- Local short alias decode (legacy; no UI generation) ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(saveUserLevel(original), "re-save for alias");
  const bundle = generateUserLevelShareCodes(original);
  assert(
    bundle.portableGrouped === encodeUserLevelShareCode(original),
    "bundle grouped matches encode",
  );
  // generate must not create new local aliases
  assert(bundle.localAlias === null, "generate must not create local aliases");

  const alias = ensureLocalShareAlias(original);
  assert(alias !== null, "ensure can still create for legacy decode tests");
  assert(alias!.startsWith(USER_LEVEL_SHARE_PREFIX), "alias prefix");
  assert(
    /^MIAV-BB-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/i.test(alias!),
    `alias format: ${alias}`,
  );
  const aliasImport = importUserLevelFromShareCode(alias!);
  assert(aliasImport.ok, `alias import failed: ${JSON.stringify(aliasImport)}`);
  assert(
    aliasImport.record.userLevelId === original.userLevelId,
    "alias restore id",
  );

  const alias2 = regenerateLocalShareAlias(original);
  assert(alias2 !== null, "regenerate alias");
  assert(alias2 !== alias, "regenerate should change alias");
  // Old alias gone
  const oldGone = importUserLevelFromShareCode(alias!);
  assert(
    !oldGone.ok && oldGone.reason === "NOT_FOUND",
    "old alias must be removed after regenerate",
  );
  const newOk = importUserLevelFromShareCode(alias2!);
  assert(newOk.ok, "new alias imports");

  // ensure is idempotent when alias exists
  const ensured = ensureLocalShareAlias(original);
  assert(ensured === alias2, "ensure should reuse current alias");

  // generate still lookup-only after an alias exists
  const bundleAfter = generateUserLevelShareCodes(original);
  assert(
    bundleAfter.localAlias === alias2,
    "generate may surface existing alias via lookup only",
  );

  // Share index is a separate key (not user level schema)
  const kv = createMemoryUserLevelsKv();
  setUserLevelsStorage(kv);
  assert(saveUserLevel(original), "save for index key check");
  ensureLocalShareAlias(original);
  assert(
    kv.getItem(BINARY_BLOCK_SHARE_INDEX_KEY) !== null,
    "share index key written",
  );

  // --- Reject bad prefix / format / broken decode ---
  const badPrefix = importUserLevelFromShareCode("NOPE-XX-abc");
  assert(
    !badPrefix.ok && badPrefix.reason === "INVALID_PREFIX",
    "must reject bad prefix",
  );
  assert(
    !badPrefix.ok && typeof badPrefix.error === "string" && badPrefix.error.length > 0,
    "reject must include user-facing error",
  );
  const emptyBody = importUserLevelFromShareCode(USER_LEVEL_SHARE_PREFIX);
  assert(
    !emptyBody.ok && emptyBody.reason === "INVALID_FORMAT",
    "must reject empty body",
  );
  const garbage = importUserLevelFromShareCode(
    `${USER_LEVEL_SHARE_PREFIX}!!!not-base64!!!`,
  );
  assert(
    !garbage.ok && garbage.reason === "INVALID_FORMAT",
    "must reject non-base64url body",
  );
  const broken = importUserLevelFromShareCode(
    `${USER_LEVEL_SHARE_PREFIX}@@@@`,
  );
  assert(
    !broken.ok &&
      (broken.reason === "INVALID_FORMAT" || broken.reason === "DECODE_ERROR"),
    "must reject broken share body",
  );
  assert(!broken.ok && broken.error.length > 0, "broken share has message");

  // --- Export/Import JSON still works (unchanged path) ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(saveUserLevel(original), "re-save for JSON path");
  const json = exportUserLevelJson(original);
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const jsonImport = importUserLevelJson(json);
  assert(jsonImport.ok, `JSON import failed: ${JSON.stringify(jsonImport)}`);
  assert(
    deepEqual(getUserLevel(original.userLevelId), original),
    "JSON export→import still works",
  );

  // Share payload is the same envelope as Export (compact)
  const decodedViaShare = importUserLevelFromShareCode(
    encodeUserLevelShareCode(original),
  );
  assert(decodedViaShare.ok, "re-encode after JSON path");
  assert(
    deepEqual(decodedViaShare.record, original),
    "share payload matches Export record",
  );

  // --- Legacy payload missing publish fields → coerce defaults; Share still works ---
  const {
    title: _t,
    description: _desc,
    published: _pub,
    publishedAt: _pa,
    ...legacyNoPublish
  } = original;
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const legacyJsonImport = importUserLevelJson(
    JSON.stringify({
      schemaVersion: 1,
      format: "binary-block-user-level",
      level: legacyNoPublish,
    }),
  );
  assert(
    legacyJsonImport.ok,
    `legacy no-publish JSON import failed: ${JSON.stringify(legacyJsonImport)}`,
  );
  const coerced = getUserLevel(original.userLevelId);
  assert(coerced, "legacy coerced missing");
  assert(
    coerced!.title === original.levelData.title,
    "legacy title ← levelData.title",
  );
  assert(coerced!.description === "", "legacy description default");
  assert(coerced!.published === false, "legacy published default");
  assert(coerced!.publishedAt === null, "legacy publishedAt default");
  const legacyShareRoundtrip = importUserLevelFromShareCode(
    encodeUserLevelShareCode(coerced!),
  );
  assert(
    legacyShareRoundtrip.ok,
    `legacy-coerced share roundtrip failed: ${JSON.stringify(legacyShareRoundtrip)}`,
  );

  const publicAfter = getAllLevelData().length;
  assert(publicAfter === 30, `public levels mutated: ${publicAfter}`);
  assert(publicAfter === publicBefore, "public catalog count changed");

  setUserLevelsStorage(null);

  console.log(
    JSON.stringify(
      {
        ok: true,
        prefix: USER_LEVEL_SHARE_PREFIX,
        portableGroupedLength: code.length,
        portableRawLength: legacyRaw.length,
        fingerprint: fp,
        localAlias: alias2,
        roundtripEqual: true,
        legacyRawCompatible: true,
        shortLookupWorks: true,
        localAliasWorks: true,
        exportImportJsonStillWorks: true,
        legacyPublishDefaults: true,
        publicLevels: publicAfter,
      },
      null,
      2,
    ),
  );
}

main();
