"use client";

/**
 * Unified SHARE button (Creator, My levels, Showcase, Challenge).
 * Label is always SHARE. navigator.share when available; else copy Challenge Link.
 */

import { useState } from "react";
import { shareOrCopyChallengeLink } from "@/games/binary-mosaic/progress/challengeLink";
import {
  CHALLENGE_LINK_COPIED_MESSAGE,
  CHALLENGE_LINK_COPY_FAILED_MESSAGE,
  type UserLevelRecord,
} from "@/games/binary-mosaic/progress/userLevels";

export function ShareChallengeButton({
  record,
  className = "mosaic-btn",
}: {
  record: UserLevelRecord;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"ok" | "fail" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onShare() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    setMessage(null);
    const result = await shareOrCopyChallengeLink(record);
    setBusy(false);
    if (result.status === "aborted" || result.status === "shared") {
      return;
    }
    if (result.status === "copied") {
      setStatus("ok");
      setMessage(CHALLENGE_LINK_COPIED_MESSAGE);
      window.setTimeout(() => {
        setStatus(null);
        setMessage(null);
      }, 2800);
      return;
    }
    setStatus("fail");
    setMessage(
      result.status === "too_large"
        ? result.error
        : result.error || CHALLENGE_LINK_COPY_FAILED_MESSAGE,
    );
  }

  return (
    <span className="mosaic-challenge-share-wrap">
      <button
        type="button"
        className={className}
        onClick={() => void onShare()}
        disabled={busy}
      >
        {busy ? "…" : "SHARE"}
      </button>
      {message ? (
        <p
          className={
            status === "ok"
              ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
              : "mosaic-creator-status mosaic-creator-status--fail"
          }
          role="status"
          style={{ whiteSpace: "pre-line" }}
        >
          {message}
        </p>
      ) : null}
    </span>
  );
}
