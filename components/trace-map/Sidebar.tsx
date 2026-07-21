"use client";

import type { TraceStats } from "@/lib/trace/types";

type Props = {
  stats: TraceStats | null;
  loading?: boolean;
};

export function Sidebar({ stats, loading }: Props) {
  return (
    <aside className="space-y-6 border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
      <div>
        <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)]">
          Trace archive
        </p>
        <h2 className="mt-2 text-[1.05rem] font-medium tracking-[0.1em] text-[var(--map-ink)]">
          Presence
        </h2>
        <p className="mt-3 text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
          Quiet footprints on the map. City-level only — never your exact
          location.
        </p>
      </div>

      {loading ? (
        <p className="text-[0.78rem] tracking-[0.1em] text-[var(--map-muted)]">
          Gathering…
        </p>
      ) : (
        <dl className="grid gap-4 text-[0.78rem]">
          <div>
            <dt className="tracking-[0.14em] text-[var(--map-muted)]">
              Places with Memories
            </dt>
            <dd className="mt-1 text-[1.4rem] tracking-[0.06em] text-[var(--map-ink)]">
              {stats?.placeCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="tracking-[0.14em] text-[var(--map-muted)]">
              Total Memories
            </dt>
            <dd className="mt-1 text-[1.4rem] tracking-[0.06em] text-[var(--map-ink)]">
              {stats?.memoryCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="tracking-[0.14em] text-[var(--map-muted)]">
              Google Memories
            </dt>
            <dd className="mt-1 text-[1.2rem] tracking-[0.06em] text-[var(--map-ink)]">
              {stats?.googleCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="tracking-[0.14em] text-[var(--map-muted)]">
              Guest Memories
            </dt>
            <dd className="mt-1 text-[1.2rem] tracking-[0.06em] text-[var(--map-ink)]">
              {stats?.guestCount ?? 0}
            </dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
