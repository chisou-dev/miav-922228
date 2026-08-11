"use client";

import type { TracePin } from "@/features/world-memory/trace/types";
import { getWorkById } from "@/features/world-memory/trace/works";
import { useT, type MessageKey } from "@/features/shared/i18n";

const CATEGORY_LABEL_KEY: Record<
  NonNullable<TracePin["category"]>,
  MessageKey
> = {
  read: "world.category.read",
  play: "world.category.play",
  apps: "world.category.apps",
};

/**
 * Compact "PLAY · Binary Block" line for archive / detail.
 * Renders nothing for legacy traces without category/workId.
 */
export function TraceOriginLabel({
  trace,
  className,
}: {
  trace: Pick<TracePin, "category" | "workId">;
  className?: string;
}) {
  const t = useT();
  if (!trace.category || !trace.workId) return null;

  const work = getWorkById(trace.workId);
  const categoryLabel = t(CATEGORY_LABEL_KEY[trace.category]);
  const workLabel = work?.label ?? trace.workId;

  return (
    <p
      className={
        className ??
        "text-[0.72rem] tracking-[0.08em] text-[var(--map-muted)] uppercase"
      }
    >
      {categoryLabel}
      <span className="mx-1.5 normal-case tracking-[0.04em] text-[var(--map-line)]">
        ·
      </span>
      <span className="normal-case tracking-[0.03em] text-[var(--map-ink)]">
        {workLabel}
      </span>
    </p>
  );
}
