"use client";

import { useRef, type TouchEvent } from "react";
import { formatJoinedDate, type TracePin } from "@/lib/trace/types";
import { formatMessageFull } from "@/lib/trace/messagePolicy";

type Props = {
  trace: TracePin;
  locationLabel: string;
  pinned: boolean;
  onClose: () => void;
  onHoverStay?: () => void;
  onHoverLeave?: () => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
};

/**
 * Reader Memory card — public fields only.
 * Never render trace.id, uid, email, IP, or coordinates.
 */
export function SelectedTrace({
  trace,
  locationLabel,
  pinned,
  onClose,
  onHoverStay,
  onHoverLeave,
  onSwipePrev,
  onSwipeNext,
}: Props) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const fullMemory = formatMessageFull(trace.message);

  function onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) onSwipeNext?.();
    else onSwipePrev?.();
  }

  return (
    <div
      role="dialog"
      aria-label={`Memory ${trace.miavId}`}
      aria-modal={pinned || undefined}
      className="pointer-events-auto w-[min(100%,22rem)] border border-[var(--map-line)] bg-[var(--map-panel)] shadow-[0_12px_40px_rgba(36,52,71,0.14)]"
      onMouseEnter={onHoverStay}
      onMouseLeave={onHoverLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--map-line)] px-4 py-3">
        <div>
          <p className="font-mono text-[0.92rem] tracking-[0.06em] text-[var(--map-accent)]">
            {trace.miavId}
          </p>
          <p className="mt-1.5 text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)]">
            {formatJoinedDate(trace.createdAt)}
          </p>
          {locationLabel ? (
            <p className="mt-1 text-[0.78rem] tracking-[0.03em] text-[var(--map-muted)]">
              {locationLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
        >
          Close
        </button>
      </div>

      <div className="max-h-[min(40vh,20rem)] overflow-y-auto px-4 py-4">
        <p className="text-[0.62rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
          Memory
        </p>
        {fullMemory ? (
          <p className="mt-2 whitespace-pre-wrap break-words text-[0.95rem] leading-[1.85] text-[var(--map-ink)]">
            {`“${fullMemory}”`}
          </p>
        ) : (
          <p className="mt-2 text-[0.95rem] text-[var(--map-muted)]">—</p>
        )}
      </div>

      <p className="border-t border-[var(--map-line)] px-4 py-2.5 text-[0.68rem] tracking-[0.08em] text-[var(--map-muted)] md:hidden">
        Swipe left / right for more memories
      </p>
    </div>
  );
}
