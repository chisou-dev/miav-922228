"use client";

/**
 * UserLevel Challenge Mode (Phase2-20) + Collection (Phase3-1)
 * + Featured Challenge (Phase3-2) + Published Collection.
 *
 * Share Code → importUserLevelFromShareCode (no re-eval) → metadata card → Play.
 * Collection → listUserLevels() → select → same card → Play (`?user=`).
 * Published → listPublishedUserLevels() → select → Showcase (`?user=`).
 * Featured → listFeaturedLevels() → select → same card → Play (`?user=`).
 * Does not call Generator / Solver / Evaluator / Pipeline.
 */

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { usedPieceCount } from "@/games/binary-mosaic/core";
import {
  addFeatured,
  isFeatured,
  listFeatured,
  listFeaturedLevels,
  removeFeatured,
} from "@/games/binary-mosaic/progress/featuredChallenges";
import {
  getChallengeFeedback,
  type ChallengeFeedbackRecord,
} from "@/games/binary-mosaic/progress/challengeFeedback";
import {
  importUserLevelFromShareCode,
  type ImportShareCodeResult,
} from "@/games/binary-mosaic/progress/shareCode";
import {
  DEVELOPER_CREDIT,
  displayUserLevelTitle,
  listPublishedUserLevels,
  listUserLevels,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";
import { formatTime } from "@/games/binary-mosaic/puzzle/scoring";

type ChallengeTab = "import" | "collection" | "published" | "featured";

function playHref(userLevelId: string): string {
  return `/game/binary-mosaic?user=${encodeURIComponent(userLevelId)}`;
}

function showcaseHref(userLevelId: string): string {
  return `/game/binary-mosaic/showcase?user=${encodeURIComponent(userLevelId)}`;
}

function challengeTitle(record: UserLevelRecord): string {
  return displayUserLevelTitle(record);
}

function challengeTarget(record: UserLevelRecord): string {
  return (
    record.levelData.targetText ||
    record.creatorIntent.targetText ||
    "—"
  );
}

function rotationCount(record: UserLevelRecord): string {
  const rotatable =
    record.levelData.rotatablePieceIndices?.length ?? 0;
  const quota = record.creatorIntent.rotateQuota;
  return `${rotatable} / intent ${quota}`;
}

function feedbackSummary(fb: ChallengeFeedbackRecord): string {
  const status = fb.clear ? "Clear" : "Failed";
  return `${status} · ${formatTime(fb.time)} · ${fb.moves} moves · ${fb.hintsUsed} hints`;
}

function importFailMessage(
  result: Extract<ImportShareCodeResult, { ok: false }>,
): string {
  if (result.error) return result.error;
  switch (result.reason) {
    case "INVALID_PREFIX":
      return "Share Code must start with MIAV-BB-.";
    case "INVALID_FORMAT":
      return "Share Code format looks invalid.";
    case "DECODE_ERROR":
      return "Broken Share Code. Could not decode.";
    case "PARSE_ERROR":
      return "Could not parse Share Code payload.";
    case "INVALID_SHAPE":
    case "UNSUPPORTED_SCHEMA":
      return "Share Code payload is not a valid UserLevel.";
    case "NOT_FOUND":
      return "Short code not found on this device.";
    case "STORAGE_UNAVAILABLE":
      return "Storage unavailable. Changes could not be saved.";
    case "SAVE_FAILED":
    case "QUOTA":
      return "Storage is full. Delete an old level and try again.";
    case "LEVEL_LIMIT":
      return "Level limit reached. Delete a level before saving another.";
    default:
      return `Import failed · ${result.reason}`;
  }
}

function readInitialTab(): ChallengeTab {
  try {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "collection") return "collection";
    if (tab === "published") return "published";
    if (tab === "featured") return "featured";
  } catch {
    /* ignore */
  }
  return "import";
}

function formatPublishedAt(publishedAt: string | null): string {
  if (!publishedAt) return "—";
  try {
    return new Date(publishedAt).toLocaleString();
  } catch {
    return publishedAt;
  }
}

function ChallengeListItem({
  record,
  onSelect,
}: {
  record: UserLevelRecord;
  onSelect: () => void;
}) {
  const feedback = getChallengeFeedback(record.userLevelId);
  return (
    <li>
      <button
        type="button"
        className={`mosaic-challenge-list-btn${feedback?.clear ? " is-cleared" : ""}`}
        onClick={onSelect}
      >
        <span className="mosaic-challenge-list-title">
          {feedback?.clear ? (
            <span className="mosaic-challenge-cleared-badge" aria-label="Cleared">
              Cleared
            </span>
          ) : null}
          {challengeTitle(record)}
        </span>
        <span className="mosaic-challenge-list-meta">
          {challengeTarget(record)}
          {" · "}
          {record.creatorName}
          {" · "}
          {record.developerCredit || DEVELOPER_CREDIT}
        </span>
        <span className="mosaic-challenge-list-meta">
          {record.evaluatorResult.difficulty}
          {" · score "}
          {record.evaluatorResult.score}
          {" · pieces "}
          {usedPieceCount(record.levelData)}
          {" · rot "}
          {rotationCount(record)}
        </span>
        {feedback ? (
          <span className="mosaic-challenge-list-meta mosaic-challenge-feedback">
            {feedbackSummary(feedback)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/** Published Collection row — opens Showcase on select (no detail card). */
function PublishedListItem({ record }: { record: UserLevelRecord }) {
  const feedback = getChallengeFeedback(record.userLevelId);
  return (
    <li>
      <a
        href={showcaseHref(record.userLevelId)}
        className={`mosaic-challenge-list-btn${feedback?.clear ? " is-cleared" : ""}`}
      >
        <span className="mosaic-challenge-list-title">
          {feedback?.clear ? (
            <span className="mosaic-challenge-cleared-badge" aria-label="Cleared">
              Cleared
            </span>
          ) : null}
          {challengeTitle(record)}
        </span>
        <span className="mosaic-challenge-list-meta">
          {record.creatorName}
          {" · "}
          {record.developerCredit || DEVELOPER_CREDIT}
          {" · "}
          {challengeTarget(record)}
        </span>
        <span className="mosaic-challenge-list-meta">
          {record.evaluatorResult.difficulty}
          {" · score "}
          {record.evaluatorResult.score}
          {" · pieces "}
          {usedPieceCount(record.levelData)}
          {" · rot "}
          {rotationCount(record)}
        </span>
        <span className="mosaic-challenge-list-meta">
          Published {formatPublishedAt(record.publishedAt)}
        </span>
        {feedback ? (
          <span className="mosaic-challenge-list-meta mosaic-challenge-feedback">
            {feedbackSummary(feedback)}
          </span>
        ) : null}
      </a>
    </li>
  );
}

/** Phase2-20 Challenge card — reused for import / Collection / Featured detail. */
function ChallengeCard({
  record,
  ariaLabel,
  onBack,
  backLabel = "← Collection",
  featured,
  onToggleFeatured,
  featuredMessage,
}: {
  record: UserLevelRecord;
  ariaLabel: string;
  onBack?: () => void;
  backLabel?: string;
  featured: boolean;
  onToggleFeatured?: () => void;
  featuredMessage?: string | null;
}) {
  const feedback = getChallengeFeedback(record.userLevelId);
  return (
    <section
      className="mosaic-creator-panel mosaic-challenge-card"
      aria-label={ariaLabel}
    >
      {onBack ? (
        <button
          type="button"
          className="mosaic-btn mosaic-btn--ghost mosaic-challenge-back"
          onClick={onBack}
        >
          {backLabel}
        </button>
      ) : null}

      <h2 className="mosaic-creator-h mosaic-challenge-title">
        {feedback?.clear ? (
          <span className="mosaic-challenge-cleared-badge" aria-label="Cleared">
            Cleared
          </span>
        ) : null}
        {challengeTitle(record)}
      </h2>

      <dl className="mosaic-creator-dl">
        <div>
          <dt>Target</dt>
          <dd>{challengeTarget(record)}</dd>
        </div>
        <div>
          <dt>Creator Name</dt>
          <dd>{record.creatorName}</dd>
        </div>
        <div>
          <dt>Developer</dt>
          <dd>{record.developerCredit || DEVELOPER_CREDIT}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{record.evaluatorResult.difficulty}</dd>
        </div>
        <div>
          <dt>Quality Score</dt>
          <dd>{record.evaluatorResult.score}</dd>
        </div>
        <div>
          <dt>Piece count</dt>
          <dd>{usedPieceCount(record.levelData)}</dd>
        </div>
        <div>
          <dt>Rotation count</dt>
          <dd>{rotationCount(record)}</dd>
        </div>
        {feedback ? (
          <>
            <div>
              <dt>Result</dt>
              <dd>{feedback.clear ? "Clear" : "Failed"}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{formatTime(feedback.time)}</dd>
            </div>
            <div>
              <dt>Moves</dt>
              <dd>{feedback.moves}</dd>
            </div>
            <div>
              <dt>Hints</dt>
              <dd>{feedback.hintsUsed}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mosaic-creator-actions mosaic-challenge-play">
        <a href={playHref(record.userLevelId)} className="mosaic-btn">
          Play
        </a>
        <a
          href={showcaseHref(record.userLevelId)}
          className="mosaic-btn mosaic-btn--ghost"
        >
          Showcase
        </a>
        {onToggleFeatured ? (
          <button
            type="button"
            className="mosaic-btn mosaic-btn--ghost"
            onClick={onToggleFeatured}
          >
            {featured ? "Remove from Featured" : "Add to Featured"}
          </button>
        ) : null}
      </div>
      {featuredMessage ? (
        <p
          className="mosaic-creator-status mosaic-creator-status--fail"
          role="status"
        >
          {featuredMessage}
        </p>
      ) : null}
    </section>
  );
}

export function ChallengePanel() {
  const [tab, setTab] = useState<ChallengeTab>("import");
  const [shareCode, setShareCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [imported, setImported] = useState<UserLevelRecord | null>(null);
  const [collection, setCollection] = useState<UserLevelRecord[]>([]);
  const [published, setPublished] = useState<UserLevelRecord[]>([]);
  const [featuredLevels, setFeaturedLevels] = useState<UserLevelRecord[]>([]);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<UserLevelRecord | null>(null);
  const [featuredMessage, setFeaturedMessage] = useState<string | null>(null);
  const refreshCollection = useCallback(() => {
    setCollection(listUserLevels());
  }, []);

  const refreshPublished = useCallback(() => {
    setPublished(listPublishedUserLevels());
  }, []);

  const refreshFeatured = useCallback(() => {
    setFeaturedLevels(listFeaturedLevels());
    setFeaturedIds(new Set(listFeatured().map((e) => e.userLevelId)));
  }, []);

  useEffect(() => {
    setTab(readInitialTab());
    refreshCollection();
    refreshPublished();
    refreshFeatured();
  }, [refreshCollection, refreshPublished, refreshFeatured]);

  const selectTab = useCallback(
    (next: ChallengeTab) => {
      setTab(next);
      setSelected(null);
      if (next === "collection") {
        refreshCollection();
      }
      if (next === "published") {
        refreshPublished();
      }
      if (next === "featured") {
        refreshFeatured();
      }
      try {
        const url = new URL(window.location.href);
        if (
          next === "collection" ||
          next === "published" ||
          next === "featured"
        ) {
          url.searchParams.set("tab", next);
        } else {
          url.searchParams.delete("tab");
        }
        window.history.replaceState(null, "", url.pathname + url.search);
      } catch {
        /* ignore */
      }
    },
    [refreshCollection, refreshPublished, refreshFeatured],
  );

  const onImport = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const code = shareCode.trim();
      if (!code) {
        setOk(false);
        setMessage("Paste a Share Code first.");
        return;
      }
      setBusy(true);
      setMessage(null);
      setOk(false);
      window.setTimeout(() => {
        try {
          const result = importUserLevelFromShareCode(code);
          if (!result.ok) {
            setOk(false);
            setMessage(importFailMessage(result));
            setBusy(false);
            return;
          }
          setImported(result.record);
          setOk(true);
          setMessage(
            result.upserted
              ? "Restored challenge (updated existing id)."
              : "Challenge imported.",
          );
          setShareCode("");
          refreshCollection();
          refreshPublished();
          setBusy(false);
        } catch (err) {
          setOk(false);
          setMessage(err instanceof Error ? err.message : String(err));
          setBusy(false);
        }
      }, 0);
    },
    [shareCode, refreshCollection, refreshPublished],
  );

  const toggleFeatured = useCallback(
    (record: UserLevelRecord) => {
      setFeaturedMessage(null);
      const wasFeatured = isFeatured(record.userLevelId);
      if (wasFeatured) {
        const result = removeFeatured(record.userLevelId);
        if (!result.ok) {
          setFeaturedMessage(result.error);
          return;
        }
      } else {
        const result = addFeatured(record.userLevelId);
        if (!result.ok) {
          setFeaturedMessage(result.error);
          return;
        }
      }
      refreshFeatured();
      if (tab === "featured" && wasFeatured) {
        setSelected(null);
      }
    },
    [refreshFeatured, tab],
  );

  const importedFeatured = imported
    ? featuredIds.has(imported.userLevelId)
    : false;
  const selectedFeatured = selected
    ? featuredIds.has(selected.userLevelId)
    : false;

  return (
    <div className="mosaic-root mosaic-challenge">
      <div className="mosaic-chrome mosaic-chrome--select">
        <a href="/game/binary-mosaic" className="mosaic-chrome-link">
          ← Levels
        </a>
        <span className="mosaic-chrome-title">Challenge</span>
        <a
          href="/game/binary-mosaic/creator"
          className="mosaic-chrome-link mosaic-chrome-sound"
        >
          Creator
        </a>
      </div>

      <p className="mosaic-lead">
        Import a Share Code, browse Collection or Published, or open Featured
        challenges. Play uses the saved UserLevel snapshot — no re-evaluation.
      </p>

      <div className="mosaic-challenge-tabs" role="tablist" aria-label="Challenge">
        <button
          type="button"
          role="tab"
          id="challenge-tab-import"
          aria-selected={tab === "import"}
          aria-controls="challenge-panel-import"
          className={`mosaic-challenge-tab${tab === "import" ? " is-active" : ""}`}
          onClick={() => selectTab("import")}
        >
          Import
        </button>
        <button
          type="button"
          role="tab"
          id="challenge-tab-collection"
          aria-selected={tab === "collection"}
          aria-controls="challenge-panel-collection"
          className={`mosaic-challenge-tab${tab === "collection" ? " is-active" : ""}`}
          onClick={() => selectTab("collection")}
        >
          Collection
        </button>
        <button
          type="button"
          role="tab"
          id="challenge-tab-published"
          aria-selected={tab === "published"}
          aria-controls="challenge-panel-published"
          className={`mosaic-challenge-tab${tab === "published" ? " is-active" : ""}`}
          onClick={() => selectTab("published")}
        >
          Published
        </button>
        <button
          type="button"
          role="tab"
          id="challenge-tab-featured"
          aria-selected={tab === "featured"}
          aria-controls="challenge-panel-featured"
          className={`mosaic-challenge-tab${tab === "featured" ? " is-active" : ""}`}
          onClick={() => selectTab("featured")}
        >
          Featured
        </button>
      </div>

      {tab === "import" ? (
        <div
          id="challenge-panel-import"
          role="tabpanel"
          aria-labelledby="challenge-tab-import"
        >
          <form
            className="mosaic-creator-form mosaic-creator-form--primary mosaic-challenge-import"
            onSubmit={onImport}
          >
            <label className="mosaic-creator-field mosaic-creator-field--primary">
              <span>Share Code</span>
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="MIAV-BB-XXXX-XXXX-…"
                disabled={busy}
                autoFocus
              />
            </label>
            <div className="mosaic-creator-actions">
              <button
                type="submit"
                className="mosaic-btn"
                disabled={busy}
              >
                {busy ? "Importing…" : "Import / Restore"}
              </button>
            </div>
            {message ? (
              <p
                className={
                  ok
                    ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                    : "mosaic-creator-status mosaic-creator-status--fail"
                }
                role="status"
              >
                {message}
              </p>
            ) : null}
          </form>

          {imported ? (
            <ChallengeCard
              record={imported}
              ariaLabel="Imported challenge"
              featured={importedFeatured}
              onToggleFeatured={() => toggleFeatured(imported)}
              featuredMessage={featuredMessage}
            />
          ) : (
            <p className="mosaic-creator-status">
              Import a Share Code to see the challenge card.
            </p>
          )}
        </div>
      ) : tab === "published" ? (
        <div
          id="challenge-panel-published"
          role="tabpanel"
          aria-labelledby="challenge-tab-published"
        >
          <section
            className="mosaic-creator-panel mosaic-challenge-collection"
            aria-label="Published Challenges"
          >
            <h2 className="mosaic-creator-h">Published Challenges</h2>
            {published.length === 0 ? (
              <p className="mosaic-creator-status">
                No published challenges yet. Mark a UserLevel as Published in
                Creator to list it here.
              </p>
            ) : (
              <ul className="mosaic-challenge-list">
                {published.map((record) => (
                  <PublishedListItem
                    key={record.userLevelId}
                    record={record}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : tab === "featured" ? (
        selected ? (
          <div
            id="challenge-panel-featured"
            role="tabpanel"
            aria-labelledby="challenge-tab-featured"
          >
            <ChallengeCard
              record={selected}
              ariaLabel="Featured challenge detail"
              onBack={() => setSelected(null)}
              backLabel="← Featured"
              featured={selectedFeatured}
              onToggleFeatured={() => toggleFeatured(selected)}
              featuredMessage={featuredMessage}
            />
          </div>
        ) : (
          <div
            id="challenge-panel-featured"
            role="tabpanel"
            aria-labelledby="challenge-tab-featured"
          >
            <section
              className="mosaic-creator-panel mosaic-challenge-collection"
              aria-label="Featured Challenges"
            >
              <h2 className="mosaic-creator-h">Featured Challenges</h2>
              {featuredLevels.length === 0 ? (
                <p className="mosaic-creator-status">
                  No featured challenges yet. Open Collection (or an imported
                  card) and choose Add to Featured.
                </p>
              ) : (
                <ul className="mosaic-challenge-list">
                  {featuredLevels.map((record) => (
                    <ChallengeListItem
                      key={record.userLevelId}
                      record={record}
                      onSelect={() => setSelected(record)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )
      ) : selected ? (
        <div
          id="challenge-panel-collection"
          role="tabpanel"
          aria-labelledby="challenge-tab-collection"
        >
          <ChallengeCard
            record={selected}
            ariaLabel="Challenge detail"
            onBack={() => setSelected(null)}
            featured={selectedFeatured}
            onToggleFeatured={() => toggleFeatured(selected)}
            featuredMessage={featuredMessage}
          />
        </div>
      ) : (
        <div
          id="challenge-panel-collection"
          role="tabpanel"
          aria-labelledby="challenge-tab-collection"
        >
          <section
            className="mosaic-creator-panel mosaic-challenge-collection"
            aria-label="Challenge Collection"
          >
            <h2 className="mosaic-creator-h">My Challenges</h2>
            {collection.length === 0 ? (
              <p className="mosaic-creator-status">
                No saved challenges yet. Create one in Creator, or Import a
                Share Code.
              </p>
            ) : (
              <ul className="mosaic-challenge-list">
                {collection.map((record) => (
                  <ChallengeListItem
                    key={record.userLevelId}
                    record={record}
                    onSelect={() => setSelected(record)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
