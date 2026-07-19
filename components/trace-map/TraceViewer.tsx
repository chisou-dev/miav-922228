"use client";

import { TraceList } from "@/components/trace-map/TraceList";
import { SelectedTrace } from "@/components/trace-map/SelectedTrace";
import type { TracePin } from "@/lib/trace/types";

type Props = {
  title: string;
  traces: TracePin[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  selected: TracePin | null;
  onSelect: (trace: TracePin) => void;
  onLoadMore: () => void;
  onClose: () => void;
};

/**
 * Side panel (desktop right / mobile below map).
 * Trace List scrolls; Selected Trace stays fixed at the bottom.
 * No modal.
 */
export function TraceViewer({
  title,
  traces,
  loading,
  loadingMore,
  hasMore,
  selected,
  onSelect,
  onLoadMore,
  onClose,
}: Props) {
  return (
    <section className="flex h-[min(70vh,640px)] min-h-[320px] flex-col border border-[var(--map-line)] bg-[var(--map-panel)] lg:h-[min(72vh,720px)]">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[var(--map-line)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
            Trace Viewer
          </p>
          <h2 className="mt-1.5 text-[1.05rem] font-medium tracking-[0.05em] text-[var(--map-ink)]">
            {title}
          </h2>
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
        traces={traces}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        selectedId={selected?.id || null}
        onSelect={onSelect}
        onLoadMore={onLoadMore}
      />

      <SelectedTrace trace={selected} />
    </section>
  );
}
