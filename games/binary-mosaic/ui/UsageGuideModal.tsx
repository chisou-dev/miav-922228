"use client";

import { useEffect, useId, useRef } from "react";

type UsageGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

const GUIDE_SECTIONS = [
  {
    heading: "Play Campaign",
    body: "Play the 30 official levels. Clear one level to unlock the next.",
  },
  {
    heading: "Creator",
    body: "Enter a word to create a new Binary Block puzzle. Preview it, save it, play it, or copy its Share Code.",
  },
  {
    heading: "Challenge",
    body: "Paste a Share Code received from someone else and play their puzzle.",
  },
  {
    heading: "Collection",
    body: "View the puzzles saved in this browser.",
  },
  {
    heading: "Published",
    body: "View your locally saved puzzles marked as Published. Published puzzles are not uploaded to the internet.",
  },
  {
    heading: "No account required",
    body: "Your puzzles are stored only in this browser. Use a Share Code or Export to move them to another device.",
  },
] as const;

export function UsageGuideModal({ open, onClose }: UsageGuideModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mosaic-guide-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="mosaic-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mosaic-guide-header">
          <h2 id={titleId} className="mosaic-guide-title">
            How to use Binary Block
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="mosaic-btn mosaic-btn--ghost mosaic-guide-close"
            onClick={onClose}
            aria-label="Close how to use"
          >
            Close
          </button>
        </div>
        <ol className="mosaic-guide-list">
          {GUIDE_SECTIONS.map((section) => (
            <li key={section.heading} className="mosaic-guide-item">
              <h3 className="mosaic-guide-item-heading">{section.heading}</h3>
              <p className="mosaic-guide-item-body">{section.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
