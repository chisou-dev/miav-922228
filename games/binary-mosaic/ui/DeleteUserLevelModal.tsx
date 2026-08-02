"use client";

import { useEffect, useId, useRef } from "react";

type DeleteUserLevelModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

/**
 * Confirm before deleting a UserLevel. Escape / Cancel / backdrop → cancel.
 */
export function DeleteUserLevelModal({
  open,
  onCancel,
  onConfirm,
  busy = false,
}: DeleteUserLevelModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) onCancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel, busy]);

  if (!open) return null;

  return (
    <div
      className="mosaic-guide-backdrop mosaic-delete-backdrop"
      onClick={() => {
        if (!busy) onCancel();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="mosaic-guide-dialog mosaic-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="mosaic-delete-title">
          Delete this challenge?
        </h2>
        <p id={descId} className="mosaic-delete-body">
          This action cannot be undone.
        </p>
        <div className="mosaic-delete-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="mosaic-btn mosaic-btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="mosaic-btn mosaic-btn--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
