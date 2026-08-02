"use client";

/**
 * Prominent Share / Copy Challenge Link button (Creator, My levels, Showcase, Challenge).
 * Mobile: navigator.share when available. PC / unsupported: copy to clipboard.
 */

import { useEffect, useState } from "react";
import {
  canUseWebShare,
  shareOrCopyChallengeLink,
} from "@/games/binary-mosaic/progress/challengeLink";
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
  const [webShare, setWebShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"ok" | "fail" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setWebShare(canUseWebShare());
  }, []);

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
      }, 1600);
      return;
    }
    setStatus("fail");
    setMessage(
      result.status === "too_large"
        ? result.error
        : result.error || CHALLENGE_LINK_COPY_FAILED_MESSAGE,
    );
  }

  const label = webShare ? "Share" : "Copy Challenge Link";

  return (
    <span className="mosaic-challenge-share-wrap">
      <button
        type="button"
        className={className}
        onClick={() => void onShare()}
        disabled={busy}
      >
        {busy ? "…" : label}
      </button>
      {message ? (
        <p
          className={
            status === "ok"
              ? "mosaic-creator-save-msg mosaic-creator-save-msg--ok"
              : "mosaic-creator-status mosaic-creator-status--fail"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </span>
  );
}
