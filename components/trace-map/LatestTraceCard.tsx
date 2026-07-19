"use client";

import {
  formatJoinedDate,
  type TraceLatestSummary,
} from "@/lib/trace/types";

type Props = {
  latest: TraceLatestSummary | null;
};

export function LatestTraceCard({ latest }: Props) {
  return (
    <div className="border-t border-[var(--map-line)] py-5">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
        Latest Trace
      </p>
      {latest ? (
        <dl className="mt-3 space-y-3 text-[0.88rem] text-[var(--map-ink)]">
          <div>
            <dt className="sr-only">MIAV ID</dt>
            <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
              {latest.miavId}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Country
              </dt>
              <dd className="mt-1">{latest.country}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                City
              </dt>
              <dd className="mt-1">{latest.city}</dd>
            </div>
          </div>
          <div>
            <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
              Message
            </dt>
            <dd className="mt-1 text-[var(--map-muted)]">
              {latest.messagePreview || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
              Joined
            </dt>
            <dd className="mt-1">{formatJoinedDate(latest.createdAt)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-[0.85rem] text-[var(--map-muted)]">—</p>
      )}
    </div>
  );
}
