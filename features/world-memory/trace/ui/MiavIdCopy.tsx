"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/features/shared/i18n";

type Props = {
  miavId: string;
  /** Hide the longer hint under the ID (e.g. compact My MIAV header). */
  compact?: boolean;
};

/** Shared MIAV ID + copy control — never show Firebase UID. */
export function MiavIdCopy({ miavId, compact = false }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(miavId);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be blocked; keep silent — ID remains visible.
    }
  }

  return (
    <div className={compact ? undefined : "mt-2"}>
      <p className="text-[0.72rem] tracking-[0.08em] text-[var(--map-muted)] uppercase">
        {t("world.miavId")}
      </p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <p className="font-mono text-[0.88rem] leading-[1.5] tracking-[0.04em] text-[var(--map-ink)]">
          {miavId}
        </p>
        <button
          type="button"
          onClick={() => void copyId()}
          aria-label={t("world.copyId", { id: miavId })}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center px-1 text-[0.95rem] text-[var(--map-muted)] hover:text-[var(--map-ink)]"
        >
          <span aria-hidden="true">📋</span>
        </button>
        {copied ? (
          <span className="text-[0.72rem] tracking-[0.06em] text-[#4a7c59]">
            {t("world.copied")}
          </span>
        ) : null}
      </div>
      {compact ? null : (
        <p className="mt-2 max-w-sm text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.miavIdHint")}
        </p>
      )}
    </div>
  );
}
