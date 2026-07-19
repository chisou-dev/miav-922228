"use client";

import {
  formatJoinedDate,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  trace: TracePin | null;
};

export function SelectedTrace({ trace }: Props) {
  if (!trace) {
    return (
      <div className="shrink-0 border-t border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-5 sm:px-6">
        <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
          Selected Trace
        </p>
        <p className="mt-3 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          Choose a row above to read the full Trace.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-5 sm:px-6">
      <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
        Selected Trace
      </p>
      <p className="mt-2 font-mono text-[0.95rem] tracking-[0.06em] text-[var(--map-accent)]">
        {trace.miavId}
      </p>

      <dl className="mt-5 grid gap-4 border-t border-[var(--map-line)] pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Country
          </dt>
          <dd className="mt-1.5 text-[0.88rem] text-[var(--map-ink)]">
            {trace.country}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Region
          </dt>
          <dd className="mt-1.5 text-[0.88rem] text-[var(--map-ink)]">
            {trace.region}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            City
          </dt>
          <dd className="mt-1.5 text-[0.88rem] text-[var(--map-ink)]">
            {trace.city}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-[var(--map-line)] pt-5">
        <p className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
          Message
        </p>
        <p className="mt-2 text-[0.92rem] leading-[1.85] text-[var(--map-ink)]">
          {trace.message || "—"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--map-line)] pt-4">
        <div>
          <p className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Joined
          </p>
          <p className="mt-1.5 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
            {formatJoinedDate(trace.createdAt)}
          </p>
        </div>
        <p className="text-[0.68rem] tracking-[0.12em] text-[var(--map-muted)]">
          {trace.authType === "google" ? "Permanent Trace" : "Temporary Trace"}
        </p>
      </div>
    </div>
  );
}
