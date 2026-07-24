"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatJoinedDate,
  previewMessage,
  type TracePin,
  type TraceStats,
} from "@/features/world-memory/trace/types";

type Props = {
  stats: TraceStats | null;
  loading?: boolean;
  recent: TracePin[];
  onFocusMemory: (memory: {
    locationId: string | null;
    lat: number | null;
    lng: number | null;
  }) => void;
};

export function Sidebar({ stats, loading, recent, onFocusMemory }: Props) {
  const memories = useMemo(() => recent.slice(0, 20), [recent]);
  const memoryKey = useMemo(
    () => memories.map((memory) => memory.miavId).join("|"),
    [memories],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [memoryKey]);

  const current = memories[index] ?? null;
  const canPrevious = index < memories.length - 1;
  const canNext = index > 0;

  function focusAt(nextIndex: number) {
    const memory = memories[nextIndex];
    if (!memory) return;
    onFocusMemory({
      locationId: memory.locationId,
      lat: Number.isFinite(memory.lat) ? memory.lat : null,
      lng: Number.isFinite(memory.lng) ? memory.lng : null,
    });
  }

  function goPrevious() {
    if (!canPrevious) return;
    const nextIndex = index + 1;
    setIndex(nextIndex);
    focusAt(nextIndex);
  }

  function goNext() {
    if (!canNext) return;
    const nextIndex = index - 1;
    setIndex(nextIndex);
    focusAt(nextIndex);
  }

  return (
    <aside className="flex h-full min-h-[min(72vh,720px)] flex-col border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
      <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)]">
        Trace archive
      </p>

      <div className="mt-5 border-b border-[var(--map-line)] pb-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={!canPrevious || loading}
            aria-label="Previous memory"
            className={`shrink-0 text-[0.85rem] tracking-[0.08em] text-[var(--map-ink)] ${
              canPrevious && !loading
                ? "cursor-pointer"
                : "invisible pointer-events-none"
            }`}
          >
            ←
          </button>
          <p className="text-[0.68rem] tracking-[0.18em] text-[var(--map-muted)] uppercase">
            Latest Memory
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext || loading}
            aria-label="Next memory"
            className={`shrink-0 text-[0.85rem] tracking-[0.08em] text-[var(--map-ink)] ${
              canNext && !loading
                ? "cursor-pointer"
                : "invisible pointer-events-none"
            }`}
          >
            →
          </button>
        </div>
        {loading ? (
          <p className="mt-3 text-[0.78rem] text-[var(--map-muted)]">…</p>
        ) : current ? (
          <dl className="mt-3 space-y-3 text-[0.82rem] text-[var(--map-ink)]">
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                MIAV ID
              </dt>
              <dd className="mt-1 font-mono tracking-[0.04em] text-[var(--map-accent)]">
                {current.miavId}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Place
              </dt>
              <dd className="mt-1">
                {current.city}, {current.country}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Memory
              </dt>
              <dd className="mt-1 leading-[1.7] text-[var(--map-muted)]">
                {previewMessage(current.message, 20) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)] uppercase">
                Left
              </dt>
              <dd className="mt-1">{formatJoinedDate(current.createdAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
            No Memories yet.
          </p>
        )}
      </div>

      <div className="mt-5">
        <h2 className="text-[1.05rem] font-medium tracking-[0.1em] text-[var(--map-ink)]">
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
    </aside>
  );
}
