"use client";

import {
  formatJoinedDate,
  type TraceFirstSummary,
} from "@/lib/trace/types";

type Props = {
  first: TraceFirstSummary | null;
};

export function FirstTraceCard({ first }: Props) {
  return (
    <div className="border-t border-[var(--map-line)] py-5">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
        First Trace
      </p>
      {first ? (
        <dl className="mt-3 space-y-2 text-[0.88rem] text-[var(--map-ink)]">
          <div>
            <dt className="sr-only">MIAV ID</dt>
            <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
              {first.miavId}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
              Joined
            </dt>
            <dd className="mt-1">{formatJoinedDate(first.createdAt)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-[0.85rem] text-[var(--map-muted)]">—</p>
      )}
    </div>
  );
}
