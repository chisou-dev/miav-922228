/**
 * Smoke: UserLevel Export / Import roundtrip (Phase2-7) + credits (Phase2-16).
 *
 * Does NOT call Generator / Solver / Evaluator.
 * Confirms public getAllLevelData() stays 35 / unaffected.
 * Credits: export/import preserves; missing fields get defaults.
 *
 * Usage: npx tsx scripts/smoke-user-level-export-import.mts
 */
import { EvaluationProfile } from "@/games/binary-mosaic/core/evaluator";
import { getAllLevelData } from "@/games/binary-mosaic/core/levelData";
import {
  createMemoryUserLevelsKv,
  DEFAULT_HINT_LIMIT,
  createUserLevel,
  DEFAULT_CREATOR_NAME,
  DEFAULT_PUBLISH_TITLE,
  DEVELOPER_CREDIT,
  exportAllUserLevels,
  exportUserLevel,
  exportUserLevelJson,
  getUserLevel,
  IMPORT_MAX_BOARD_COLS,
  IMPORT_MAX_BOARD_ROWS,
  IMPORT_MAX_PIECE_COUNT,
  IMPORT_MAX_TARGET_TEXT_LENGTH,
  importUserLevelJson,
  listUserLevels,
  saveUserLevel,
  setUserLevelsStorage,
  updateUserLevelPublishMeta,
  USER_LEVEL_EXPORT_FORMAT,
  USER_LEVEL_EXPORT_SCHEMA_VERSION,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Minimal valid fixture — no Generator/Solver/Evaluator. */
function makeFixture(overrides?: Partial<UserLevelRecord>): UserLevelRecord {
  return {
    userLevelId: "user:export-import-smoke-1",
    creatorIntent: {
      targetText: "A",
      boardSize: { rows: 1, cols: 8 },
      pieceCount: 2,
      rotateQuota: 0,
      hintAllowed: false,
      seed: 42,
      title: "Export/Import smoke",
      draftId: 0,
    },
    levelData: {
      id: 0,
      title: "Export/Import smoke",
      rows: 1,
      cols: 8,
      frame: "rect",
      targetText: "A",
      bits: [[0, 1, 0, 0, 0, 0, 0, 1]],
      solution: [[0, 0, 0, 0, 1, 1, 1, 1]],
      hintAllowed: false,
    },
    seed: 42,
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
    creatorName: "SmokeCreator",
    developerCredit: DEVELOPER_CREDIT,
    title: "Export/Import smoke",
    description: "",
    published: false,
    publishedAt: null,
    ...overrides,
    hintLimit: overrides?.hintLimit ?? DEFAULT_HINT_LIMIT,
  };
}

function main(): void {
  const publicBefore = getAllLevelData().length;
  assert(publicBefore === 35, `expected 35 public levels, got ${publicBefore}`);

  setUserLevelsStorage(createMemoryUserLevelsKv());

  const original = makeFixture();
  assert(saveUserLevel(original), "save fixture failed");
  assert(
    getUserLevel(original.userLevelId)?.creatorName === "SmokeCreator",
    "creatorName not stored",
  );
  assert(
    getUserLevel(original.userLevelId)?.developerCredit === DEVELOPER_CREDIT,
    "developerCredit not stored",
  );

  // --- Export single ---
  const exported = exportUserLevel(original.userLevelId);
  assert(exported !== null, "exportUserLevel returned null");
  const envelope = JSON.parse(exported!) as Record<string, unknown>;
  assert(
    envelope.schemaVersion === USER_LEVEL_EXPORT_SCHEMA_VERSION,
    "export schemaVersion",
  );
  assert(envelope.format === USER_LEVEL_EXPORT_FORMAT, "export format");
  assert(deepEqual(envelope.level, original), "export level payload mismatch");
  const exportedLevel = envelope.level as UserLevelRecord;
  assert(exportedLevel.creatorName === "SmokeCreator", "export creatorName");
  assert(
    exportedLevel.developerCredit === DEVELOPER_CREDIT,
    "export developerCredit",
  );

  // exportUserLevelJson matches
  assert(
    exportUserLevelJson(original) === exported,
    "exportUserLevelJson !== exportUserLevel",
  );

  // --- Clear store, Import, deep-compare ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  assert(listUserLevels().length === 0, "store should be empty before import");

  const imported = importUserLevelJson(exported!);
  assert(imported.ok, `import failed: ${JSON.stringify(imported)}`);
  assert(imported.inserted === 1, `expected inserted=1, got ${imported.inserted}`);
  assert(imported.upserted === 0, `expected upserted=0, got ${imported.upserted}`);
  assert(imported.records.length === 1, "import records length");

  const reloaded = getUserLevel(original.userLevelId);
  assert(reloaded, "getUserLevel miss after import");
  assert(deepEqual(reloaded, original), "export→import deep compare failed");
  assert(reloaded!.creatorName === "SmokeCreator", "import creatorName");
  assert(
    reloaded!.developerCredit === DEVELOPER_CREDIT,
    "import developerCredit",
  );

  // --- Upsert collision: same id overwrites ---
  const updated = makeFixture({
    seed: 99,
    createdAt: "2026-08-01T12:00:00.000Z",
    creatorName: "UpdatedCreator",
  });
  const reImport = importUserLevelJson(exportUserLevelJson(updated));
  assert(reImport.ok, `re-import failed: ${JSON.stringify(reImport)}`);
  assert(reImport.upserted === 1, "expected upsert on collision");
  assert(reImport.inserted === 0, "expected no insert on collision");
  assert(listUserLevels().length === 1, "upsert must not duplicate");
  assert(getUserLevel(original.userLevelId)?.seed === 99, "upsert seed");
  assert(
    getUserLevel(original.userLevelId)?.creatorName === "UpdatedCreator",
    "upsert creatorName",
  );

  // --- exportAll / multi import ---
  const second = makeFixture({
    userLevelId: "user:export-import-smoke-2",
    seed: 7,
    createdAt: "2026-08-01T13:00:00.000Z",
    creatorName: "SecondCreator",
  });
  assert(saveUserLevel(second), "save second failed");
  const allJson = exportAllUserLevels();
  const allEnvelope = JSON.parse(allJson) as Record<string, unknown>;
  assert(Array.isArray(allEnvelope.levels), "exportAll levels array");
  assert(
    (allEnvelope.levels as unknown[]).length === 2,
    "exportAll should have 2 levels",
  );

  setUserLevelsStorage(createMemoryUserLevelsKv());
  const allImport = importUserLevelJson(allJson);
  assert(allImport.ok, `multi import failed: ${JSON.stringify(allImport)}`);
  assert(allImport.inserted === 2, "multi import inserted");
  assert(listUserLevels().length === 2, "multi import store size");
  assert(
    deepEqual(getUserLevel(second.userLevelId), second),
    "multi import second mismatch",
  );

  // --- Legacy import: missing credits + publish → defaults ---
  const legacyRaw = makeFixture({
    userLevelId: "user:export-import-legacy",
  });
  const legacyPayload = {
    schemaVersion: USER_LEVEL_EXPORT_SCHEMA_VERSION,
    format: USER_LEVEL_EXPORT_FORMAT,
    level: (() => {
      const {
        creatorName: _c,
        developerCredit: _d,
        title: _t,
        description: _desc,
        published: _p,
        publishedAt: _pa,
        ...rest
      } = legacyRaw;
      return rest;
    })(),
  };
  const legacyImport = importUserLevelJson(JSON.stringify(legacyPayload));
  assert(legacyImport.ok, `legacy import failed: ${JSON.stringify(legacyImport)}`);
  const legacyRecord = getUserLevel("user:export-import-legacy");
  assert(legacyRecord, "legacy record missing");
  assert(
    legacyRecord!.creatorName === DEFAULT_CREATOR_NAME,
    `legacy creatorName expected ${DEFAULT_CREATOR_NAME}, got ${legacyRecord!.creatorName}`,
  );
  assert(
    legacyRecord!.developerCredit === DEVELOPER_CREDIT,
    `legacy developerCredit expected ${DEVELOPER_CREDIT}`,
  );
  assert(
    legacyRecord!.title === "Export/Import smoke",
    `legacy title expected levelData.title, got ${legacyRecord!.title}`,
  );
  assert(legacyRecord!.description === "", "legacy description must default empty");
  assert(legacyRecord!.published === false, "legacy published must default false");
  assert(legacyRecord!.publishedAt === null, "legacy publishedAt must default null");

  // --- createUserLevel: empty creatorName → default; publish defaults ---
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const emptyName = createUserLevel({
    levelData: legacyRaw.levelData,
    creatorIntent: legacyRaw.creatorIntent,
    seed: legacyRaw.seed,
    evaluationProfile: legacyRaw.evaluationProfile,
    evaluatorResult: legacyRaw.evaluatorResult,
    creatorName: "   ",
    userLevelId: "user:empty-creator-name",
    createdAt: "2026-08-01T14:00:00.000Z",
  });
  assert(emptyName.ok, `createUserLevel empty name failed: ${JSON.stringify(emptyName)}`);
  assert(
    emptyName.record.creatorName === DEFAULT_CREATOR_NAME,
    "empty creatorName must default",
  );
  assert(
    emptyName.record.developerCredit === DEVELOPER_CREDIT,
    "developerCredit must be fixed",
  );
  assert(
    emptyName.record.title === "Export/Import smoke",
    "createUserLevel title must fall back to levelData.title",
  );
  assert(emptyName.record.description === "", "create description default");
  assert(emptyName.record.published === false, "create published default");
  assert(emptyName.record.publishedAt === null, "create publishedAt default");

  // --- updateUserLevelPublishMeta ---
  const published = updateUserLevelPublishMeta("user:empty-creator-name", {
    title: "  My Challenge  ",
    description: " Hello ",
    published: true,
  });
  assert(published.ok, `publish meta update failed: ${JSON.stringify(published)}`);
  assert(published.record.title === "My Challenge", "publish title trim");
  assert(published.record.description === "Hello", "publish description trim");
  assert(published.record.published === true, "publish flag");
  assert(
    typeof published.record.publishedAt === "string" &&
      published.record.publishedAt.length > 0,
    "publishedAt set on first publish",
  );
  const firstPublishedAt = published.record.publishedAt;

  const unpublished = updateUserLevelPublishMeta("user:empty-creator-name", {
    published: false,
  });
  assert(unpublished.ok, "unpublish failed");
  assert(unpublished.record.published === false, "unpublish flag");
  assert(
    unpublished.record.publishedAt === firstPublishedAt,
    "unpublish must keep last publishedAt",
  );

  const emptyTitle = updateUserLevelPublishMeta("user:empty-creator-name", {
    title: "   ",
  });
  assert(emptyTitle.ok, "empty title update failed");
  assert(
    emptyTitle.record.title === "Export/Import smoke",
    "empty title falls back to levelData.title",
  );

  // Empty title with blank levelData.title → DEFAULT_PUBLISH_TITLE via coerce path
  const blankTitleFixture = makeFixture({
    userLevelId: "user:blank-title-fallback",
    levelData: {
      ...legacyRaw.levelData,
      title: "",
    },
    title: "",
  });
  assert(saveUserLevel(blankTitleFixture), "save blank title fixture");
  const blankSaved = getUserLevel("user:blank-title-fallback");
  assert(
    blankSaved?.title === DEFAULT_PUBLISH_TITLE,
    `blank title expected ${DEFAULT_PUBLISH_TITLE}, got ${blankSaved?.title}`,
  );

  // --- Reject malformed ---
  const bad = importUserLevelJson("{not json");
  assert(!bad.ok && bad.reason === "PARSE_ERROR", "must reject bad JSON");
  assert(typeof bad.error === "string" && bad.error.length > 0, "PARSE_ERROR message");

  const badShape = importUserLevelJson(
    JSON.stringify({
      schemaVersion: USER_LEVEL_EXPORT_SCHEMA_VERSION,
      format: USER_LEVEL_EXPORT_FORMAT,
      level: { userLevelId: "user:x" },
    }),
  );
  assert(
    !badShape.ok && badShape.reason === "INVALID_SHAPE",
    "must reject incomplete level",
  );

  const unsupported = importUserLevelJson(
    JSON.stringify({
      schemaVersion: 999,
      format: USER_LEVEL_EXPORT_FORMAT,
      level: makeFixture(),
    }),
  );
  assert(
    !unsupported.ok && unsupported.reason === "UNSUPPORTED_SCHEMA",
    "must reject unsupported schemaVersion",
  );

  const malformedRecord = {
    ...makeFixture(),
    levelData: { id: 0, title: "missing fields" },
  } as unknown as UserLevelRecord;
  const badLevelData = importUserLevelJson(exportUserLevelJson(malformedRecord));
  assert(
    !badLevelData.ok && badLevelData.reason === "INVALID_SHAPE",
    "must reject malformed LevelData",
  );

  // Excessively long targetText
  const longText = "A".repeat(IMPORT_MAX_TARGET_TEXT_LENGTH + 1);
  const longTarget = makeFixture({
    userLevelId: "user:reject-long-target",
    levelData: {
      ...makeFixture().levelData,
      targetText: longText,
    },
    creatorIntent: {
      ...makeFixture().creatorIntent,
      targetText: longText,
    },
  });
  const longImport = importUserLevelJson(exportUserLevelJson(longTarget));
  assert(
    !longImport.ok && longImport.reason === "INVALID_SHAPE",
    "must reject long targetText",
  );

  // Excessively large board
  const hugeRows = IMPORT_MAX_BOARD_ROWS + 1;
  const hugeCols = Math.min(8, IMPORT_MAX_BOARD_COLS);
  const hugeBits = Array.from({ length: hugeRows }, () =>
    Array.from({ length: hugeCols }, () => 0 as 0 | 1),
  );
  const hugeSol = Array.from({ length: hugeRows }, () =>
    Array.from({ length: hugeCols }, () => 0),
  );
  const hugeBoard = makeFixture({
    userLevelId: "user:reject-huge-board",
    levelData: {
      ...makeFixture().levelData,
      rows: hugeRows,
      cols: hugeCols,
      bits: hugeBits,
      solution: hugeSol,
    },
    creatorIntent: {
      ...makeFixture().creatorIntent,
      boardSize: { rows: hugeRows, cols: hugeCols },
    },
  });
  const hugeImport = importUserLevelJson(exportUserLevelJson(hugeBoard));
  assert(
    !hugeImport.ok && hugeImport.reason === "INVALID_SHAPE",
    "must reject oversized board",
  );

  // Too many pieces — one cell per piece id on a board within size caps
  const tooMany = IMPORT_MAX_PIECE_COUNT + 1;
  const pcRows = 3;
  const pcCols = Math.ceil(tooMany / pcRows);
  assert(
    pcCols <= IMPORT_MAX_BOARD_COLS && pcRows <= IMPORT_MAX_BOARD_ROWS,
    "test board must fit import board caps",
  );
  const pcBits = Array.from({ length: pcRows }, () =>
    Array.from({ length: pcCols }, () => 0 as 0 | 1),
  );
  const pcSol = Array.from({ length: pcRows }, () =>
    Array.from({ length: pcCols }, () => -1),
  );
  for (let i = 0; i < tooMany; i += 1) {
    const r = Math.floor(i / pcCols);
    const c = i % pcCols;
    pcSol[r]![c] = i;
  }
  const manyPiecesOkBoard = makeFixture({
    userLevelId: "user:reject-many-pieces",
    levelData: {
      ...makeFixture().levelData,
      rows: pcRows,
      cols: pcCols,
      bits: pcBits,
      solution: pcSol,
    },
    creatorIntent: {
      ...makeFixture().creatorIntent,
      boardSize: { rows: pcRows, cols: pcCols },
      pieceCount: tooMany,
    },
  });
  const manyImport = importUserLevelJson(exportUserLevelJson(manyPiecesOkBoard));
  assert(
    !manyImport.ok && manyImport.reason === "INVALID_SHAPE",
    "must reject too many pieces",
  );

  // Negative piece id (below -1)
  const negFixture = makeFixture({
    userLevelId: "user:reject-neg",
    levelData: {
      ...makeFixture().levelData,
      solution: [[-2, 0, 0, 0, 1, 1, 1, 1]],
    },
  });
  const negImport = importUserLevelJson(exportUserLevelJson(negFixture));
  assert(
    !negImport.ok && negImport.reason === "INVALID_SHAPE",
    "must reject negative/out-of-range piece ids",
  );

  // Shape outside board (row length mismatch)
  const outside = makeFixture({
    userLevelId: "user:reject-outside",
    levelData: {
      ...makeFixture().levelData,
      rows: 1,
      cols: 8,
      bits: [[0, 1, 0, 0, 0, 0, 0, 1]],
      solution: [[0, 0, 0, 0, 1, 1, 1, 1, 1]],
    },
  });
  const outsideImport = importUserLevelJson(exportUserLevelJson(outside));
  assert(
    !outsideImport.ok && outsideImport.reason === "INVALID_SHAPE",
    "must reject shapes outside board",
  );

  // Accept legacy valid still works after reject suite
  setUserLevelsStorage(createMemoryUserLevelsKv());
  const legacyStill = importUserLevelJson(JSON.stringify(legacyPayload));
  assert(legacyStill.ok, "legacy valid JSON must still import");
  assert(listUserLevels().length === 1, "legacy accept stored");

  const publicAfter = getAllLevelData().length;
  assert(publicAfter === 35, `public levels mutated: ${publicAfter}`);
  assert(publicAfter === publicBefore, "public catalog count changed");

  setUserLevelsStorage(null);

  console.log(
    JSON.stringify(
      {
        ok: true,
        format: USER_LEVEL_EXPORT_FORMAT,
        schemaVersion: USER_LEVEL_EXPORT_SCHEMA_VERSION,
        roundtripEqual: true,
        upsertWorks: true,
        creditsPreserved: true,
        legacyCreditsDefaulted: true,
        legacyPublishDefaulted: true,
        emptyCreatorNameDefaults: true,
        publishMetaUpdateWorks: true,
        importRejectsStrengthened: true,
        defaultCreatorName: DEFAULT_CREATOR_NAME,
        defaultPublishTitle: DEFAULT_PUBLISH_TITLE,
        developerCredit: DEVELOPER_CREDIT,
        publicLevels: publicAfter,
      },
      null,
      2,
    ),
  );
}

main();
