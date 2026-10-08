"use client";

import type { ReentryPhase } from "./reentryTypes";

const btnClass = "rounded-sm border border-[var(--line)]/60 bg-[#070b10]/85 px-4 py-2 text-[0.68rem] tracking-[0.14em] text-[var(--foreground)] transition-colors hover:border-[var(--foreground-muted)] hover:bg-[#0c1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)] disabled:opacity-40";
const iconBtnClass = "flex h-11 w-14 items-center justify-center rounded-full border border-[var(--line)]/70 bg-[#070b10]/85 text-[1.3rem] text-[var(--foreground)] transition-colors hover:border-[var(--foreground-muted)] hover:bg-[#0c1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]";

export function ReentryLaunchControls({ phase, powerOscillator, lockedPowerNorm, onLockPower, onLaunch, onNudgeAngle, }: { phase: ReentryPhase; powerOscillator: number; lockedPowerNorm: number | null; onLockPower: () => void; onLaunch: () => void; onNudgeAngle: (delta: number) => void; }) {
  if (phase === "flight" || phase === "result") return null;
  if (phase === "power") {
    const pct = Math.round(powerOscillator * 100);
    return (<div className="pointer-events-auto absolute inset-x-0 bottom-[12%] z-20 flex flex-col items-center gap-3 px-6" role="group" aria-label="Power selection">
      <p className="text-[0.62rem] tracking-[0.16em] text-[var(--foreground-muted)]">1 · POWER</p>
      <div className="w-full max-w-xs"><div className="mb-1 flex justify-between text-[0.55rem] tracking-[0.12em] text-[var(--foreground-muted)]"><span>LOW</span><span>HIGH</span></div>
      <button type="button" onClick={onLockPower} className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--line)]/35" aria-label={`Power meter at ${pct} percent. Tap to lock.`}><span className="absolute inset-y-0 left-0 bg-[var(--foreground-muted)]/55 transition-[width] duration-75" style={{ width: `${pct}%` }} /><span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-[var(--foreground)] shadow-[0_0_6px_rgba(220,230,240,0.5)]" style={{ left: `calc(${pct}% - 1px)` }} /></button></div>
      <button type="button" className={btnClass} onClick={onLockPower}>LOCK</button>
    </div>);
  }
  return (<div className="pointer-events-auto absolute inset-x-0 bottom-[10%] z-20 flex flex-col items-center gap-3 px-6" role="group" aria-label="Direction and launch">
    <p className="text-[0.62rem] tracking-[0.16em] text-[var(--foreground-muted)]">2 · DIRECTION</p>
    <div className="flex items-center gap-4"><button type="button" className={iconBtnClass} onClick={() => onNudgeAngle(-0.06)} aria-label="Aim shallower" title="Shallower">↖</button><span className="text-[1.15rem] text-[var(--foreground-muted)]" aria-hidden>◉</span><button type="button" className={iconBtnClass} onClick={() => onNudgeAngle(0.06)} aria-label="Aim steeper" title="Steeper">↘</button></div>
    <button type="button" className={`${btnClass} border-[var(--foreground-muted)]/50`} onClick={onLaunch} disabled={lockedPowerNorm === null}>3 · LAUNCH</button>
  </div>);
}
