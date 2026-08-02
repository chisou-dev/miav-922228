"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  EvaluatorReasonCode,
  usedPieceCount,
  type CreatorIntent,
  type EvaluatorMetrics,
  type LevelData,
} from "@/games/binary-mosaic/core";
import { createAutoCreatorIntent } from "@/games/binary-mosaic/creator/autoIntent";
import {
  runPreviewCandidates,
  type PreviewCandidatesResult,
} from "@/games/binary-mosaic/pipeline/previewCandidates";
import {
  generateUserLevelShareCodes,
  importUserLevelFromShareCode,
  regenerateLocalShareAlias,
  type ShareCodeBundle,
} from "@/games/binary-mosaic/progress/shareCode";
import {
  CLIPBOARD_COPY_FAILED_MESSAGE,
  createUserLevel,
  DEFAULT_CREATOR_NAME,
  DEFAULT_PUBLISH_TITLE,
  DEVELOPER_CREDIT,
  displayUserLevelTitle,
  exportUserLevelJson,
  listUserLevels,
  normalizeCreatorName,
  updateUserLevelPublishMeta,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "preview"; result: PreviewCandidatesResult }
  | {
      status: "saved";
      result: PreviewCandidatesResult;
      savedUserLevelId: string;
    }
  | { status: "error"; message: string };

const DEFAULT_ADVANCED: CreatorIntent = {
  targetText: "HI",
  boardSize: { rows: 2, cols: 8 },
  pieceCount: 3,
  rotateQuota: 1,
  hintAllowed: true,
  seed: 4242,
  title: "Creator draft",
  draftId: 0,
};

/** UI-only short labels for EvaluatorReasonCode — display layer; not evaluator logic. */
const REASON_LABELS: Record<EvaluatorReasonCode, string> = {
  [EvaluatorReasonCode.NOT_UNIQUE]: "Multiple solutions",
  [EvaluatorReasonCode.UNSOLVABLE]: "No solution",
  [EvaluatorReasonCode.SOLVER_TIMEOUT]: "Solver timed out",
  [EvaluatorReasonCode.TOO_EASY]: "Too easy",
  [EvaluatorReasonCode.TOO_HARD]: "Too hard",
  [EvaluatorReasonCode.TOO_MANY_BAR_PIECES]: "Too many bar pieces",
  [EvaluatorReasonCode.ROTATION_NOT_MEANINGFUL]: "Rotation not meaningful",
  [EvaluatorReasonCode.PIECE_COUNT_LOW]: "Too few pieces",
  [EvaluatorReasonCode.PIECE_COUNT_HIGH]: "Too many pieces",
  [EvaluatorReasonCode.MAX_PIECE_TOO_LARGE]: "Piece too large",
  [EvaluatorReasonCode.SCORE_TOO_LOW]: "Quality score too low",
};

function reasonLabel(code: EvaluatorReasonCode): string {
  return REASON_LABELS[code] ?? String(code);
}

function formatMetricBool(value: boolean): string {
  return value ? "yes" : "no";
}

function formatBarRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/** Key metrics from EvaluatorResult.metrics for PASS quality feedback. */
function metricRows(metrics: EvaluatorMetrics): { label: string; value: string }[] {
  return [
    { label: "pieceCount", value: String(metrics.pieceCount) },
    { label: "maxPieceSize", value: String(metrics.maxPieceSize) },
    { label: "barPieceRate", value: formatBarRate(metrics.barPieceRate) },
    { label: "exploredNodes", value: String(metrics.exploredNodes) },
    {
      label: "rotationMeaningful",
      value: formatMetricBool(metrics.rotationMeaningful),
    },
    { label: "unique", value: formatMetricBool(metrics.unique) },
    { label: "solvable", value: formatMetricBool(metrics.solvable) },
    {
      label: "rotatablePieceCount",
      value: String(metrics.rotatablePieceCount),
    },
  ];
}

function parseIntField(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function playHref(userLevelId: string): string {
  return `/game/binary-mosaic?user=${encodeURIComponent(userLevelId)}`;
}

function showcaseHref(userLevelId: string): string {
  return `/game/binary-mosaic/showcase?user=${encodeURIComponent(userLevelId)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function ShareCodeRow({
  record,
  label = "Share Code",
}: {
  record: UserLevelRecord;
  label?: string;
}) {
  const [copied, setCopied] = useState<"share" | "export" | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ShareCodeBundle>(() =>
    generateUserLevelShareCodes(record),
  );

  // Refresh when the saved record identity or publish payload changes.
  useEffect(() => {
    setBundle(generateUserLevelShareCodes(record));
  }, [
    record.userLevelId,
    record.createdAt,
    record.seed,
    record.title,
    record.description,
    record.published,
    record.publishedAt,
  ]);

  const code = bundle.portableGrouped;
  const localAlias = bundle.localAlias;

  async function onCopyShare() {
    setCopyError(null);
    const ok = await copyText(code);
    if (!ok) {
      setCopied(null);
      setCopyError(CLIPBOARD_COPY_FAILED_MESSAGE);
      return;
    }
    setCopied("share");
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function onCopyExport() {
    setCopyError(null);
    const ok = await copyText(exportUserLevelJson(record));
    if (!ok) {
      setCopied(null);
      setCopyError(CLIPBOARD_COPY_FAILED_MESSAGE);
      return;
    }
    setCopied("export");
    window.setTimeout(() => setCopied(null), 1600);
  }

  function onRegenerateAlias() {
    const next = regenerateLocalShareAlias(record);
    if (!next) return;
    setBundle((prev) => ({ ...prev, localAlias: next }));
  }

  return (
    <div className="mosaic-creator-share">
      <span className="mosaic-creator-share-label">{label}</span>
      <code className="mosaic-creator-share-code" title={code}>
        {code}
      </code>
      <button
        type="button"
        className="mosaic-btn mosaic-btn--ghost mosaic-creator-share-copy"
        onClick={() => void onCopyShare()}
      >
        {copied === "share" ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        className="mosaic-btn mosaic-btn--ghost mosaic-creator-share-copy"
        onClick={() => void onCopyExport()}
      >
        {copied === "export" ? "Exported" : "Copy Export"}
      </button>
      {localAlias ? (
        <>
          <span className="mosaic-creator-share-label mosaic-creator-share-label--alias">
            Local short
          </span>
          <code
            className="mosaic-creator-share-code mosaic-creator-share-code--alias"
            title="Same-browser only — not for SNS share"
          >
            {localAlias}
          </code>
          <button
            type="button"
            className="mosaic-btn mosaic-btn--ghost mosaic-creator-share-copy"
            onClick={onRegenerateAlias}
          >
            Regenerate
          </button>
        </>
      ) : null}
      {copyError ? (
        <p
          className="mosaic-creator-status mosaic-creator-status--fail"
          role="status"
        >
          {copyError}
        </p>
      ) : null}
    </div>
  );
}

/** Static bit-grid from levelData.bits only — no Session. */
function BitsPreview({ levelData }: { levelData: LevelData }) {
  const { bits, rows, cols } = levelData;
  return (
    <div
      className="mosaic-creator-bits"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`Completed bit pattern ${rows}×${cols}`}
    >
      {bits.map((row, r) =>
        row.map((bit, c) => (
          <span
            key={`${r}-${c}`}
            className={
              bit === 1
                ? "mosaic-creator-bit mosaic-creator-bit--1"
                : "mosaic-creator-bit mosaic-creator-bit--0"
            }
          />
        )),
      )}
    </div>
  );
}

export function CreatorPanel() {
  const [targetText, setTargetText] = useState(DEFAULT_ADVANCED.targetText);
  const [rows, setRows] = useState(String(DEFAULT_ADVANCED.boardSize.rows));
  const [cols, setCols] = useState(String(DEFAULT_ADVANCED.boardSize.cols));
  const [pieceCount, setPieceCount] = useState(
    String(DEFAULT_ADVANCED.pieceCount),
  );
  const [rotateQuota, setRotateQuota] = useState(
    String(DEFAULT_ADVANCED.rotateQuota),
  );
  const [hintAllowed, setHintAllowed] = useState(DEFAULT_ADVANCED.hintAllowed);
  const [seed, setSeed] = useState(String(DEFAULT_ADVANCED.seed));
  const [creatorName, setCreatorName] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishFlag, setPublishFlag] = useState(false);
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [userLevels, setUserLevels] = useState<UserLevelRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [shareImportCode, setShareImportCode] = useState("");
  const [shareImportBusy, setShareImportBusy] = useState(false);
  const [shareImportMessage, setShareImportMessage] = useState<string | null>(
    null,
  );
  const [shareImportOk, setShareImportOk] = useState(false);

  const refreshUserLevels = useCallback(() => {
    setUserLevels(listUserLevels());
  }, []);

  useEffect(() => {
    refreshUserLevels();
  }, [refreshUserLevels]);

  function buildAdvancedIntent(): CreatorIntent {
    const text = targetText.trim() || DEFAULT_ADVANCED.targetText;
    return {
      targetText: text,
      boardSize: {
        rows: parseIntField(rows, DEFAULT_ADVANCED.boardSize.rows),
        cols: parseIntField(cols, DEFAULT_ADVANCED.boardSize.cols),
      },
      pieceCount: parseIntField(pieceCount, DEFAULT_ADVANCED.pieceCount),
      rotateQuota: parseIntField(rotateQuota, DEFAULT_ADVANCED.rotateQuota),
      hintAllowed,
      seed: parseIntField(seed, DEFAULT_ADVANCED.seed),
      title: `Creator: ${text}`,
      draftId: 0,
    };
  }

  function executePreview(intent: CreatorIntent) {
    setSaveMessage(null);
    setRun({ status: "running" });
    // Defer so "Generating…" can paint before the sync pipeline runs.
    window.setTimeout(() => {
      try {
        const result = runPreviewCandidates(intent);
        setRun({ status: "preview", result });
      } catch (err) {
        setRun({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }, 0);
  }

  function onGenerate(e?: FormEvent) {
    e?.preventDefault();
    const text = targetText.trim();
    if (!text) {
      setRun({
        status: "error",
        message: "Enter a non-empty ASCII target (code points 0–255).",
      });
      return;
    }
    try {
      const intent = createAutoCreatorIntent(text);
      executePreview(intent);
    } catch (err) {
      setRun({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function onAdvancedGenerate(e?: FormEvent) {
    e?.preventDefault();
    executePreview(buildAdvancedIntent());
  }

  function onSave() {
    if (run.status !== "preview" && run.status !== "saved") return;
    const { result } = run;
    const levelData = result.selectedLevelData;
    const evaluatorResult = result.selectedEvaluatorResult;
    if (!levelData || !evaluatorResult || !evaluatorResult.passed) return;

    setSaveBusy(true);
    setSaveMessage(null);
    window.setTimeout(() => {
      try {
        const saved = createUserLevel({
          levelData,
          creatorIntent: result.intent,
          seed: result.intent.seed,
          evaluationProfile: result.profile,
          evaluatorResult,
          creatorName,
          title: publishTitle,
          description: publishDescription,
          published: publishFlag,
        });
        if (!saved.ok) {
          setSaveMessage(saved.error);
          setSaveBusy(false);
          return;
        }
        setRun({
          status: "saved",
          result,
          savedUserLevelId: saved.record.userLevelId,
        });
        setSaveBusy(false);
        refreshUserLevels();
      } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : String(err));
        setSaveBusy(false);
      }
    }, 0);
  }

  function onImportShareCode(e?: FormEvent) {
    e?.preventDefault();
    const code = shareImportCode.trim();
    if (!code) {
      setShareImportOk(false);
      setShareImportMessage("Paste a Share Code first.");
      return;
    }
    const confirmed = window.confirm(
      "Restore this Share Code into My levels?\nSame userLevelId will be overwritten.",
    );
    if (!confirmed) return;
    setShareImportBusy(true);
    setShareImportMessage(null);
    setShareImportOk(false);
    window.setTimeout(() => {
      try {
        const result = importUserLevelFromShareCode(code);
        if (!result.ok) {
          setShareImportMessage(result.error);
          setShareImportBusy(false);
          return;
        }
        setShareImportOk(true);
        setShareImportMessage(
          result.upserted
            ? `Restored (updated) · ${result.record.userLevelId}`
            : `Imported · ${result.record.userLevelId}`,
        );
        setShareImportCode("");
        refreshUserLevels();
        setShareImportBusy(false);
      } catch (err) {
        setShareImportMessage(err instanceof Error ? err.message : String(err));
        setShareImportBusy(false);
      }
    }, 0);
  }

  function openPublishEdit(record: UserLevelRecord) {
    setEditId(record.userLevelId);
    setEditTitle(record.title);
    setEditDescription(record.description);
    setEditPublished(record.published);
    setEditMessage(null);
  }

  function onSavePublishMeta(e?: FormEvent) {
    e?.preventDefault();
    if (!editId) return;
    setEditBusy(true);
    setEditMessage(null);
    window.setTimeout(() => {
      try {
        const result = updateUserLevelPublishMeta(editId, {
          title: editTitle,
          description: editDescription,
          published: editPublished,
        });
        if (!result.ok) {
          setEditMessage(result.error);
          setEditBusy(false);
          return;
        }
        setEditTitle(result.record.title);
        setEditDescription(result.record.description);
        setEditPublished(result.record.published);
        setEditMessage("Publish info saved.");
        refreshUserLevels();
        setEditBusy(false);
      } catch (err) {
        setEditMessage(err instanceof Error ? err.message : String(err));
        setEditBusy(false);
      }
    }, 0);
  }

  const loading = run.status === "running";
  const preview =
    run.status === "preview" || run.status === "saved" ? run.result : null;
  const savedId = run.status === "saved" ? run.savedUserLevelId : null;
  const candidates = preview?.candidates;
  const intent = preview?.intent;
  /** Selected when PASS; otherwise first evaluated candidate for summary / bits. */
  const displayCandidate =
    preview?.selectedLevelData && preview.selectedEvaluatorResult
      ? {
          levelData: preview.selectedLevelData,
          evaluatorResult: preview.selectedEvaluatorResult,
          index: preview.selectedIndex,
        }
      : candidates && candidates.length > 0
        ? {
            levelData: candidates[0].levelData,
            evaluatorResult: candidates[0].evaluatorResult,
            index: candidates[0].index,
          }
        : null;
  const levelData = displayCandidate?.levelData;
  const evaluatorResult = displayCandidate?.evaluatorResult;
  const rotatableLen = levelData?.rotatablePieceIndices?.length ?? 0;
  const passed = preview?.success === true && evaluatorResult?.passed === true;
  const canSave = passed && !savedId && !saveBusy;
  const verdictLabel = preview ? (passed ? "PASS" : "FAIL") : null;
  const displayFailEval =
    evaluatorResult && !evaluatorResult.passed ? evaluatorResult : undefined;
  const displayCreatorName = normalizeCreatorName(creatorName);
  const savedRecord =
    savedId != null
      ? userLevels.find((r) => r.userLevelId === savedId) ?? null
      : null;

  return (
    <div className="mosaic-root mosaic-creator">
      <div className="mosaic-chrome mosaic-chrome--select">
        <a href="/game/binary-mosaic" className="mosaic-chrome-link">
          ← Levels
        </a>
        <span className="mosaic-chrome-title">Creator</span>
        <a
          href="/game/binary-mosaic/challenge?tab=collection"
          className="mosaic-chrome-link mosaic-chrome-sound"
        >
          Collection
        </a>
      </div>

      <p className="mosaic-lead">
        Type text, preview a puzzle, then save when it passes. Play opens after
        save. Only PASS results are saved as My levels.
      </p>

      <form
        className="mosaic-creator-form mosaic-creator-form--primary"
        onSubmit={onGenerate}
      >
        <label className="mosaic-creator-field mosaic-creator-field--primary">
          <span>Target text</span>
          <input
            type="text"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            maxLength={16}
            autoComplete="off"
            placeholder="e.g. HI"
            autoFocus
            disabled={loading || saveBusy}
          />
        </label>
        <label className="mosaic-creator-field mosaic-creator-field--primary">
          <span>Creator Name</span>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            maxLength={48}
            autoComplete="off"
            placeholder={`optional · default ${DEFAULT_CREATOR_NAME}`}
            disabled={loading || saveBusy}
          />
        </label>
        <label className="mosaic-creator-field mosaic-creator-field--primary">
          <span>Title</span>
          <input
            type="text"
            value={publishTitle}
            onChange={(e) => setPublishTitle(e.target.value)}
            maxLength={80}
            autoComplete="off"
            placeholder={`optional · default ${DEFAULT_PUBLISH_TITLE}`}
            disabled={loading || saveBusy}
          />
        </label>
        <label className="mosaic-creator-field mosaic-creator-field--primary">
          <span>Description</span>
          <textarea
            value={publishDescription}
            onChange={(e) => setPublishDescription(e.target.value)}
            maxLength={280}
            rows={2}
            autoComplete="off"
            placeholder="optional"
            disabled={loading || saveBusy}
          />
        </label>
        <label className="mosaic-creator-field mosaic-creator-field--primary mosaic-creator-field--check">
          <span>Published</span>
          <input
            type="checkbox"
            checked={publishFlag}
            onChange={(e) => setPublishFlag(e.target.checked)}
            disabled={loading || saveBusy}
          />
        </label>
        <div className="mosaic-creator-actions">
          <button
            type="submit"
            className="mosaic-btn"
            disabled={loading || saveBusy}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>

      <details className="mosaic-creator-advanced">
        <summary>Advanced intent (optional)</summary>
        <form className="mosaic-creator-form" onSubmit={onAdvancedGenerate}>
          <label className="mosaic-creator-field">
            <span>rows</span>
            <input
              type="number"
              min={1}
              max={16}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              disabled={loading || saveBusy}
            />
          </label>
          <label className="mosaic-creator-field">
            <span>cols</span>
            <input
              type="number"
              min={1}
              max={32}
              value={cols}
              onChange={(e) => setCols(e.target.value)}
              disabled={loading || saveBusy}
            />
          </label>
          <label className="mosaic-creator-field">
            <span>pieceCount</span>
            <input
              type="number"
              min={1}
              max={24}
              value={pieceCount}
              onChange={(e) => setPieceCount(e.target.value)}
              disabled={loading || saveBusy}
            />
          </label>
          <label className="mosaic-creator-field">
            <span>rotateQuota</span>
            <input
              type="number"
              min={0}
              max={24}
              value={rotateQuota}
              onChange={(e) => setRotateQuota(e.target.value)}
              disabled={loading || saveBusy}
            />
          </label>
          <label className="mosaic-creator-field mosaic-creator-field--check">
            <span>hintAllowed</span>
            <input
              type="checkbox"
              checked={hintAllowed}
              onChange={(e) => setHintAllowed(e.target.checked)}
              disabled={loading || saveBusy}
            />
          </label>
          <label className="mosaic-creator-field">
            <span>seed</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={loading || saveBusy}
            />
          </label>
          <div className="mosaic-creator-actions">
            <button
              type="submit"
              className="mosaic-btn mosaic-btn--ghost"
              disabled={loading || saveBusy}
            >
              Generate with intent
            </button>
          </div>
        </form>
      </details>

      {loading ? (
        <p className="mosaic-creator-status" role="status">
          Generating…
        </p>
      ) : null}

      {run.status === "error" ? (
        <p className="mosaic-creator-status mosaic-creator-status--fail">
          {run.message}
        </p>
      ) : null}

      {preview ? (
        <section className="mosaic-creator-panel">
          <h2 className="mosaic-creator-h">Preview</h2>
          <p
            className={
              passed
                ? "mosaic-creator-verdict mosaic-creator-verdict--pass"
                : "mosaic-creator-verdict mosaic-creator-verdict--fail"
            }
            role="status"
          >
            {verdictLabel}
          </p>

          <dl className="mosaic-creator-dl">
            <div>
              <dt>Target</dt>
              <dd>{intent?.targetText ?? levelData?.targetText ?? "—"}</dd>
            </div>
            <div>
              <dt>Board size</dt>
              <dd>
                {levelData
                  ? `${levelData.rows} × ${levelData.cols}`
                  : intent
                    ? `${intent.boardSize.rows} × ${intent.boardSize.cols}`
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Piece count</dt>
              <dd>{levelData ? usedPieceCount(levelData) : "—"}</dd>
            </div>
            <div>
              <dt>Rotation count</dt>
              <dd>
                {intent?.rotateQuota ?? "—"}
                {levelData ? ` / rotatable ${rotatableLen}` : null}
              </dd>
            </div>
            <div>
              <dt>Creator Name</dt>
              <dd>{displayCreatorName}</dd>
            </div>
            <div>
              <dt>Developer</dt>
              <dd>{DEVELOPER_CREDIT}</dd>
            </div>
            {evaluatorResult ? (
              <>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{evaluatorResult.difficulty}</dd>
                </div>
                <div>
                  <dt>Quality Score</dt>
                  <dd>{evaluatorResult.score}</dd>
                </div>
              </>
            ) : null}
          </dl>

          {levelData ? (
            <div className="mosaic-creator-bits-wrap">
              <h3 className="mosaic-creator-h mosaic-creator-h--sub">
                Completed bit pattern
              </h3>
              <BitsPreview levelData={levelData} />
            </div>
          ) : null}

          {candidates && candidates.length > 0 ? (
            <div className="mosaic-creator-candidates-wrap">
              <h3 className="mosaic-creator-h mosaic-creator-h--sub">
                Candidates
              </h3>
              <ul className="mosaic-creator-candidates">
                {candidates.map((c) => {
                  const selected = c.index === preview.selectedIndex;
                  const cPass = c.evaluatorResult.passed;
                  return (
                    <li
                      key={c.index}
                      className={
                        selected
                          ? "mosaic-creator-candidate mosaic-creator-candidate--selected"
                          : "mosaic-creator-candidate"
                      }
                    >
                      <span className="mosaic-creator-candidate-idx">
                        #{c.index}
                        {selected ? " · selected" : null}
                      </span>
                      <span
                        className={
                          cPass
                            ? "mosaic-creator-candidate-verdict mosaic-creator-candidate-verdict--pass"
                            : "mosaic-creator-candidate-verdict mosaic-creator-candidate-verdict--fail"
                        }
                      >
                        {cPass ? "PASS" : "FAIL"}
                      </span>
                      <span className="mosaic-creator-candidate-meta">
                        score {c.evaluatorResult.score}
                        {" · "}
                        {c.evaluatorResult.difficulty}
                        {" · "}
                        {c.levelData.rows}×{c.levelData.cols}
                        {" · "}
                        {usedPieceCount(c.levelData)} pcs
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {passed && evaluatorResult ? (
            <div className="mosaic-creator-feedback mosaic-creator-feedback--pass">
              <h3 className="mosaic-creator-h">Quality feedback</h3>
              <dl className="mosaic-creator-dl">
                <div>
                  <dt>Quality Score</dt>
                  <dd>{evaluatorResult.score}</dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{evaluatorResult.difficulty}</dd>
                </div>
              </dl>
              <h3 className="mosaic-creator-h mosaic-creator-h--sub">Metrics</h3>
              <dl className="mosaic-creator-dl mosaic-creator-dl--metrics">
                {metricRows(evaluatorResult.metrics).map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {displayFailEval ? (
            <div className="mosaic-creator-feedback mosaic-creator-feedback--fail">
              <h3 className="mosaic-creator-h">Failed reasons</h3>
              {displayFailEval.reasons.length > 0 ? (
                <ul className="mosaic-creator-reasons">
                  {displayFailEval.reasons.map((code) => (
                    <li key={code}>
                      <code className="mosaic-creator-reason-code">{code}</code>
                      <span className="mosaic-creator-reason-label">
                        {reasonLabel(code)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mosaic-creator-status mosaic-creator-status--fail">
                  Evaluation failed (no reason codes).
                </p>
              )}
            </div>
          ) : null}

          {preview.errors && preview.errors.length > 0 ? (
            <ul className="mosaic-creator-list">
              {preview.errors.map((err) => (
                <li key={`${err.code}:${err.message}`}>
                  <code>{err.code}</code> — {err.message}
                </li>
              ))}
            </ul>
          ) : null}

          {!passed && preview.message && !displayFailEval ? (
            <p className="mosaic-creator-status mosaic-creator-status--fail">
              {preview.message}
            </p>
          ) : null}

          {canSave ? (
            <p className="mosaic-creator-play-link">
              <button
                type="button"
                className="mosaic-btn"
                onClick={onSave}
                disabled={saveBusy}
              >
                {saveBusy ? "Saving…" : "Save"}
              </button>
            </p>
          ) : null}

          {saveMessage ? (
            <p className="mosaic-creator-status mosaic-creator-status--fail">
              {saveMessage}
            </p>
          ) : null}

          {savedId ? (
            <>
              <p
                className="mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                role="status"
              >
                Saved as UserLevel · {savedId}
              </p>
              {savedRecord ? <ShareCodeRow record={savedRecord} /> : null}
              <p className="mosaic-creator-play-link">
                <a href={playHref(savedId)} className="mosaic-btn">
                  Play
                </a>
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="mosaic-creator-panel mosaic-creator-user-levels">
        <h2 className="mosaic-creator-h">My levels</h2>

        <form
          className="mosaic-creator-form mosaic-creator-share-import"
          onSubmit={onImportShareCode}
        >
          <label className="mosaic-creator-field mosaic-creator-field--primary">
            <span>Import Share Code</span>
            <input
              type="text"
              value={shareImportCode}
              onChange={(e) => setShareImportCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="MIAV-BB-XXXX-XXXX-…"
              disabled={shareImportBusy || loading || saveBusy}
            />
          </label>
          <div className="mosaic-creator-actions">
            <button
              type="submit"
              className="mosaic-btn mosaic-btn--ghost"
              disabled={shareImportBusy || loading || saveBusy}
            >
              {shareImportBusy ? "Importing…" : "Import / Restore"}
            </button>
          </div>
          {shareImportMessage ? (
            <p
              className={
                shareImportOk
                  ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                  : "mosaic-creator-status mosaic-creator-status--fail"
              }
              role="status"
            >
              {shareImportMessage}
            </p>
          ) : null}
        </form>

        {userLevels.length === 0 ? (
          <p className="mosaic-creator-status">
            No saved user levels yet. Generate and save one above.
          </p>
        ) : (
          <ul className="mosaic-creator-level-list">
            {userLevels.map((record) => {
              const title = displayUserLevelTitle(record);
              const text =
                record.levelData.targetText ||
                record.creatorIntent.targetText ||
                "—";
              const isEditing = editId === record.userLevelId;
              return (
                <li key={record.userLevelId} className="mosaic-creator-level-row">
                  <div className="mosaic-creator-level-meta">
                    <span className="mosaic-creator-level-title">{title}</span>
                    <span className="mosaic-creator-level-sub">
                      {text}
                      {" · "}
                      {record.published ? "Published" : "Draft"}
                      {" · "}
                      {formatCreatedAt(record.createdAt)}
                    </span>
                    <ShareCodeRow record={record} />
                    {isEditing ? (
                      <form
                        className="mosaic-creator-form mosaic-creator-publish-edit"
                        onSubmit={onSavePublishMeta}
                      >
                        <label className="mosaic-creator-field mosaic-creator-field--primary">
                          <span>Title</span>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            maxLength={80}
                            autoComplete="off"
                            disabled={editBusy}
                          />
                        </label>
                        <label className="mosaic-creator-field mosaic-creator-field--primary">
                          <span>Description</span>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={280}
                            rows={2}
                            autoComplete="off"
                            disabled={editBusy}
                          />
                        </label>
                        <label className="mosaic-creator-field mosaic-creator-field--primary mosaic-creator-field--check">
                          <span>Published</span>
                          <input
                            type="checkbox"
                            checked={editPublished}
                            onChange={(e) =>
                              setEditPublished(e.target.checked)
                            }
                            disabled={editBusy}
                          />
                        </label>
                        <div className="mosaic-creator-actions">
                          <button
                            type="submit"
                            className="mosaic-btn"
                            disabled={editBusy}
                          >
                            {editBusy ? "Saving…" : "Save publish info"}
                          </button>
                          <button
                            type="button"
                            className="mosaic-btn mosaic-btn--ghost"
                            disabled={editBusy}
                            onClick={() => {
                              setEditId(null);
                              setEditMessage(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {editMessage ? (
                          <p
                            className={
                              editMessage === "Publish info saved."
                                ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                                : "mosaic-creator-status mosaic-creator-status--fail"
                            }
                            role="status"
                          >
                            {editMessage}
                          </p>
                        ) : null}
                      </form>
                    ) : null}
                  </div>
                  <div className="mosaic-creator-level-actions">
                    {!isEditing ? (
                      <button
                        type="button"
                        className="mosaic-btn mosaic-btn--ghost mosaic-creator-level-play"
                        onClick={() => openPublishEdit(record)}
                      >
                        Edit
                      </button>
                    ) : null}
                    <a
                      href={playHref(record.userLevelId)}
                      className="mosaic-btn mosaic-btn--ghost mosaic-creator-level-play"
                    >
                      Play
                    </a>
                    <a
                      href={showcaseHref(record.userLevelId)}
                      className="mosaic-btn mosaic-btn--ghost mosaic-creator-level-play"
                    >
                      Showcase
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
