"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioManager } from "@/features/audio";
import {
  CHALLENGE_RESULT_COPIED_MESSAGE,
  CHALLENGE_RESULT_SHARE_FAILED_MESSAGE,
  shareOrCopyChallengeResult,
} from "@/games/binary-mosaic/progress/challengeResultShare";
import type { UserLevelRecord } from "@/games/binary-mosaic/progress/userLevels";
import { textToBits } from "@/games/binary-mosaic/puzzle/binaryText";
import {
  formatPatternStars,
  formatTime,
  patternStarsFromScore,
} from "@/games/binary-mosaic/puzzle/scoring";
import { FireworksCanvas } from "@/games/binary-mosaic/ui/FireworksCanvas";
import type { ClearPhase, PatternResult } from "@/games/binary-mosaic/types";

type Props = {
  active: boolean;
  onDone: () => void;
  onBackToLevels: () => void;
  /** User Challenge: restart the same puzzle (reset score/time/rotations). */
  onRetry?: () => void;
  /** When false, Victory Jingle is skipped (muted). */
  soundEnabled?: boolean;
  result: PatternResult | null;
  /** Campaign keeps legacy panel; user shows Challenge Cleared. */
  playMode?: "campaign" | "user";
  /** Successful rotate actions this run (display only; not a separate score term). */
  rotations?: number;
  /** Needed to rebuild the original Challenge Link for SHARE RESULT. */
  challengeRecord?: UserLevelRecord | null;
};

/**
 * Decoded + white flash → fireworks → Victory Jingle → result panel
 * Clear SE plays sequentially (no overlap); BGM is stopped before SE start.
 */
const PHASES: { phase: ClearPhase; ms: number }[] = [
  { phase: "reveal", ms: 550 },
  { phase: "fireworks", ms: 1600 },
  { phase: "victory", ms: 1600 },
  { phase: "done", ms: 0 },
];

const FIREWORKS_MS = 1600;

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function ClearSequence({
  active,
  onDone,
  onBackToLevels,
  onRetry,
  soundEnabled = false,
  result,
  playMode = "campaign",
  rotations = 0,
  challengeRecord = null,
}: Props) {
  const [phase, setPhase] = useState<ClearPhase>("idle");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<"ok" | "fail" | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const word = result?.decodedText ?? "";
  const trueBits = useMemo(
    () => (word ? textToBits(word) : []),
    [word],
  );
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setShareBusy(false);
      setShareStatus(null);
      setShareMessage(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const audio = AudioManager.getInstance();
      // BGM already stopped via setGameState("clear"); SE only here

      for (const step of PHASES) {
        if (cancelled) return;
        if (step.phase === "done") {
          setPhase("done");
          return;
        }

        setPhase(step.phase);

        if (step.phase === "reveal") {
          await Promise.all([
            waitMs(step.ms),
            soundRef.current ? audio.playSe("decoded") : Promise.resolve(),
          ]);
        } else if (step.phase === "fireworks") {
          await Promise.all([
            waitMs(step.ms),
            soundRef.current ? audio.playSe("firework") : Promise.resolve(),
          ]);
        } else if (step.phase === "victory") {
          if (soundRef.current) {
            await audio.playSe("victory");
          } else {
            await waitMs(step.ms);
          }
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active || phase === "idle") return null;

  const showDecoded =
    phase === "reveal" ||
    phase === "fireworks" ||
    phase === "victory" ||
    phase === "done";

  const isChallenge = playMode === "user" && result != null;
  const stars = result
    ? formatPatternStars(patternStarsFromScore(result.patternScore))
    : "";

  async function onShareResult() {
    if (!result || !challengeRecord || shareBusy) return;
    setShareBusy(true);
    setShareStatus(null);
    setShareMessage(null);
    const outcome = await shareOrCopyChallengeResult({
      result,
      rotations,
      record: challengeRecord,
    });
    setShareBusy(false);
    if (outcome.status === "aborted" || outcome.status === "shared") {
      return;
    }
    if (outcome.status === "copied") {
      setShareStatus("ok");
      setShareMessage(CHALLENGE_RESULT_COPIED_MESSAGE);
      return;
    }
    setShareStatus("fail");
    setShareMessage(outcome.error || CHALLENGE_RESULT_SHARE_FAILED_MESSAGE);
  }

  return (
    <div className={`mosaic-clear mosaic-clear--${phase}`} role="status">
      {phase === "reveal" ? (
        <div className="mosaic-clear-flash" aria-hidden="true" />
      ) : null}

      {phase === "fireworks" ? (
        <FireworksCanvas
          active
          durationMs={FIREWORKS_MS}
          sourceBits={trueBits}
        />
      ) : null}

      {showDecoded && word ? (
        <div className="mosaic-hello mosaic-hello--decoded">{word}</div>
      ) : null}

      {phase === "done" && result && isChallenge ? (
        <div className="mosaic-result mosaic-result--challenge">
          <h2 className="mosaic-result-challenge-title">Challenge Cleared</h2>
          <dl className="mosaic-result-challenge-stats">
            <div className="mosaic-result-challenge-hero">
              <div>
                <dt>Score</dt>
                <dd className="mosaic-result-challenge-score">
                  {result.patternScore}
                </dd>
              </div>
              <div>
                <dt>Stars</dt>
                <dd className="mosaic-result-challenge-stars" aria-label={stars}>
                  {stars}
                </dd>
              </div>
            </div>
            <div>
              <dt>Clear Time</dt>
              <dd>{formatTime(result.completionTimeSec)}</dd>
            </div>
            <div>
              <dt>Rotations</dt>
              <dd>{rotations}</dd>
            </div>
          </dl>
          <div className="mosaic-result-actions mosaic-result-challenge-actions">
            <button
              type="button"
              className="mosaic-btn"
              onClick={() => void onShareResult()}
              disabled={shareBusy || !challengeRecord}
            >
              {shareBusy ? "…" : "SHARE RESULT"}
            </button>
            <button
              type="button"
              className="mosaic-btn mosaic-btn--ghost"
              onClick={() => {
                void AudioManager.getInstance().playSe("button");
                onRetry?.();
              }}
              disabled={!onRetry}
            >
              RETRY
            </button>
            <a
              href="/game/binary-mosaic/creator"
              className="mosaic-btn mosaic-btn--ghost mosaic-result-create-link"
              onClick={() => AudioManager.getInstance().setGameState("menu")}
            >
              CREATE YOUR CHALLENGE
            </a>
            <p className="mosaic-result-create-hint">
              Create a puzzle and send one back.
            </p>
            <button
              type="button"
              className="mosaic-btn--levels"
              onClick={onBackToLevels}
            >
              Back to Levels
            </button>
          </div>
          {shareMessage ? (
            <p
              className={
                shareStatus === "ok"
                  ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
                  : "mosaic-creator-status mosaic-creator-status--fail"
              }
              role="status"
              style={{ whiteSpace: "pre-line" }}
            >
              {shareMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "done" && result && !isChallenge ? (
        <div className="mosaic-result">
          <dl>
            <div>
              <dt>Decoded</dt>
              <dd>{result.decodedText}</dd>
            </div>
            <div>
              <dt>Completion Time</dt>
              <dd>{formatTime(result.completionTimeSec)}</dd>
            </div>
            <div>
              <dt>Moves</dt>
              <dd>{result.moves}</dd>
            </div>
            <div>
              <dt>Hint</dt>
              <dd>{result.hintUses > 0 ? `×${result.hintUses}` : "OFF"}</dd>
            </div>
            <div className="mosaic-result-score">
              <dt>Pattern Score</dt>
              <dd>{result.patternScore}</dd>
            </div>
          </dl>
          <div className="mosaic-result-actions">
            <button type="button" className="mosaic-btn" onClick={onDone}>
              Continue
            </button>
            <button
              type="button"
              className="mosaic-btn--levels"
              onClick={onBackToLevels}
            >
              Back to Levels
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
