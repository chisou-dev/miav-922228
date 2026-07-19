"use client";

import { useEffect, useRef } from "react";
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

export function TraceList({
  traces,
  loading,
  loadingMore,
  hasMore,
  selectedId,
  onSelect,
  onLoadMore,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden px-5 py-8 text-[0.85rem] text-[var(--map-muted)] sm:px-6">
        Gathering traces…
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="flex-1 overflow-hidden px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
        No Trace remains in this place yet.
      </div>
    );
  }

  return (
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
          {traces.map((trace) => {
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
                className={`cursor-pointer border-b border-[var(--map-line)] transition-colors last:border-b-0 ${
                  active ? "bg-[#eef3f8]" : "hover:bg-[#f7f9fb]"
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
  );
}
