"use client";

import { useCallback, useEffect, useState } from "react";
import { discoverSignal } from "@/features/signals/service";
import { hasDiscovery } from "@/features/signals/discovery";
import { useT } from "@/features/shared/i18n";

const CHAPTER_14_SIGNAL_ID = "novel-chapter-14";

type Phase =
  | "idle"
  | "ready"
  | "discovered"
  | "receiving"
  | "justDiscovered"
  | "error";

/**
 * Chapter 14 Signal discovery — stores on-device only; code stays hidden until claim.
 */
export function ReceiveChapter14Signal() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    setPhase(hasDiscovery(CHAPTER_14_SIGNAL_ID) ? "discovered" : "ready");
  }, []);

  const onReceive = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("receiving");
    const result = discoverSignal(CHAPTER_14_SIGNAL_ID);
    if (result.ok) {
      setPhase(result.alreadyDiscovered ? "discovered" : "justDiscovered");
      return;
    }
    setPhase("error");
  }, [phase]);

  if (phase === "idle") return null;

  if (phase === "discovered" || phase === "justDiscovered") {
    return (
      <aside
        className="mt-16 border-t border-[var(--line)] pt-10 sm:mt-20 sm:pt-12"
        aria-label={t("signals.discoveredTitle")}
        role="status"
      >
        <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
          {t("signals.discoveredTitle")}
        </p>
        <p className="mt-4 text-[0.95rem] tracking-[0.03em] text-[var(--foreground)]">
          {t("signals.chapter14Title")}
        </p>
        <p className="mt-3 max-w-md text-[0.9rem] leading-[1.8] text-[var(--foreground-muted)]">
          {t("signals.waitingForMiavId")}
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <a
            href="/world-map"
            className="text-[0.8rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
          >
            {t("myMiav.goToWorld")}
          </a>
          <a
            href="/my-miav#signals"
            className="text-[0.8rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
          >
            {t("nav.myMiav")}
          </a>
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="mt-16 border-t border-[var(--line)] pt-10 sm:mt-20 sm:pt-12"
      aria-label={t("signals.receive")}
    >
      <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
        {t("signals.eyebrow")}
      </p>
      <p className="mt-4 max-w-md text-[0.95rem] leading-[1.85] tracking-[0.01em] text-[var(--foreground-muted)]">
        {t("signals.chapter14Prompt")}
      </p>
      <button
        type="button"
        onClick={onReceive}
        disabled={phase === "receiving"}
        className="mt-8 text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] disabled:opacity-40"
      >
        {phase === "receiving" ? t("common.loading") : t("signals.receive")}
      </button>
      {phase === "error" ? (
        <p className="mt-5 text-[0.85rem] text-[var(--foreground-muted)]">
          {t("common.error")}
        </p>
      ) : null}
    </aside>
  );
}
