"use client";

import {
  formatJoinedDate,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  /** Current user's Trace only — never another visitor's. */
  mine: TracePin | null;
};

/**
 * Logged-in visitor's own first Trace (Joined date).
 * Hidden when signed out or when the user has no Trace.
 */
export function FirstTraceCard({ mine }: Props) {
  if (!mine) return null;

  return (
    <div className="border-t border-[var(--map-line)] py-5">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
        Your First Trace
      </p>
      <dl className="mt-3 space-y-2 text-[0.88rem] text-[var(--map-ink)]">
        <div>
          <dt className="sr-only">MIAV ID</dt>
          <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
            {mine.miavId}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
            Joined
          </dt>
          <dd className="mt-1">{formatJoinedDate(mine.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
