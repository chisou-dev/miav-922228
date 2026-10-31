"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReentryOutcome, ReentryPhase } from "./reentryTypes";
import "./stage1Fleet.css";

const STORE_KEY = "miav_stage1_fleet_v1";
export const STAGE1_SHIPS = 3;
export const STAGE1_REVIVE_MS = 24 * 60 * 60 * 1000;

export type FleetState = {
  loaded: boolean;
  remaining: number;
  reviveAt: number | null;
};

const freshFleet = (): FleetState => ({
  loaded: true,
  remaining: STAGE1_SHIPS,
  reviveAt: null,
});

function normalizeFleet(raw: unknown, now: number): FleetState {
  if (!raw || typeof raw !== "object") return freshFleet();
  const saved = raw as Record<string, unknown>;
  if (
    typeof saved.remaining !== "number" ||
    !Number.isInteger(saved.remaining) ||
    saved.remaining < 0 ||
    saved.remaining > STAGE1_SHIPS
  ) return freshFleet();
  if (saved.remaining > 0) {
    return { loaded: true, remaining: saved.remaining, reviveAt: null };
  }
  if (
    typeof saved.reviveAt !== "number" ||
    !Number.isFinite(saved.reviveAt) ||
    saved.reviveAt <= 0 ||
    saved.reviveAt <= now
  ) return freshFleet();
  return { loaded: true, remaining: 0, reviveAt: saved.reviveAt };
}

export function readFleet(now = Date.now()): FleetState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshFleet();
    const next = normalizeFleet(JSON.parse(raw), now);
    // On expiry clear the persisted lock too, including across reopened tabs.
    if (next.remaining === STAGE1_SHIPS && JSON.parse(raw)?.remaining === 0) {
      localStorage.removeItem(STORE_KEY);
    }
    return next;
  } catch {
    // Private browsers may disallow storage. The UI remains playable;
    // persistence is best effort and cannot enforce a server-side lock.
    return freshFleet();
  }
}

function saveFleet(next: FleetState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      remaining: next.remaining,
      reviveAt: next.reviveAt,
    }));
  } catch {
    /* Browsers with storage disabled cannot persist the cooldown. */
  }
}

export function useStage1Fleet() {
  // Match server HTML during hydration; load the persisted record on mount.
  const [fleet, setFleet] = useState<FleetState>({
    loaded: false, remaining: STAGE1_SHIPS, reviveAt: null,
  });
  const [now, setNow] = useState(0);
  const currentRef = useRef(fleet);
  const publish = useCallback((next: FleetState) => {
    currentRef.current = next;
    setFleet(previous =>
      previous.loaded === next.loaded &&
      previous.remaining === next.remaining &&
      previous.reviveAt === next.reviveAt ? previous : next,
    );
  }, []);

  useEffect(() => {
    const sync = () => {
      publish(readFleet());
      setNow(Date.now());
    };
    sync();
    window.addEventListener("storage", sync);
    const id = window.setInterval(() => {
      if (currentRef.current.reviveAt !== null) sync();
    }, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, [publish]);

  const recordAttempt = useCallback((outcome: ReentryOutcome): boolean => {
    const time = Date.now();
    // Always re-read before a write, so a refresh or another tab does not
    // silently grant a fourth life.
    const active = readFleet(time);
    if (active.remaining === 0) {
      publish(active);
      return false;
    }
    if (outcome === "EARTH_REACHED") return true;
    const remaining = active.remaining - 1;
    const next: FleetState = {
      loaded: true,
      remaining,
      reviveAt: remaining === 0 ? time + STAGE1_REVIVE_MS : null,
    };
    saveFleet(next);
    publish(next);
    setNow(time);
    return true;
  }, [publish]);

  return { fleet, now, recordAttempt };
}

function ShipIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      width="20"
      height="25"
      viewBox="0 0 24 30"
      fill="none"
      aria-hidden="true"
      className={muted ? "opacity-20" : "drop-shadow-[0_0_5px_rgba(103,232,249,0.55)]"}
    >
      <path
        d="M12 1.5 19 18l3 8-9-4h-2l-9 4 3-8 7-16.5Z"
        fill={muted ? "#64748b" : "#d5f5ff"}
        stroke={muted ? "#64748b" : "#8ceaff"}
        strokeWidth="1.2"
      />
      <path d="M12 6v13" stroke="#164d65" strokeWidth="1.5" />
      <path d="M9 23.5h6L12 29l-3-5.5Z" fill={muted ? "#475569" : "#67e8f9"} />
    </svg>
  );
}

export function Stage1FleetHud({
  fleet,
  phase,
  launchCount,
}: {
  fleet: FleetState;
  phase: ReentryPhase;
  launchCount: number;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute right-2 z-[71] rounded border border-cyan-100/20 bg-[#020d19]/75 px-2.5 py-2 text-right text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.07)] backdrop-blur-sm sm:right-5"
        style={{ bottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
        role="status"
        aria-label={`Stage 1 ships remaining: ${fleet.loaded ? fleet.remaining : "..."} of 3`}
      >
        <div className="text-[0.55rem] font-semibold tracking-[0.2em] text-cyan-100/75">
          FLEET · {fleet.loaded ? fleet.remaining : "--"}/03
        </div>
        <div className="mt-1.5 flex justify-end gap-1">
          {Array.from({ length: STAGE1_SHIPS }, (_, i) => (
            <ShipIcon key={i} muted={fleet.loaded && i >= fleet.remaining} />
          ))}
        </div>
        <div className="mt-1.5 text-[0.48rem] tracking-[0.08em] text-cyan-100/50">
          CLEAR RATE TARGET ≈1%
        </div>
      </div>
      {launchCount > 0 && phase === "flight" && (
        <div key={launchCount} className="stage1-fleet-flyout pointer-events-none fixed bottom-[7.5rem] right-7 z-[72] text-cyan-50" aria-hidden="true">
          <ShipIcon />
        </div>
      )}
    </>
  );
}

export function Stage1Extinction({
  reviveAt,
  now,
  onClose,
}: {
  reviveAt: number;
  now: number;
  onClose: () => void;
}) {
  const seconds = Math.max(0, Math.ceil((reviveAt - now) / 1000));
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[85] flex flex-col items-center justify-center bg-[#020509]/90 px-4 text-center backdrop-blur-sm"
      role="region"
      aria-label="Humanity extinct. Fleet restoration countdown."
    >
      <div className="mb-4 text-[0.65rem] tracking-[0.5em] text-red-300/70">
        FINAL TRANSMISSION · STAGE 1
      </div>
      <h2 className="stage1-extinction-glow text-[clamp(1.7rem,6vw,4.7rem)] font-black tracking-[0.12em] text-red-200">
        HUMANITY EXTINCT
      </h2>
      <p className="mt-5 text-[0.7rem] tracking-[0.25em] text-cyan-100/60">
        FLEET RECONSTRUCTION IN
      </p>
      <div className="stage1-countdown mt-2 font-mono text-[clamp(2.8rem,12vw,7rem)] font-light tabular-nums tracking-[0.04em] text-cyan-100">
        {hh}:{mm}:{ss}
      </div>
      <p className="mt-3 max-w-sm text-[0.67rem] leading-relaxed tracking-[0.1em] text-cyan-100/45">
        All three ships have been lost. Three ships return 24 hours after the final failed launch.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-9 rounded border border-cyan-100/25 bg-cyan-950/25 px-5 py-2 text-[0.72rem] tracking-[0.22em] text-cyan-100/80 hover:bg-cyan-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
      >
        RETURN TO MIAV
      </button>
    </div>
  );
}
