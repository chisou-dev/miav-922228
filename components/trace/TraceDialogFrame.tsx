"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  /** When true, Escape calls onClose. Default true. */
  closeOnEscape?: boolean;
  /** When true, overlay click calls onClose. Default true. */
  closeOnOverlayClick?: boolean;
  /**
   * Optional Enter handler (e.g. confirm). Skipped when focus is on a link,
   * textarea, or checkbox/radio input.
   */
  onEnterConfirm?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared literary dialog shell for Trace Map (Welcome / Google Sign-In).
 * Portaled to document.body so Leaflet panes cannot cover it.
 * White surface, thin border, pale blue accents — fade only.
 */
export function TraceDialogFrame({
  open,
  title,
  eyebrow,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  onEnterConfirm,
  children,
  footer,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
    if (nodes.length === 0) return;

    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    window.setTimeout(() => first?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (closeOnEscape) onClose();
        return;
      }
      if (event.key === "Enter" && onEnterConfirm) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "A" || tag === "TEXTAREA") return;
        if (tag === "BUTTON") return;
        if (tag === "INPUT") {
          const type = (target as HTMLInputElement).type;
          if (type !== "checkbox" && type !== "radio") return;
        }
        event.preventDefault();
        onEnterConfirm();
        return;
      }
      trapFocus(event);
    };

    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, closeOnEscape, onEnterConfirm, trapFocus]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="trace-dialog-root fixed inset-0 z-[10000] flex items-center justify-center bg-[#243447]/28 px-4 opacity-100 transition-opacity duration-300"
      role="presentation"
      onClick={() => {
        if (closeOnOverlayClick) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="trace-dialog-panel max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto border border-[var(--map-line,#d5dee7)] bg-white px-6 py-7 text-[var(--map-ink,#243447)] shadow-none sm:px-8 sm:py-8"
        onClick={(event) => event.stopPropagation()}
      >
        {eyebrow ? (
          <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted,#6b7c8d)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2
          id={titleId}
          className={`${eyebrow ? "mt-3" : ""} text-[1.35rem] font-medium tracking-[0.04em] text-[var(--map-ink,#243447)]`}
        >
          {title}
        </h2>

        <div className="mt-6 space-y-5 text-[0.9rem] leading-[1.85] text-[var(--map-muted,#6b7c8d)]">
          {children}
        </div>

        {footer ? <div className="mt-10">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function TraceDialogPrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer text-[0.85rem] tracking-[0.12em] text-[var(--map-ink,#243447)] underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.5em] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function TraceDialogQuietButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer text-[0.78rem] tracking-[0.1em] text-[var(--map-muted,#6b7c8d)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function TraceDialogPolicyLinks() {
  return (
    <p className="flex flex-wrap gap-5 text-[0.72rem] tracking-[0.1em] text-[var(--map-muted,#6b7c8d)]">
      <a
        href="/privacy"
        className="underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em] hover:text-[var(--map-accent,#5b7c99)]"
      >
        Privacy Policy
      </a>
      <a
        href="/site-policy"
        className="underline decoration-[var(--map-line,#d5dee7)] underline-offset-[0.35em] hover:text-[var(--map-accent,#5b7c99)]"
      >
        Site Policy
      </a>
    </p>
  );
}
