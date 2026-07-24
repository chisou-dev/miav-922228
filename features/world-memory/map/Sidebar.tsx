"use client";

import {
  formatJoinedDate,
  type TraceStats,
} from "@/lib/trace/types";

type Props = {
  stats: TraceStats | null;
  loading?: boolean;
};

export function Sidebar({ stats, loading }: Props) {
  const latest = stats?.latest ?? null;

  return (
    <aside className="flex h-full min-h-[min(72vh,720px)] flex-col border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
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
        <p className="mt-6 text-[0.78rem] tracking-[0.1em] text-[var(--map-muted)]">
          Gathering…
        </p>
      ) : (
        <dl className="mt-6 grid gap-4 text-[0.78rem]">
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

      <div className="mt-auto border-t border-[var(--map-line)] pt-5">
        <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
          Latest Memory
        </p>
        {loading ? (
          <p className="mt-3 text-[0.78rem] text-[var(--map-muted)]">…</p>
        ) : latest ? (
          <dl className="mt-3 space-y-3 text-[0.82rem] text-[var(--map-ink)]">
            <div>
              <dt className="sr-only">MIAV ID</dt>
              <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
                {latest.miavId}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Place
              </dt>
              <dd className="mt-1">
                {latest.city}, {latest.country}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Memory
              </dt>
              <dd className="mt-1 leading-[1.7] text-[var(--map-muted)]">
                {latest.messagePreview || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Left
              </dt>
              <dd className="mt-1">{formatJoinedDate(latest.createdAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
            No Memories yet.
          </p>
        )}
      </div>
    </aside>
  );
}
