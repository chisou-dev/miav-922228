"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatJoinedDate,
  type TracePin,
} from "@/lib/trace/types";
import { formatMessagePreview } from "@/lib/trace/messagePolicy";
import { SelectedTrace } from "@/components/trace-map/SelectedTrace";

type Props = {
  traces: TracePin[];
  locationLabel: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
};

function matchesQuery(trace: TracePin, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    trace.miavId.toLowerCase().includes(q) ||
    trace.message.toLowerCase().includes(q)
  );
}

function quotePreview(message: string): string {
  const preview = formatMessagePreview(message);
  if (!preview) return "—";
  return `“${preview}”`;
}

/**
 * Reader memory list — miavId / date / preview only.
 * PC: hover previews a floating card; click pins it.
 * Mobile: tap pins; swipe on the card moves prev/next.
 * Never uses or displays Firebase UID / trace.id.
 */
export function TraceList({
  traces,
  locationLabel,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
}: Props) {
  const [query, setQuery] = useState("");
  const [hoveredMiavId, setHoveredMiavId] = useState<string | null>(null);
  const [pinnedMiavId, setPinnedMiavId] = useState<string | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(
    () => traces.filter((trace) => matchesQuery(trace, query)),
    [traces, query],
  );

  function clearHoverSoon() {
    if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    hoverClearTimer.current = setTimeout(() => {
      setPinnedMiavId((pinned) => {
        if (!pinned) setHoveredMiavId(null);
        return pinned;
      });
    }, 120);
  }

  function keepHover(miavId: string) {
    if (hoverClearTimer.current) {
      clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
    if (!pinnedMiavId) setHoveredMiavId(miavId);
  }

  useEffect(() => {
    return () => {
      if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarsePointer(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, traces.length]);

  const activeMiavId = pinnedMiavId || hoveredMiavId;
  const activeTrace =
    filtered.find((trace) => trace.miavId === activeMiavId) ||
    traces.find((trace) => trace.miavId === activeMiavId) ||
    null;
  const pinned = Boolean(pinnedMiavId && activeTrace?.miavId === pinnedMiavId);

  function closeCard() {
    setPinnedMiavId(null);
    setHoveredMiavId(null);
  }

  function pinTrace(trace: TracePin) {
    setPinnedMiavId(trace.miavId);
    setHoveredMiavId(null);
  }

  function movePinned(delta: number) {
    if (!pinnedMiavId) return;
    const index = filtered.findIndex((trace) => trace.miavId === pinnedMiavId);
    if (index < 0) return;
    const next = filtered[index + delta];
    if (!next) return;
    setPinnedMiavId(next.miavId);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--map-line)] px-5 py-4 sm:px-6">
        <label className="block">
          <span className="text-[0.65rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="MIAV ID or memory"
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full border-0 border-b border-[var(--map-line)] bg-transparent py-2 text-[0.9rem] text-[var(--map-ink)] outline-none placeholder:text-[var(--map-muted)]/70"
          />
        </label>
        {query.trim() ? (
          <p className="mt-2 text-[0.72rem] tracking-[0.04em] text-[var(--map-muted)]">
            Filtering {filtered.length} of {traces.length} loaded
            {hasMore ? " · scroll to load more" : ""}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex-1 overflow-hidden px-5 py-8 text-[0.85rem] text-[var(--map-muted)] sm:px-6">
          Gathering memories…
        </div>
      ) : traces.length === 0 ? (
        <div className="flex-1 overflow-hidden px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
          No reader memory remains in this place yet.
        </div>
      ) : filtered.length === 0 ? (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
            No matching memory in the loaded list.
            {hasMore
              ? " Scroll further to load more, then search again."
              : ""}
          </div>
          <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto"
          onMouseLeave={() => {
            if (!pinnedMiavId) clearHoverSoon();
          }}
        >
          <table className="w-full min-w-[22rem] border-collapse text-left">
            <thead className="sticky top-0 bg-[var(--map-panel)]">
              <tr className="border-b border-[var(--map-line)] text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
                <th className="px-5 py-3 font-normal sm:px-6">ID</th>
                <th className="px-3 py-3 font-normal">Date</th>
                <th className="px-5 py-3 font-normal sm:px-6">Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trace) => {
                const active = activeMiavId === trace.miavId;
                return (
                  <tr
                    key={trace.miavId}
                    tabIndex={0}
                    role="button"
                    aria-pressed={active && pinned}
                    onMouseEnter={() => {
                      if (isCoarsePointer || pinnedMiavId) return;
                      keepHover(trace.miavId);
                    }}
                    onClick={() => pinTrace(trace)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pinTrace(trace);
                      }
                    }}
                    className={`cursor-pointer border-b border-[var(--map-line)] border-l-2 transition-colors last:border-b-0 ${
                      active
                        ? "border-l-[var(--map-accent)] bg-[#eef3f8]"
                        : "border-l-transparent hover:bg-[#f7f9fb]"
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[0.78rem] tracking-[0.04em] text-[var(--map-accent)] sm:px-6">
                      {trace.miavId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)]">
                      {formatJoinedDate(trace.createdAt)}
                    </td>
                    <td className="max-w-[10rem] truncate px-5 py-3 text-[0.85rem] text-[var(--map-ink)] sm:max-w-[16rem] sm:px-6">
                      {quotePreview(trace.message)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
          {loadingMore ? (
            <p className="px-5 py-3 text-[0.78rem] text-[var(--map-muted)] sm:px-6">
              Loading more…
            </p>
          ) : null}
        </div>
      )}

      {activeTrace ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 sm:bottom-6 sm:justify-end sm:pr-6">
          <SelectedTrace
            trace={activeTrace}
            locationLabel={locationLabel}
            pinned={pinned}
            onClose={closeCard}
            onHoverStay={() => keepHover(activeTrace.miavId)}
            onHoverLeave={() => {
              if (!pinnedMiavId) clearHoverSoon();
            }}
            onSwipePrev={() => movePinned(-1)}
            onSwipeNext={() => movePinned(1)}
          />
        </div>
      ) : null}
    </div>
  );
}
