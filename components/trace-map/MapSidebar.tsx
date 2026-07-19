"use client";

import {
  formatJoinedDate,
  type TraceStats,
} from "@/lib/trace/types";

type Props = {
  stats: TraceStats | null;
  loading?: boolean;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
      {children}
    </p>
  );
}

export function MapSidebar({ stats, loading }: Props) {
  return (
    <aside className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6 sm:px-6">
      <p className="text-[0.68rem] tracking-[0.22em] text-[var(--map-muted)] uppercase">
        Trace archive
      </p>
      <h2 className="mt-3 text-[1.15rem] font-medium tracking-[0.06em] text-[var(--map-ink)]">
        Presence
      </h2>
      <p className="mt-4 text-[0.85rem] leading-[1.85] text-[var(--map-muted)]">
        Quiet traces left on the map. Temporary fades; permanent remains. MIAV
        IDs are never reused.
      </p>

      <div className="mt-6 space-y-0">
        {loading || !stats ? (
          <p className="border-t border-[var(--map-line)] py-4 text-[0.85rem] text-[var(--map-muted)]">
            Gathering…
          </p>
        ) : (
          <>
            <div className="border-t border-[var(--map-line)] py-5">
              <SectionLabel>First Trace</SectionLabel>
              {stats.first ? (
                <dl className="mt-3 space-y-2 text-[0.88rem] text-[var(--map-ink)]">
                  <div>
                    <dt className="sr-only">MIAV ID</dt>
                    <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
                      {stats.first.miavId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                      Joined
                    </dt>
                    <dd className="mt-1">
                      {formatJoinedDate(stats.first.createdAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-[0.85rem] text-[var(--map-muted)]">—</p>
              )}
            </div>

            <div className="border-t border-[var(--map-line)] py-5">
              <SectionLabel>Latest Trace</SectionLabel>
              {stats.latest ? (
                <dl className="mt-3 space-y-3 text-[0.88rem] text-[var(--map-ink)]">
                  <div>
                    <dt className="sr-only">MIAV ID</dt>
                    <dd className="font-mono tracking-[0.04em] text-[var(--map-accent)]">
                      {stats.latest.miavId}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                        Country
                      </dt>
                      <dd className="mt-1">{stats.latest.country}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                        City
                      </dt>
                      <dd className="mt-1">{stats.latest.city}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                      Message
                    </dt>
                    <dd className="mt-1 text-[var(--map-muted)]">
                      {stats.latest.messagePreview || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                      Joined
                    </dt>
                    <dd className="mt-1">
                      {formatJoinedDate(stats.latest.createdAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-[0.85rem] text-[var(--map-muted)]">—</p>
              )}
            </div>

            <div className="border-t border-[var(--map-line)] py-4 text-[0.8rem] leading-[1.7] text-[var(--map-muted)]">
              <p>
                {stats.countryCount} countries · {stats.cityCount} cities
              </p>
              <p className="mt-1">
                {stats.permanentCount} permanent · {stats.temporaryCount}{" "}
                temporary
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
