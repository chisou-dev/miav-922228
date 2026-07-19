"use client";

import type { TracePin } from "@/lib/trace/types";

type Props = {
  pin: TracePin;
  onClose?: () => void;
};

function formatJoined(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function TraceCard({ pin, onClose }: Props) {
  return (
    <div className="min-w-[200px] max-w-[260px] border border-[var(--map-line)] bg-white px-4 py-4 text-left shadow-none">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] tracking-[0.16em] text-[var(--map-accent)]">
          {pin.miavId}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-[0.7rem] tracking-[0.12em] text-[var(--map-muted)]"
            aria-label="Close"
          >
            Close
          </button>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3 text-[0.82rem] leading-[1.6] text-[var(--map-ink)]">
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Country
          </dt>
          <dd className="mt-1">{pin.country}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Region
          </dt>
          <dd className="mt-1">{pin.region}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            City
          </dt>
          <dd className="mt-1">{pin.city}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Message
          </dt>
          <dd className="mt-1 italic">{pin.message || "—"}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Joined
          </dt>
          <dd className="mt-1">{formatJoined(pin.createdAt)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[0.65rem] tracking-[0.12em] text-[var(--map-muted)]">
        {pin.authType === "google" ? "Permanent Trace" : "Temporary Trace"}
      </p>
    </div>
  );
}
