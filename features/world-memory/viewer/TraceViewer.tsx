"use client";

import { TraceList } from "@/features/world-memory/viewer/TraceList";
import type { TracePin } from "@/features/world-memory/trace/types";

type Props = {
  /** Desktop empty panel before a star is selected. */
  idle?: boolean;
  city?: string;
  country?: string;
  traces?: TracePin[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onClose?: () => void;
};

/**
 * Side panel for reader memories at a catalog city.
 * List + floating memory card (hover / tap / swipe) — no UID or coordinates.
 */
export function TraceViewer({
  idle = false,
  city = "",
  country = "",
  traces = [],
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onClose,
}: Props) {
  const cityLabel = city.trim() || "Unknown";
  const countryLabel = country.trim() || "";

  // Idle (desktop empty): compact height so Leave a Memory stays in view.
  // Active: keep full viewer height for TraceList / SelectedTrace.
  const shellClass = idle
    ? "flex flex-col border border-[var(--map-line)] bg-[var(--map-panel)] lg:sticky lg:top-4"
    : "flex h-[min(70vh,640px)] min-h-[320px] flex-col border border-[var(--map-line)] bg-[var(--map-panel)] lg:sticky lg:top-4 lg:h-[min(72vh,720px)]";

  return (
    <section className={shellClass}>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[var(--map-line)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
            Reader Memories
          </p>
          {idle ? (
            <p className="mt-3 text-[0.9rem] leading-[1.8] tracking-[0.02em] text-[var(--map-muted)]">
              Select a memory from the map.
            </p>
          ) : (
            <>
              <h2 className="mt-2 text-[1.15rem] font-medium tracking-[0.12em] text-[var(--map-ink)] uppercase">
                {cityLabel}{" "}
                <span className="text-[var(--map-accent)]" aria-hidden>
                  ★
                </span>
              </h2>
              <p className="mt-1.5 text-[0.88rem] tracking-[0.04em] text-[var(--map-muted)]">
                {countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel}
              </p>
            </>
          )}
        </div>
        {!idle && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
          >
            Close
          </button>
        ) : null}
      </div>

      {idle ? null : (
        <TraceList
          key={`${cityLabel}|${countryLabel}`}
          traces={traces}
          locationLabel={
            countryLabel ? `${cityLabel}, ${countryLabel}` : cityLabel
          }
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={onLoadMore ?? (() => {})}
        />
      )}
    </section>
  );
}
