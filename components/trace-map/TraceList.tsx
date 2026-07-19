"use client";

import {
  formatJoinedDate,
  previewMessage,
  type TracePin,
} from "@/lib/trace/types";

type Props = {
  traces: TracePin[];
  scopeLabel: string;
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (trace: TracePin) => void;
  onClose: () => void;
};

export function TraceList({
  traces,
  scopeLabel,
  loading,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  return (
    <section className="border border-[var(--map-line)] bg-[var(--map-panel)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--map-line)] px-5 py-5 sm:px-6">
        <div>
          <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
            Trace List
          </p>
          <h2 className="mt-2 text-[1.05rem] font-medium tracking-[0.05em] text-[var(--map-ink)]">
            {scopeLabel}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
        >
          Close list
        </button>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-[0.85rem] text-[var(--map-muted)] sm:px-6">
          Gathering traces…
        </p>
      ) : traces.length === 0 ? (
        <p className="px-5 py-8 text-[0.85rem] leading-[1.8] text-[var(--map-muted)] sm:px-6">
          No Trace remains in this place yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
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
                      active
                        ? "bg-[#eef3f8]"
                        : "hover:bg-[#f7f9fb]"
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[0.78rem] tracking-[0.04em] text-[var(--map-accent)] sm:px-6">
                      {trace.miavId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[0.85rem] text-[var(--map-ink)]">
                      {trace.city}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-3.5 text-[0.85rem] text-[var(--map-muted)] sm:max-w-[22rem]">
                      {previewMessage(trace.message)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)] sm:px-6">
                      {formatJoinedDate(trace.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
