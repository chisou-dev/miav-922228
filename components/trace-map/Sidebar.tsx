"use client";

import { FirstTraceCard } from "@/components/trace-map/FirstTraceCard";
import { LatestTraceCard } from "@/components/trace-map/LatestTraceCard";
import type { TracePin, TraceStats } from "@/lib/trace/types";

type Props = {
  stats: TraceStats | null;
  /** Own Trace for the signed-in Firebase UID (server-resolved). */
  mine: TracePin | null;
  loading?: boolean;
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--map-line)] py-4">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-[0.95rem] tracking-[0.04em] text-[var(--map-ink)]">
        {value}
      </p>
    </div>
  );
}

export function Sidebar({ stats, mine, loading }: Props) {
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

      <div className="mt-6">
        {loading || !stats ? (
          <p className="border-t border-[var(--map-line)] py-4 text-[0.85rem] text-[var(--map-muted)]">
            Gathering…
          </p>
        ) : (
          <>
            <StatRow label="Country Count" value={String(stats.countryCount)} />
            <StatRow label="City Count" value={String(stats.cityCount)} />
            <StatRow
              label="Permanent Traces"
              value={String(stats.permanentCount)}
            />
            <StatRow
              label="Temporary Traces"
              value={String(stats.temporaryCount)}
            />
            {/* Own Trace only — omitted when signed out or no Trace yet */}
            <FirstTraceCard mine={mine} />
            <LatestTraceCard mine={mine} />
          </>
        )}
      </div>
    </aside>
  );
}
