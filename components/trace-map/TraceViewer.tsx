"use client";

import { TraceList } from "@/components/trace-map/TraceList";
import type { TracePin } from "@/lib/trace/types";

type Props = {
  city: string;
  country: string;
  traces: TracePin[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
  onClose: () => void;
};

/**
 * Side panel for reader memories at a catalog city.
 * List + floating memory card (hover / tap / swipe) — no UID or coordinates.
 */
export function TraceViewer({
  city,
  country,
  traces,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onClose,
}: Props) {
  const cityLabel = city.trim() || "Unknown";
  const countryLabel = country.trim() || "";

  return (
    <section className="flex h-[min(70vh,640px)] min-h-[320px] flex-col border border-[var(--map-line)] bg-[var(--map-panel)] lg:h-[min(72vh,720px)]">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[var(--map-line)] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[1.15rem] font-medium tracking-[0.12em] text-[var(--map-ink)] uppercase">
            {cityLabel}{" "}
            <span className="text-[var(--map-accent)]" aria-hidden>
              ★
            </span>
          </h2>
          <p className="mt-1.5 text-[0.88rem] tracking-[0.04em] text-[var(--map-muted)]">
            {countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel}
          </p>
          <p className="mt-3 text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)]">
            Reader Memories
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
        >
          Close
        </button>
      </div>

      <TraceList
        key={`${cityLabel}|${countryLabel}`}
        traces={traces}
        locationLabel={
          countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel
        }
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </section>
  );
}
