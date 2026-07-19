"use client";

import {
  formatJoinedDate,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  pin: TracePin;
  onClose?: () => void;
};

export function TraceCard({ pin, onClose }: Props) {
  return (
    <article className="border border-[var(--map-line)] bg-white px-5 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
            Trace
          </p>
          <p className="mt-2 font-mono text-[0.95rem] tracking-[0.06em] text-[var(--map-accent)]">
            {pin.miavId}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            aria-label="Close"
          >
            Close
          </button>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-5 border-t border-[var(--map-line)] pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Country
          </dt>
          <dd className="mt-2 text-[0.9rem] text-[var(--map-ink)]">{pin.country}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Region
          </dt>
          <dd className="mt-2 text-[0.9rem] text-[var(--map-ink)]">{pin.region}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            City
          </dt>
          <dd className="mt-2 text-[0.9rem] text-[var(--map-ink)]">{pin.city}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-[var(--map-line)] pt-6">
        <p className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
          Message
        </p>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-[1.9] text-[var(--map-ink)]">
          {pin.message || "—"}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--map-line)] pt-5">
        <div>
          <p className="text-[0.65rem] tracking-[0.14em] text-[var(--map-muted)] uppercase">
            Joined
          </p>
          <p className="mt-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
            {formatJoinedDate(pin.createdAt)}
          </p>
        </div>
        <p className="text-[0.68rem] tracking-[0.12em] text-[var(--map-muted)]">
          {pin.authType === "google" ? "Permanent Trace" : "Temporary Trace"}
        </p>
      </div>
    </article>
  );
}
