"use client";

import { useEffect, useState } from "react";
import { GOOGLE_SIGNIN_DIALOG } from "@/lib/trace/policyCopy";
import {
  TraceDialogFrame,
  TraceDialogPrimaryButton,
  TraceDialogQuietButton,
} from "@/components/trace/TraceDialogFrame";

type Props = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function GoogleSignInDialog({
  open,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) setAgreed(false);
  }, [open]);

  return (
    <TraceDialogFrame
      open={open}
      title={GOOGLE_SIGNIN_DIALOG.title}
      eyebrow="Authentication"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="space-y-8">
          <label className="flex cursor-pointer items-start gap-3 text-[0.85rem] leading-[1.7] text-[var(--map-ink,#243447)]">
            <input
              type="checkbox"
              checked={agreed}
              disabled={busy}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#5b7c99]"
            />
            <span>
              I have read and agree to the{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--map-accent,#5b7c99)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em]"
                onClick={(event) => event.stopPropagation()}
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="/site-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--map-accent,#5b7c99)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em]"
                onClick={(event) => event.stopPropagation()}
              >
                Site Policy
              </a>
              .
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-6">
            <TraceDialogPrimaryButton
              disabled={!agreed || busy}
              onClick={onConfirm}
            >
              {busy ? "Continuing…" : "Continue with Google"}
            </TraceDialogPrimaryButton>
            <TraceDialogQuietButton
              disabled={busy}
              onClick={() => {
                if (!busy) onClose();
              }}
            >
              Cancel
            </TraceDialogQuietButton>
          </div>
        </div>
      }
    >
      <p>{GOOGLE_SIGNIN_DIALOG.intro}</p>

      <div>
        <p className="text-[var(--map-ink,#243447)]">
          {GOOGLE_SIGNIN_DIALOG.doesNotStoreHeading}
        </p>
        <ul className="mt-3 list-none space-y-1.5">
          {GOOGLE_SIGNIN_DIALOG.doesNotStore.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <p>{GOOGLE_SIGNIN_DIALOG.uidNote}</p>
      <p>{GOOGLE_SIGNIN_DIALOG.neverAccess}</p>
      <p>{GOOGLE_SIGNIN_DIALOG.responsibility}</p>
      <p>{GOOGLE_SIGNIN_DIALOG.noEdit}</p>
      <p>{GOOGLE_SIGNIN_DIALOG.removal}</p>
    </TraceDialogFrame>
  );
}
