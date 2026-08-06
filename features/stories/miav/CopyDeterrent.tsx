"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  enabled: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function selectionInside(root: HTMLElement | null): boolean {
  if (!root) return false;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  if (!anchor || !focus) return false;
  return root.contains(anchor) && root.contains(focus);
}

function targetInside(root: HTMLElement | null, target: EventTarget | null) {
  return Boolean(root && target instanceof Node && root.contains(target));
}

/**
 * Light copy deterrence for chapter body only (ch.5+).
 * Does not block page chrome, links, buttons, or form fields.
 */
export function CopyDeterrent({ children, enabled }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  const showNotice = useCallback(() => {
    setNotice(true);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(false), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const blockClipboard = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      if (!selectionInside(rootRef.current)) return;
      event.preventDefault();
      showNotice();
    };

    const blockContext = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      if (!targetInside(rootRef.current, event.target)) return;
      event.preventDefault();
      showNotice();
    };

    const blockDrag = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      if (!targetInside(rootRef.current, event.target)) return;
      event.preventDefault();
    };

    const blockKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const copyCombo =
        ((event.ctrlKey || event.metaKey) && key === "c") ||
        (event.ctrlKey && event.key === "Insert");
      if (!copyCombo) return;
      if (!selectionInside(rootRef.current)) return;
      event.preventDefault();
      showNotice();
    };

    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("dragstart", blockDrag);
    document.addEventListener("keydown", blockKey);

    return () => {
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("dragstart", blockDrag);
      document.removeEventListener("keydown", blockKey);
    };
  }, [enabled, showNotice]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={rootRef} className="select-none">
      {children}
      {notice ? (
        <p
          className="mt-6 text-center text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]"
          role="status"
          aria-live="polite"
        >
          Copying is disabled for this chapter.
        </p>
      ) : null}
    </div>
  );
}
