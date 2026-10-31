"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReentryOutcome, ReentryPhase } from "./reentryTypes";
import { paintStage1FleetShip } from "./ReentryPresentationCanvas";
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

/** Exactly the blue enamel spacecraft used on the main cinematic canvas. */
function ShipIcon({
  muted = false,
  large = false,
}: {
  muted?: boolean;
  large?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    paintStage1FleetShip(ctx, canvas.width, canvas.height, muted);
  }, [muted]);
  return (
    <canvas
      ref={ref}
      width={100}
      height={60}
      className={large
        ? "block h-[36px] w-[60px] drop-shadow-[0_0_10px_rgba(52,145,246,0.3)]"
        : "block h-[24px] w-[39px] drop-shadow-[0_0_4px_rgba(52,145,246,0.25)]"}
      aria-hidden="true"
    />
  );
}

export function Stage1FleetHud({
  fleet,
  phase,
  flightProgress,
  spaceShare,
  introSequence,
  arrivalPlaying,
}: {
  fleet: FleetState;
  phase: ReentryPhase;
  flightProgress: number;
  spaceShare: number;
  introSequence: number;
  arrivalPlaying: boolean;
}) {
  const [undocked, setUndocked] = useState(false);
  useEffect(() => {
    if (introSequence < 1) return;
    setUndocked(false);
    const id = window.setTimeout(() => setUndocked(true), 220);
    return () => window.clearTimeout(id);
  }, [introSequence]);

  // Keep the rack visible in SPACE only. It disappears at atmospheric entry
  // and never overlays the ocean or the successful Stage 1 epilogue.
  const inSpace =
    phase === "power" ||
    phase === "angle" ||
    (phase === "flight" && flightProgress < spaceShare);
  if (!fleet.loaded || !inSpace || fleet.remaining === 0) return null;

  const activeShipPreparing = (phase === "power" || phase === "angle") &&
    introSequence > 0 && undocked;
  // The active craft is now flying up to the fixed launch anchor, while
  // failed attempts have already been consumed by recordAttempt().
  const docked = Math.max(0, fleet.remaining - (activeShipPreparing ? 1 : 0));

  return (
    <>
      <div
        className="pointer-events-none absolute right-2 z-[71] rounded border border-cyan-100/20 bg-[#020d19]/75 px-2.5 py-2 text-right text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.07)] backdrop-blur-sm sm:right-5"
        style={{ bottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
        role="status"
        aria-label={`Stage 1 docked ships: ${docked} of 3`}
      >
        <div className="text-[0.55rem] font-semibold tracking-[0.2em] text-cyan-100/75">
          FLEET · {String(docked).padStart(2, "0")}/03
        </div>
        <div className="mt-1.5 flex justify-end gap-0.5">
          {Array.from({ length: STAGE1_SHIPS }, (_, i) => (
            <ShipIcon key={i} muted={i >= docked} />
          ))}
        </div>
        <div className="mt-1.5 text-[0.48rem] tracking-[0.08em] text-cyan-100/50">
          CLEAR RATE TARGET ≈1%
        </div>
      </div>
      {arrivalPlaying && phase === "power" && introSequence > 0 && (
        <div className="stage1-fleet-arrival-layer" aria-hidden="true">
          <div key={introSequence} className="stage1-fleet-arriving-ship">
            <ShipIcon large />
          </div>
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
  const displayTime = `${hh}:${mm}.${ss}`;
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[85] flex flex-col items-center justify-center bg-[#020509]/90 px-4 text-center backdrop-blur-sm"
      role="region"
      aria-label="Humanity extinct. Fleet restoration countdown."
    >
      <div className="mb-4 text-[0.65rem] tracking-[0.5em] text-red-300/70">
        FINAL TRANSMISSION · STAGE 1
      </div>
      <h2 className="stage1-extinction-glow text-[clamp(1.7rem,6vw,4.7rem)] font-black tracking-[0.12em] text-red-300">
        HUMANITY EXTINCT
      </h2>
      <p className="mt-5 text-[0.7rem] tracking-[0.25em] text-cyan-100/60">
        FLEET RECONSTRUCTION IN
      </p>
      <div className="stage1-countdown mt-2 whitespace-nowrap font-mono text-[clamp(2.0rem,9vw,6.5rem)] font-medium tabular-nums tracking-[0.015em] text-red-400">
        {displayTime}
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
