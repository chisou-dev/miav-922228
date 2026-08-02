"use client";

/**
 * UserLevel Showcase — present one saved UserLevel as a standalone work.
 *
 * getUserLevel(id) only. No Generator / Solver / Evaluator / Pipeline.
 * Play → existing `?user=` challenge flow. Share Code via encode APIs (display + copy).
 */

import { useEffect, useState } from "react";
import { usedPieceCount } from "@/games/binary-mosaic/core";
import {
  getChallengeFeedback,
  type ChallengeFeedbackRecord,
} from "@/games/binary-mosaic/progress/challengeFeedback";
import { encodeUserLevelShareCode } from "@/games/binary-mosaic/progress/shareCode";
import {
  CLIPBOARD_COPY_FAILED_MESSAGE,
  DEFAULT_PUBLISH_TITLE,
  DEVELOPER_CREDIT,
  DEVELOPER_HOME_URL,
  displayUserLevelTitle,
  getUserLevel,
  SHARE_CODE_COPIED_MESSAGE,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";
import { formatTime } from "@/games/binary-mosaic/puzzle/scoring";
import { ShareChallengeButton } from "@/games/binary-mosaic/ui/ShareChallengeButton";

function playHref(userLevelId: string): string {
  return `/game/binary-mosaic?user=${encodeURIComponent(userLevelId)}`;
}

function challengeTitle(record: UserLevelRecord): string {
  return displayUserLevelTitle(record) || DEFAULT_PUBLISH_TITLE;
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

function readUserLevelId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("user") || params.get("id");
  } catch {
    return null;
  }
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

function ShareCodeBlock({ record }: { record: UserLevelRecord }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    try {
      setCode(encodeUserLevelShareCode(record));
    } catch {
      setCode("");
    }
  }, [record.userLevelId, record.createdAt, record.seed, record.title, record.description, record.published, record.publishedAt]);

  async function onCopy() {
    if (!code) return;
    setCopyError(null);
    const ok = await copyText(code);
    if (!ok) {
      setCopied(false);
      setCopyError(CLIPBOARD_COPY_FAILED_MESSAGE);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!code) return null;

  return (
    <div className="mosaic-creator-share">
      <span className="mosaic-creator-share-label">Share Code</span>
      <code className="mosaic-creator-share-code" title={code}>
        {code}
      </code>
      <span className="mosaic-creator-field-hint mosaic-creator-share-hint">
        Copy this code and send it to someone. They can import it on another
        device.
      </span>
      <button
        type="button"
        className="mosaic-btn mosaic-btn--ghost mosaic-creator-share-copy"
        onClick={() => void onCopy()}
      >
        Copy Share Code
      </button>
      {copied ? (
        <p
          className="mosaic-creator-save-msg mosaic-creator-save-msg--ok"
          role="status"
        >
          {SHARE_CODE_COPIED_MESSAGE}
        </p>
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

function ClearedFeedback({ fb }: { fb: ChallengeFeedbackRecord }) {
  return (
    <>
      <div>
        <dt>Result</dt>
        <dd>Clear</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>{formatTime(fb.time)}</dd>
      </div>
      <div>
        <dt>Moves</dt>
        <dd>{fb.moves}</dd>
      </div>
      <div>
        <dt>Hints</dt>
        <dd>{fb.hintsUsed}</dd>
      </div>
    </>
  );
}

export function ShowcasePanel() {
  const [record, setRecord] = useState<UserLevelRecord | null | undefined>(
    undefined,
  );
  const [userLevelId, setUserLevelId] = useState<string | null>(null);

  useEffect(() => {
    const id = readUserLevelId();
    setUserLevelId(id);
    if (!id) {
      setRecord(null);
      return;
    }
    setRecord(getUserLevel(id) ?? null);
  }, []);

  const feedback =
    record != null ? getChallengeFeedback(record.userLevelId) : null;
  const cleared = feedback?.clear === true ? feedback : null;

  return (
    <div className="mosaic-root mosaic-showcase">
      <div className="mosaic-chrome mosaic-chrome--select">
        <a href="/game/binary-mosaic" className="mosaic-chrome-link">
          ← Levels
        </a>
        <span className="mosaic-chrome-title">Showcase</span>
        <a
          href="/game/binary-mosaic/challenge?tab=collection"
          className="mosaic-chrome-link mosaic-chrome-sound"
        >
          Collection
        </a>
      </div>

      <p className="mosaic-lead">
        A single UserLevel as a standalone work — metadata and Share Code only.
        Start Challenge opens the saved snapshot (no re-evaluation).
      </p>

      {record === undefined ? (
        <p className="mosaic-creator-status">Loading…</p>
      ) : record == null ? (
        <section
          className="mosaic-creator-panel mosaic-challenge-card"
          aria-label="Showcase missing"
        >
          <h2 className="mosaic-creator-h mosaic-challenge-title">
            UserLevel not found
          </h2>
          <p className="mosaic-creator-status">
            {userLevelId
              ? `No saved UserLevel for “${userLevelId}”. Import a Share Code or open a level from Collection.`
              : "Open with ?user=<userLevelId>."}
          </p>
          <div className="mosaic-creator-actions mosaic-challenge-play">
            <a
              href="/game/binary-mosaic/challenge?tab=collection"
              className="mosaic-btn mosaic-btn--ghost"
            >
              Collection
            </a>
            <a
              href="/game/binary-mosaic/creator"
              className="mosaic-btn mosaic-btn--ghost"
            >
              Creator
            </a>
          </div>
        </section>
      ) : (
        <section
          className="mosaic-creator-panel mosaic-challenge-card"
          aria-label="UserLevel showcase"
        >
          <h2 className="mosaic-creator-h mosaic-challenge-title">
            {cleared ? (
              <span
                className="mosaic-challenge-cleared-badge"
                aria-label="Cleared"
              >
                Cleared
              </span>
            ) : null}
            {challengeTitle(record)}
          </h2>

          <dl className="mosaic-creator-dl">
            {record.description ? (
              <div>
                <dt>Description</dt>
                <dd>{record.description}</dd>
              </div>
            ) : null}
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
              <dd>
                <a
                  href={DEVELOPER_HOME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mosaic-developer-link"
                >
                  {record.developerCredit || DEVELOPER_CREDIT}
                </a>
              </dd>
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
            {cleared ? <ClearedFeedback fb={cleared} /> : null}
          </dl>

          <ShareCodeBlock record={record} />

          <div className="mosaic-creator-actions mosaic-challenge-play">
            <a href={playHref(record.userLevelId)} className="mosaic-btn">
              Start Challenge
            </a>
            <ShareChallengeButton record={record} />
            <a
              href="/game/binary-mosaic/challenge?tab=collection"
              className="mosaic-btn mosaic-btn--ghost"
            >
              Collection
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
