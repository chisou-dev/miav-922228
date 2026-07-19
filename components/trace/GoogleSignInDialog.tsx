"use client";

import { useEffect, useId, useState } from "react";
import { GOOGLE_SIGNIN_DIALOG } from "@/lib/trace/policyCopy";

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
  const titleId = useId();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!open) {
      setAgreed(false);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#243447]/28 px-4"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto border border-[var(--map-line,#d5dee7)] bg-white px-6 py-7 text-[var(--map-ink,#243447)] shadow-none sm:px-8 sm:py-8"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted,#6b7c8d)] uppercase">
          Authentication
        </p>
        <h2
          id={titleId}
          className="mt-3 text-[1.35rem] font-medium tracking-[0.04em] text-[var(--map-ink,#243447)]"
        >
          {GOOGLE_SIGNIN_DIALOG.title}
        </h2>

        <div className="mt-6 space-y-5 text-[0.9rem] leading-[1.85] text-[var(--map-muted,#6b7c8d)]">
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
        </div>

        <label className="mt-8 flex cursor-pointer items-start gap-3 text-[0.85rem] leading-[1.7] text-[var(--map-ink,#243447)]">
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

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={onConfirm}
            className="cursor-pointer text-[0.85rem] tracking-[0.12em] text-[var(--map-ink,#243447)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.5em] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Continuing…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="cursor-pointer text-[0.78rem] tracking-[0.1em] text-[var(--map-muted,#6b7c8d)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
