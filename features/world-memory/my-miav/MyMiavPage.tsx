"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  completeTraceRedirectSignIn,
  formatAuthError,
  getIdTokenOrNull,
  getTraceAuthType,
  signInTraceGoogle,
  watchAuth,
} from "@/features/world-memory/trace/auth";
import { isFirebaseClientConfigured } from "@/features/firebase/client";
import { GoogleSignInDialog } from "@/features/world-memory/trace/ui/GoogleSignInDialog";
import { MiavIdCopy } from "@/features/world-memory/trace/ui/MiavIdCopy";
import {
  groupMyActivitiesByCategory,
  workLabelForId,
  type MyMiavActivity,
  type MyMiavResponse,
} from "@/features/world-memory/my-miav/myMiavPublic";
import { formatJoinedDate } from "@/features/world-memory/trace/types";
import { CATEGORY_MAP_COLORS } from "@/features/world-memory/map/categoryColors";
import { useT, type MessageKey } from "@/features/shared/i18n";
import type { TraceCategory } from "@/features/world-memory/trace/works";
import type { PublicMySignal } from "@/features/signals/types";
import {
  claimPendingDiscoveries,
} from "@/features/signals/service";
import {
  listPendingDiscoveries,
  markDiscoveriesClaimed,
} from "@/features/signals/discovery";

const CATEGORY_LABEL_KEY: Record<TraceCategory, MessageKey> = {
  read: "world.category.read",
  play: "world.category.play",
  apps: "world.category.apps",
};

const SOURCE_LABEL_KEY: Record<string, MessageKey> = {
  novel: "signals.source.novel",
  binary: "signals.source.binary",
  luminous: "signals.source.luminous",
  "writer-memo": "signals.source.writerMemo",
  "miav-world": "signals.source.miavWorld",
  other: "signals.source.other",
};

function placeLine(activity: MyMiavActivity): string {
  const city = activity.city?.trim();
  const country = activity.country?.trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || "—";
}

function SignalCodeCopy({ code, title }: { code: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="break-all font-mono text-[0.82rem] tracking-[0.04em] text-[var(--map-ink)]">
        {code}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={t("signals.copySignalAria", { title })}
        className="min-h-[40px] cursor-pointer border border-[var(--map-line)] bg-white px-3 text-[0.7rem] tracking-[0.1em] text-[var(--map-muted)]"
      >
        {copied ? t("world.copied") : t("signals.copySignal")}
      </button>
    </div>
  );
}

export function MyMiavPage() {
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [payload, setPayload] = useState<MyMiavResponse | null>(null);
  const [signals, setSignals] = useState<PublicMySignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [claimNotice, setClaimNotice] = useState<string | null>(null);
  const [claimError, setClaimError] = useState(false);
  const claimAttempted = useRef(false);

  const loadSignals = useCallback(async (token: string) => {
    setSignalsLoading(true);
    try {
      const response = await fetch("/api/signals/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        signals?: PublicMySignal[];
      } | null;
      if (!response.ok) {
        setSignals([]);
        return;
      }
      setSignals(Array.isArray(data?.signals) ? data.signals : []);
    } catch {
      setSignals([]);
    } finally {
      setSignalsLoading(false);
    }
  }, []);

  const syncPendingClaims = useCallback(
    async (token: string, hasMiavId: boolean) => {
      if (!hasMiavId) return;
      const pending = listPendingDiscoveries();
      if (pending.length === 0) return;

      setClaimError(false);
      const result = await claimPendingDiscoveries(
        token,
        pending.map((d) => d.signalId),
      );
      if (!result.ok) {
        if (result.reason !== "MIAV_ID_REQUIRED") {
          setClaimError(true);
        }
        return;
      }

      const syncedIds = result.signals.map((s) => s.signalId);
      markDiscoveriesClaimed(syncedIds);
      if (result.added > 0) {
        setClaimNotice(
          t("signals.addedCount", { count: result.added }),
        );
      }
      await loadSignals(token);
    },
    [loadSignals, t],
  );

  const loadMine = useCallback(
    async (active: User) => {
      setLoading(true);
      setError(false);
      try {
        const token = await getIdTokenOrNull(active);
        if (!token) {
          setPayload(null);
          setError(true);
          return;
        }
        const response = await fetch("/api/trace?view=mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json().catch(() => null)) as
          | MyMiavResponse
          | { error?: string }
          | null;
        if (!response.ok) {
          setPayload(null);
          setError(true);
          return;
        }
        const next: MyMiavResponse = {
          miavId:
            data && "miavId" in data && typeof data.miavId === "string"
              ? data.miavId
              : null,
          activities:
            data && "activities" in data && Array.isArray(data.activities)
              ? data.activities
              : [],
        };
        setPayload(next);

        if (next.miavId) {
          await loadSignals(token);
          if (!claimAttempted.current) {
            claimAttempted.current = true;
            await syncPendingClaims(token, true);
          }
        } else {
          setSignals([]);
        }
      } catch {
        setPayload(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [loadSignals, syncPendingClaims],
  );

  useEffect(() => {
    void completeTraceRedirectSignIn();
    return watchAuth((next) => {
      setUser(next);
      setAuthReady(true);
      claimAttempted.current = false;
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user || getTraceAuthType(user) !== "google") {
      setPayload(null);
      setSignals([]);
      setLoading(false);
      setError(false);
      return;
    }
    void loadMine(user);
  }, [authReady, user, loadMine]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#signals") return;
    const el = document.getElementById("signals");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [payload, signals]);

  async function confirmSignIn() {
    setSignInBusy(true);
    try {
      await signInTraceGoogle();
      setGoogleDialogOpen(false);
    } catch (err) {
      console.warn(formatAuthError(err));
    } finally {
      setSignInBusy(false);
    }
  }

  const isGoogle = getTraceAuthType(user) === "google";
  const groups = payload
    ? groupMyActivitiesByCategory(payload.activities)
    : [];
  const activityCount = payload?.activities.length ?? 0;

  return (
    <div className="trace-map-shell min-h-[70vh]">
      <header className="border-b border-[var(--map-line)] px-5 py-5 pl-14 sm:px-8 sm:py-6 lg:pl-8">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-[clamp(1.6rem,3.5vw,2.2rem)] font-medium tracking-[0.08em] text-[var(--map-ink)]">
            {t("myMiav.title")}
          </h1>
          <p className="mt-2 max-w-md text-[0.9rem] leading-[1.65] text-[var(--map-muted)]">
            {t("myMiav.subtitle")}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8 sm:px-8">
        {!authReady || (isGoogle && loading && !payload && !error) ? (
          <p
            role="status"
            aria-live="polite"
            className="text-[0.85rem] tracking-[0.1em] text-[var(--map-muted)]"
          >
            {t("myMiav.loading")}
          </p>
        ) : null}

        {authReady && !isGoogle ? (
          <section className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
            <p className="text-[0.9rem] leading-[1.8] text-[var(--map-ink)]">
              {t("myMiav.signInPrompt")}
            </p>
            {isFirebaseClientConfigured() ? (
              <button
                type="button"
                onClick={() => setGoogleDialogOpen(true)}
                className="mt-5 min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-6 text-[0.75rem] tracking-[0.14em] text-[var(--map-ink)]"
              >
                {t("world.signInWithGoogle")}
              </button>
            ) : null}
          </section>
        ) : null}

        {authReady && isGoogle && error ? (
          <section
            role="alert"
            className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6"
          >
            <p className="text-[0.9rem] leading-[1.8] text-[var(--map-ink)]">
              {t("myMiav.loadError")}
            </p>
            <button
              type="button"
              onClick={() => user && void loadMine(user)}
              className="mt-4 min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)]"
            >
              {t("myMiav.tryAgain")}
            </button>
          </section>
        ) : null}

        {authReady && isGoogle && !error && payload && !payload.miavId ? (
          <section className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
            <p className="text-[0.95rem] font-medium tracking-[0.04em] text-[var(--map-ink)]">
              {t("myMiav.noIdYet")}
            </p>
            <p className="mt-3 text-[0.88rem] leading-[1.8] text-[var(--map-muted)]">
              {t("myMiav.noIdHelp")}
            </p>
            {listPendingDiscoveries().length > 0 ? (
              <p className="mt-3 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
                {t("signals.pendingWaiting")}
              </p>
            ) : null}
            <a
              href="/world-map"
              className="mt-5 inline-flex min-h-[44px] items-center border border-[#9bb0c2] bg-[#e8eef4] px-6 text-[0.75rem] tracking-[0.14em] text-[var(--map-ink)]"
            >
              {t("myMiav.goToWorld")}
            </a>
          </section>
        ) : null}

        {authReady && isGoogle && !error && payload?.miavId ? (
          <>
            <section className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6">
              <MiavIdCopy miavId={payload.miavId} compact />
              <p className="mt-4 text-[0.82rem] tracking-[0.04em] text-[var(--map-muted)]">
                {activityCount === 1
                  ? t("myMiav.activityCountOne", { count: activityCount })
                  : t("myMiav.activityCountMany", { count: activityCount })}
              </p>
              <a
                href="/world-map"
                className="mt-5 inline-flex min-h-[44px] items-center border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)]"
              >
                {activityCount > 0
                  ? t("myMiav.leaveAnother")
                  : t("myMiav.goToWorld")}
              </a>
            </section>

            <section aria-labelledby="my-miav-activity-heading">
              <h2
                id="my-miav-activity-heading"
                className="text-[0.72rem] tracking-[0.16em] text-[var(--map-muted)] uppercase"
              >
                {t("myMiav.activity")}
              </h2>

              {groups.length === 0 ? (
                <p className="mt-4 text-[0.88rem] leading-[1.8] text-[var(--map-muted)]">
                  {t("myMiav.noActivities")}
                </p>
              ) : (
                <div className="mt-5 space-y-8">
                  {groups.map((group) => {
                    const color = CATEGORY_MAP_COLORS[group.category];
                    return (
                      <div key={group.category}>
                        <h3 className="flex items-center gap-2 text-[0.78rem] font-medium tracking-[0.14em] text-[var(--map-ink)]">
                          <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2"
                            style={{
                              clipPath:
                                "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                              backgroundColor: color.fill,
                            }}
                          />
                          {t(CATEGORY_LABEL_KEY[group.category])}
                        </h3>
                        <ul className="mt-3 space-y-5">
                          {group.activities.map((activity) => (
                            <li
                              key={`${activity.workId}-${activity.createdAt}`}
                              className="border-b border-[var(--map-line)] pb-5 last:border-b-0 last:pb-0"
                            >
                              <p className="text-[0.95rem] tracking-[0.04em] text-[var(--map-ink)]">
                                {workLabelForId(activity.workId)}
                              </p>
                              <p className="mt-1 text-[0.82rem] text-[var(--map-muted)]">
                                {placeLine(activity)}
                              </p>
                              <p className="mt-0.5 text-[0.78rem] text-[var(--map-muted)]">
                                {formatJoinedDate(activity.createdAt)}
                              </p>
                              <p className="mt-3 text-[0.9rem] leading-[1.75] break-words text-[var(--map-ink)]">
                                {activity.message}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section
              id="signals"
              aria-labelledby="my-miav-signals-heading"
              className="scroll-mt-4"
            >
              <h2
                id="my-miav-signals-heading"
                className="text-[0.72rem] tracking-[0.16em] text-[var(--map-muted)] uppercase"
              >
                {t("signals.sectionTitle")}
              </h2>

              <div
                role="status"
                aria-live="polite"
                className="mt-3 space-y-2"
              >
                {claimNotice ? (
                  <p className="text-[0.82rem] text-[#4a7c59]">{claimNotice}</p>
                ) : null}
                {claimError ? (
                  <p className="text-[0.82rem] text-[#8b4a4a]">
                    {t("signals.claimError")}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        claimAttempted.current = false;
                        if (user) void loadMine(user);
                      }}
                    >
                      {t("myMiav.tryAgain")}
                    </button>
                  </p>
                ) : null}
              </div>

              {signalsLoading && signals.length === 0 ? (
                <p className="mt-4 text-[0.82rem] text-[var(--map-muted)]">
                  {t("myMiav.loading")}
                </p>
              ) : null}

              {!signalsLoading && signals.length === 0 ? (
                <p className="mt-4 text-[0.88rem] leading-[1.8] text-[var(--map-muted)]">
                  {t("signals.noneYet")}
                </p>
              ) : null}

              {signals.length > 0 ? (
                <ul className="mt-5 space-y-6">
                  {signals.map((signal) => (
                    <li
                      key={signal.signalId}
                      className="border-b border-[var(--map-line)] pb-5 last:border-b-0"
                    >
                      <p className="text-[0.95rem] tracking-[0.04em] text-[var(--map-ink)]">
                        {signal.title}
                      </p>
                      <p className="mt-1 text-[0.75rem] tracking-[0.1em] text-[var(--map-muted)] uppercase">
                        {SOURCE_LABEL_KEY[signal.source]
                          ? t(SOURCE_LABEL_KEY[signal.source]!)
                          : signal.source}
                      </p>
                      <SignalCodeCopy
                        code={signal.code}
                        title={signal.title}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-6 text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
                {t("signals.deviceNote")}
              </p>
            </section>
          </>
        ) : null}
      </div>

      <GoogleSignInDialog
        open={googleDialogOpen}
        busy={signInBusy}
        onClose={() => setGoogleDialogOpen(false)}
        onConfirm={() => void confirmSignIn()}
      />
    </div>
  );
}
