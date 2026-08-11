"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  MAX_GOOGLE_MESSAGE_LENGTH,
  type TracePin,
} from "@/features/world-memory/trace/types";
import {
  formatAuthError,
  getIdTokenOrNull,
  getTraceAuthType,
  signInTraceGoogle,
} from "@/features/world-memory/trace/auth";
import { isFirebaseClientConfigured } from "@/features/firebase/client";
import { GoogleSignInDialog } from "@/features/world-memory/trace/ui/GoogleSignInDialog";
import { MiavIdCopy } from "@/features/world-memory/trace/ui/MiavIdCopy";
import { PlaceCascadePicker } from "@/features/world-memory/map/PlaceCascadePicker";
import {
  listEnabledWorksByCategory,
  listPostableCategories,
  type TraceCategory,
} from "@/features/world-memory/trace/works";
import { TraceOriginLabel } from "@/features/world-memory/viewer/TraceOriginLabel";
import { useT, type MessageKey } from "@/features/shared/i18n";

type SelectedPlace = {
  locationId: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  user: User | null;
  /** Public MIAV ID for this Google account (stable across Activities). */
  miavId: string | null;
  postedWorkIds: string[];
  mine: TracePin | null;
  selectedPlace: SelectedPlace | null;
  onSelectPlace: (place: SelectedPlace | null) => void;
  onFocusLocation: (focus: { lat: number; lng: number; zoom: number }) => void;
  onSaved: (trace: TracePin) => void;
  /** When set, panel is shown below the map — Close dismisses the panel. */
  onClose?: () => void;
};

const CATEGORY_LABEL_KEY: Record<TraceCategory, MessageKey> = {
  read: "world.category.read",
  play: "world.category.play",
  apps: "world.category.apps",
};

function pickWorkForCategory(category: TraceCategory): string | null {
  const works = listEnabledWorksByCategory(category);
  if (works.length === 1) return works[0]!.id;
  return null;
}

function StatusHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
      {children}
    </p>
  );
}

function StatusCard({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 border border-[var(--map-line)] bg-white px-4 py-4"
    >
      <StatusHeading>{t("world.yourStatus")}</StatusHeading>
      {children}
    </div>
  );
}

function VerifiedWithGoogle() {
  const t = useT();
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
      <span aria-hidden="true" className="text-[#4a7c59]">
        ✓
      </span>
      {t("world.verifiedGoogle")}
    </p>
  );
}

/**
 * Status only — archive shows Place / Memory / Left.
 * Never shows Google name, email, photo, or Firebase UID.
 */
function MemorySessionStatus({
  isGoogle,
  accountMiavId,
  postedWorkIds,
  mine,
  onSignIn,
}: {
  isGoogle: boolean;
  accountMiavId: string | null;
  postedWorkIds: string[];
  mine: TracePin | null;
  onSignIn?: () => void;
}) {
  const t = useT();
  const hasAnyMemory = postedWorkIds.length > 0 || Boolean(accountMiavId);

  if (isGoogle && hasAnyMemory) {
    return (
      <StatusCard>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span aria-hidden="true" className="text-[#4a7c59]">
            ✓
          </span>
          <span className="font-medium">{t("world.yourMemory")}</span>
        </p>
        {accountMiavId ? <MiavIdCopy miavId={accountMiavId} /> : null}
        {mine?.category && mine.workId ? (
          <div className="mt-3">
            <TraceOriginLabel trace={mine} />
          </div>
        ) : null}
        {postedWorkIds.length > 0 ? (
          <p className="mt-3 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
            {t("world.worksAlreadyLeft", { count: postedWorkIds.length })}
          </p>
        ) : null}
        <VerifiedWithGoogle />
        <p className="mt-1 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.moreWorksAvailable")}
        </p>
      </StatusCard>
    );
  }

  if (isGoogle) {
    return (
      <StatusCard>
        <p className="mt-2 text-[0.85rem] font-medium tracking-[0.04em] text-[var(--map-ink)]">
          {t("world.readyToLeave")}
        </p>
        <VerifiedWithGoogle />
        <p className="mt-2 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.charactersAvailable", { count: MAX_GOOGLE_MESSAGE_LENGTH })}
        </p>
      </StatusCard>
    );
  }

  return (
    <StatusCard>
      <p className="mt-2 text-[0.85rem] font-medium tracking-[0.04em] text-[var(--map-ink)]">
        {t("world.signInToLeave")}
      </p>
      <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
        {t("world.signInToLeaveHelp")}
      </p>
      {onSignIn && isFirebaseClientConfigured() ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onSignIn}
            className="min-h-[44px] w-full cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)] sm:w-auto"
          >
            {t("world.signInWithGoogle")}
          </button>
        </div>
      ) : null}
    </StatusCard>
  );
}

export function LeaveTraceForm({
  user,
  miavId: accountMiavId,
  postedWorkIds,
  mine,
  selectedPlace,
  onSelectPlace,
  onFocusLocation,
  onSaved,
  onClose,
}: Props) {
  const t = useT();
  const [composerOpen, setComposerOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<TraceCategory | null>(null);
  const [workId, setWorkId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [traceEnabled, setTraceEnabled] = useState(true);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  /** After sign-in, retry the save that was interrupted — draft stays in state. */
  const pendingSubmitAfterSignIn = useRef(false);
  const submittingRef = useRef(false);

  const postableCategories = listPostableCategories();
  const enabledWorks = category
    ? listEnabledWorksByCategory(category)
    : [];
  const showWorkPicker = Boolean(category && enabledWorks.length > 1);

  const authType = getTraceAuthType(user);
  const isGoogle = authType === "google";
  const maxLength = MAX_GOOGLE_MESSAGE_LENGTH;

  const workAlreadyPosted = Boolean(
    workId && postedWorkIds.includes(workId),
  );
  const hasAvailableWork = postableCategories.some((cat) =>
    listEnabledWorksByCategory(cat).some(
      (work) => !postedWorkIds.includes(work.id),
    ),
  );

  const canWrite = traceEnabled && hasAvailableWork;

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/site-control");
        const data = (await response.json().catch(() => null)) as {
          traceEnabled?: boolean;
        } | null;
        if (response.ok && typeof data?.traceEnabled === "boolean") {
          setTraceEnabled(data.traceEnabled);
        }
      } catch {
        // non-fatal — keep default enabled
      }
    })();
  }, []);

  useEffect(() => {
    setMessage((current) =>
      current.length > maxLength ? current.slice(0, maxLength) : current,
    );
  }, [maxLength]);

  useEffect(() => {
    if (!canWrite || !composerOpen) return;
    const id = window.setTimeout(() => messageRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [canWrite, composerOpen]);

  function selectCategory(next: TraceCategory) {
    setError(null);
    setCategory(next);
    const auto = pickWorkForCategory(next);
    // Prefer an unposted work when auto-picking among many (single-work cats auto-set).
    if (auto) {
      setWorkId(auto);
      return;
    }
    const firstOpen = listEnabledWorksByCategory(next).find(
      (work) => !postedWorkIds.includes(work.id),
    );
    setWorkId(firstOpen?.id ?? null);
  }

  function draftReady(): boolean {
    if (!category || !workId) {
      setError(t("world.chooseCategoryFirst"));
      return false;
    }
    if (postedWorkIds.includes(workId)) {
      setError(t("world.alreadyLeftForWork"));
      return false;
    }
    if (!selectedPlace) {
      setError(t("world.choosePlaceFirst"));
      return false;
    }
    if (!message.trim()) {
      setError(t("world.writeMemoryFirst"));
      return false;
    }
    return true;
  }

  const saveMemory = async (activeUser: User) => {
    if (!draftReady()) return;
    if (submittingRef.current) return;

    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdTokenOrNull(activeUser);
      if (!token) {
        setError(t("world.signInRequired"));
        pendingSubmitAfterSignIn.current = true;
        setGoogleDialogOpen(true);
        return;
      }

      const response = await fetch("/api/trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationId: selectedPlace!.locationId,
          message,
          category,
          workId,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        trace?: TracePin;
      } | null;

      if (!response.ok) {
        setError(data?.error || t("world.saveError"));
        return;
      }

      if (data?.trace) {
        pendingSubmitAfterSignIn.current = false;
        onSaved(data.trace);
        setMessage("");
        setCategory(null);
        setWorkId(null);
        // Keep form open when other works remain available.
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    if (!draftReady()) return;

    if (!isGoogle || !user) {
      pendingSubmitAfterSignIn.current = true;
      setError(null);
      setGoogleDialogOpen(true);
      return;
    }

    await saveMemory(user);
  }

  // After Google sign-in, resume the interrupted save without clearing the draft.
  useEffect(() => {
    if (!isGoogle || !user || !pendingSubmitAfterSignIn.current) return;
    if (!canWrite) {
      pendingSubmitAfterSignIn.current = false;
      return;
    }
    if (!category || !workId || !selectedPlace || !message.trim()) return;
    if (submittingRef.current) return;

    pendingSubmitAfterSignIn.current = false;
    void saveMemory(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogle, user]);

  return (
    <section className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1rem] font-medium tracking-[0.14em] text-[var(--map-ink)] uppercase">
            {t("world.leaveMemory")}
          </h2>
          {canWrite ? (
            <p className="mt-2 text-[0.82rem] leading-[1.8] text-[var(--map-muted)]">
              {t("world.composerHelp", { max: MAX_GOOGLE_MESSAGE_LENGTH })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canWrite && !composerOpen ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] text-[var(--map-ink)]"
            >
              {t("world.writeMemory")}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] cursor-pointer px-3 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
            >
              {t("world.close")}
            </button>
          ) : null}
        </div>
      </div>

      {traceEnabled ? (
        <MemorySessionStatus
          isGoogle={isGoogle}
          accountMiavId={accountMiavId}
          postedWorkIds={postedWorkIds}
          mine={mine}
          onSignIn={() => setGoogleDialogOpen(true)}
        />
      ) : null}

      {!traceEnabled ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {t("world.traceDisabled")}
        </p>
      ) : null}

      {traceEnabled && !hasAvailableWork && isGoogle ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {t("world.allWorksLeft")}
        </p>
      ) : null}

      {canWrite && composerOpen ? (
        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
          <fieldset>
            <legend className="text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
              {t("world.whatBroughtYou")}
            </legend>
            <div
              role="group"
              aria-label={t("world.whatBroughtYou")}
              className="mt-2 grid grid-cols-3 gap-2"
            >
              {postableCategories.map((item) => {
                const selected = category === item;
                const catWorks = listEnabledWorksByCategory(item);
                const allDone = catWorks.every((w) =>
                  postedWorkIds.includes(w.id),
                );
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    disabled={allDone}
                    onClick={() => selectCategory(item)}
                    className={`min-h-[44px] cursor-pointer border px-2 text-[0.72rem] tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-45 ${
                      selected
                        ? "border-[#6b879c] bg-[#dfe8f0] font-medium text-[var(--map-ink)] ring-1 ring-[#6b879c]"
                        : "border-[var(--map-line)] bg-white text-[var(--map-muted)]"
                    }`}
                  >
                    {t(CATEGORY_LABEL_KEY[item])}
                    {allDone ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {showWorkPicker ? (
            <fieldset>
              <legend className="text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
                {t("world.chooseWork")}
              </legend>
              <div
                role="group"
                aria-label={t("world.chooseWork")}
                className="mt-2 flex flex-col gap-2"
              >
                {enabledWorks.map((work) => {
                  const selected = workId === work.id;
                  const done = postedWorkIds.includes(work.id);
                  return (
                    <button
                      key={work.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={done}
                      onClick={() => {
                        setError(null);
                        setWorkId(work.id);
                      }}
                      className={`min-h-[44px] cursor-pointer border px-4 text-left text-[0.82rem] tracking-[0.04em] disabled:cursor-not-allowed disabled:opacity-45 ${
                        selected
                          ? "border-[#6b879c] bg-[#dfe8f0] font-medium text-[var(--map-ink)] ring-1 ring-[#6b879c]"
                          : "border-[var(--map-line)] bg-white text-[var(--map-ink)]"
                      }`}
                    >
                      {work.label}
                      {done ? ` — ${t("world.alreadyLeftShort")}` : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {workAlreadyPosted ? (
            <p className="text-[0.82rem] text-[#8b4a4a]">
              {t("world.alreadyLeftForWork")}
            </p>
          ) : null}

          <PlaceCascadePicker
            value={selectedPlace}
            onChange={(place) => {
              setError(null);
              onSelectPlace(place);
            }}
            onFocusPlace={(place) =>
              onFocusLocation({ lat: place.lat, lng: place.lng, zoom: 5 })
            }
          />

          <div>
            <label className="block text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
              {t("world.memoryLabel", {
                current: message.length,
                max: maxLength,
              })}
            </label>
            <textarea
              ref={messageRef}
              value={message}
              maxLength={maxLength}
              onChange={(event) => {
                setError(null);
                setMessage(event.target.value.slice(0, maxLength));
              }}
              rows={4}
              className="mt-2 w-full resize-y border border-[var(--map-line)] bg-white px-3 py-2.5 text-[0.85rem] leading-[1.7] text-[var(--map-ink)]"
              placeholder={t("world.memoryPlaceholder")}
            />
          </div>

          {error ? (
            <p className="text-[0.82rem] text-[#8b4a4a]">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || workAlreadyPosted}
              className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? t("world.saving")
                : isGoogle
                  ? t("world.writeMemory")
                  : t("world.writeMemorySignIn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                onClose?.();
              }}
              className="min-h-[44px] cursor-pointer px-3 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]"
            >
              {t("world.cancel")}
            </button>
          </div>

          <div className="space-y-1.5 text-[0.75rem] leading-[1.7] text-[var(--map-muted)]">
            <p>{t("world.privacyBlurbSignIn")}</p>
            <p>{t("world.privacyBlurbNoInfo")}</p>
            <p>{t("world.privacyBlurbNoEditContent")}</p>
          </div>
        </form>
      ) : null}

      <GoogleSignInDialog
        open={googleDialogOpen}
        onClose={() => {
          if (!busy) setGoogleDialogOpen(false);
        }}
        onConfirm={() => {
          setGoogleDialogOpen(false);
          void (async () => {
            try {
              setError(null);
              await signInTraceGoogle();
            } catch (err) {
              setError(formatAuthError(err));
            }
          })();
        }}
      />
    </section>
  );
}

