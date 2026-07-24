"use client";

import {
  formatJoinedDate,
  previewMessage,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  /** Current user's Trace only — never another visitor's. */
  mine: TracePin | null;
};

/**
 * Logged-in visitor's own Trace (current place + message).
 * Hidden when signed out or when the user has no Trace.
 */
export function LatestTraceCard({ mine }: Props) {
  if (!mine) return null;

  return (
    <div className="border-t border-[var(--map-line)] py-5">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
        Your Latest Trace
      </p>
      <dl className="mt-3 space-y-3 text-[0.88rem] text-[var(--map-ink)]">
        <div>
          <dt className="sr-only">MIAV ID</dt>
          <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
            {mine.miavId}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
              Country
            </dt>
            <dd className="mt-1">{mine.country}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
              City
            </dt>
            <dd className="mt-1">{mine.city}</dd>
          </div>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
            Memory
          </dt>
          <dd className="mt-1 text-[var(--map-muted)]">
            {previewMessage(mine.message) || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
            Joined
          </dt>
          <dd className="mt-1">{formatJoinedDate(mine.createdAt)}</dd>
        </div>
        <p className="text-[0.68rem] tracking-[0.12em] text-[var(--map-muted)]">
          {mine.authType === "google" ? "Permanent Trace" : "Temporary Trace"}
        </p>
      </dl>
    </div>
  );
}
