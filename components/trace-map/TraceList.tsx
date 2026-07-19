"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatJoinedDate,
  previewMessage,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  traces: TracePin[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  selectedId?: string | null;
  onSelect: (trace: TracePin) => void;
  onLoadMore: () => void;
};

function matchesQuery(trace: TracePin, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    trace.miavId.toLowerCase().includes(q) ||
    trace.city.toLowerCase().includes(q) ||
    trace.message.toLowerCase().includes(q)
  );
}

/**
 * Row list with a local filter over already-loaded traces.
 * Does not query Firestore — keeps read cost flat.
 */
export function TraceList({
  traces,
  loading,
  loadingMore,
  hasMore,
  selectedId,
  onSelect,
  onLoadMore,
}: Props) {
  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => traces.filter((trace) => matchesQuery(trace, query)),
    [traces, query],
  );

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--map-line)] px-5 py-4 sm:px-6">
        <label className="block">
          <span className="text-[0.65rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="MIAV ID, City, or Message"
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
          Gathering traces…
        </div>
      ) : traces.length === 0 ? (
        <div className="flex-1 overflow-hidden px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
          No Trace remains in this place yet.
        </div>
      ) : filtered.length === 0 ? (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
            No matching Trace in the loaded list.
            {hasMore
              ? " Scroll further to load more, then search again."
              : ""}
          </div>
          <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
          {loadingMore ? (
            <p className="px-5 py-3 text-[0.78rem] text-[var(--map-muted)] sm:px-6">
              Loading more…
            </p>
          ) : null}
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left">
            <thead className="sticky top-0 bg-[var(--map-panel)]">
              <tr className="border-b border-[var(--map-line)] text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
                <th className="px-5 py-3 font-normal sm:px-6">MIAV ID</th>
                <th className="px-3 py-3 font-normal">City</th>
                <th className="px-3 py-3 font-normal">Message</th>
                <th className="px-5 py-3 font-normal sm:px-6">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trace) => {
                const active = selectedId === trace.id;
                return (
                  <tr
                    key={trace.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={active}
                    onClick={() => onSelect(trace)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(trace);
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
                    <td className="whitespace-nowrap px-3 py-3 text-[0.85rem] text-[var(--map-ink)]">
                      {trace.city}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-3 text-[0.85rem] text-[var(--map-muted)] sm:max-w-[18rem]">
                      {previewMessage(trace.message)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)] sm:px-6">
                      {formatJoinedDate(trace.createdAt)}
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
    </div>
  );
}
