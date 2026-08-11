"use client";

import { useState, type FormEvent } from "react";
import { redeemSignal, validateSignalCode } from "@/features/signals/service";
import type {
  SignalRewardTarget,
  SignalValidationResult,
} from "@/features/signals/types";
import { useT, type MessageKey } from "@/features/shared/i18n";

type Props = {
  /** Target app for reward unlock. When omitted, validates format/HMAC only. */
  targetApp?: SignalRewardTarget;
  onRedeemed?: () => void;
};

function statusKey(
  result: SignalValidationResult,
  mode: "validate" | "redeem",
): MessageKey {
  if (result.valid) {
    return mode === "redeem"
      ? "signals.rewardUnlocked"
      : "signals.accepted";
  }
  switch (result.reason) {
    case "ALREADY_REDEEMED":
      return "signals.alreadyRedeemed";
    case "NOT_AVAILABLE_FOR_TARGET":
      return "signals.notAvailable";
    case "INVALID_FORMAT":
    case "UNKNOWN_SIGNAL":
    default:
      return "signals.invalid";
  }
}

/**
 * Reusable Enter Signal UI for MIAV apps (Settings → Signal Code).
 * Logic stays in `validateSignalCode` / `redeemSignal` — not inlined here.
 */
export function EnterSignalForm({ targetApp, onRedeemed }: Props) {
  const t = useT();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setMessage(null);
    setOk(null);

    try {
      const result = targetApp
        ? await redeemSignal(trimmed, targetApp)
        : await validateSignalCode(trimmed);
      setOk(result.valid);
      setMessage(t(statusKey(result, targetApp ? "redeem" : "validate")));
      if (result.valid && targetApp) {
        onRedeemed?.();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md">
      <label className="block">
        <span className="text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
          {t("signals.enter")}
        </span>
        <input
          type="text"
          name="signalCode"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="MIAV-N14-XXXX-XXXX"
          className="mt-3 w-full border-b border-[var(--line)] bg-transparent py-3 font-mono text-[0.9rem] tracking-[0.1em] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] placeholder:opacity-50 focus:border-[var(--foreground-muted)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="mt-6 text-[0.8rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] disabled:opacity-40"
      >
        {busy ? t("common.loading") : t("signals.submit")}
      </button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-5 text-[0.88rem] tracking-[0.03em] ${
            ok
              ? "text-[var(--foreground)]"
              : "text-[var(--foreground-muted)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
