"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { SiteControl } from "@/lib/site-control/types";

type Props = {
  user: User;
};

function statusWord(enabled: boolean) {
  return enabled ? "Active" : "Paused";
}

export function AdminSafetyControl({ user }: Props) {
  const [control, setControl] = useState<SiteControl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<"trace" | "contact" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/site-control", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        control?: SiteControl;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error || "Unable to load Safety Control.");
        return;
      }
      setControl(data?.control || null);
    } catch {
      setError("Unable to load Safety Control.");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(next: Partial<Pick<SiteControl, "traceEnabled" | "contactEnabled">>, key: "trace" | "contact") {
    if (!control) return;
    setBusyKey(key);
    setError(null);
    const optimistic = { ...control, ...next };
    setControl(optimistic);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/site-control", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
      const data = (await response.json().catch(() => null)) as {
        control?: SiteControl;
        error?: string;
      } | null;
      if (!response.ok || !data?.control) {
        setControl(control);
        setError(data?.error || "Unable to update Safety Control.");
        return;
      }
      setControl(data.control);
    } catch {
      setControl(control);
      setError("Unable to update Safety Control.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="border border-[var(--line)] bg-white/40 px-5 py-7 sm:px-6 sm:py-8">
      <p className="text-[0.68rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
        Site Control
      </p>
      <h2 className="mt-3 text-[1.35rem] font-medium tracking-[0.06em] text-[var(--foreground)]">
        MIAV Safety Control
      </h2>
      <p className="mt-4 max-w-md text-[0.88rem] leading-[1.85] text-[var(--foreground-muted)]">
        Pause Trace registration or Contact submission only. Stories, the World
        Map, and existing Traces stay available.
      </p>

      {!control && !error ? (
        <p className="mt-10 text-[0.9rem] text-[var(--foreground-muted)]">
          Loading…
        </p>
      ) : null}

      {error ? (
        <p className="mt-8 text-[0.9rem] leading-[1.7] text-[#8a4b4b]">{error}</p>
      ) : null}

      {control ? (
        <div className="mt-10 space-y-6">
          <SwitchRow
            label="World Memory Trace"
            hint="New Trace registration"
            enabled={control.traceEnabled}
            busy={busyKey === "trace"}
            onToggle={() =>
              void patch({ traceEnabled: !control.traceEnabled }, "trace")
            }
          />
          <SwitchRow
            label="Contact Form"
            hint="New inquiries"
            enabled={control.contactEnabled}
            busy={busyKey === "contact"}
            onToggle={() =>
              void patch(
                { contactEnabled: !control.contactEnabled },
                "contact",
              )
            }
          />

          <div className="border-t border-[var(--line)] pt-6">
            <p className="text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
              Current Status
            </p>
            <ul className="mt-4 space-y-2 text-[0.95rem] leading-[1.8] text-[var(--foreground)]">
              <li>
                Trace:{" "}
                <span
                  className={
                    control.traceEnabled
                      ? "text-[#5b7c99]"
                      : "text-[var(--foreground-muted)]"
                  }
                >
                  {statusWord(control.traceEnabled)}
                </span>
              </li>
              <li>
                Contact:{" "}
                <span
                  className={
                    control.contactEnabled
                      ? "text-[#5b7c99]"
                      : "text-[var(--foreground-muted)]"
                  }
                >
                  {statusWord(control.contactEnabled)}
                </span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  enabled,
  busy,
  onToggle,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border border-[var(--line)] bg-[#f7f9fb] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-[1.02rem] tracking-[0.04em] text-[var(--foreground)]">
          {label}
        </p>
        <p className="mt-1 text-[0.78rem] text-[var(--foreground-muted)]">
          {hint}
        </p>
      </div>
      <div
        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[220px]"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          disabled={busy || enabled}
          onClick={onToggle}
          className={[
            "min-h-[52px] cursor-pointer border text-[0.82rem] tracking-[0.16em] transition-colors disabled:cursor-default",
            enabled
              ? "border-[#9bb0c2] bg-[#e8eef4] text-[var(--foreground)]"
              : "border-[var(--line)] bg-white text-[var(--foreground-muted)]",
          ].join(" ")}
        >
          ON
        </button>
        <button
          type="button"
          disabled={busy || !enabled}
          onClick={onToggle}
          className={[
            "min-h-[52px] cursor-pointer border text-[0.82rem] tracking-[0.16em] transition-colors disabled:cursor-default",
            !enabled
              ? "border-[#b7c5d1] bg-[#eef2f5] text-[var(--foreground)]"
              : "border-[var(--line)] bg-white text-[var(--foreground-muted)]",
          ].join(" ")}
        >
          OFF
        </button>
      </div>
    </div>
  );
}
