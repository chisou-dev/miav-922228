"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  MAX_GUEST_MESSAGE_LENGTH,
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
import { getOrCreateVisitorId } from "@/features/world-memory/trace/visitorId";
import { PlaceCascadePicker } from "@/features/world-memory/map/PlaceCascadePicker";
import { useT } from "@/features/shared/i18n";

type SelectedPlace = {
  locationId: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  user: User | null;
  posted: boolean;
  guestPosted: boolean;
  mine: TracePin | null;
  selectedPlace: SelectedPlace | null;
  onSelectPlace: (place: SelectedPlace | null) => void;
  onFocusLocation: (focus: { lat: number; lng: number; zoom: number }) => void;
  onSaved: (trace: TracePin) => void;
  /** When set, panel is shown below the map — Close dismisses the panel. */
  onClose?: () => void;
};

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

function PermanentMemoryCta({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  const t = useT();
  if (!onContinue || !isFirebaseClientConfigured()) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onContinue}
        className="min-h-[44px] w-full cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)] sm:w-auto"
      >
        {t("world.continueToPermanent")}
      </button>
      <p className="mt-2 text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
        {t("world.verifiedGoogle")}
      </p>
    </div>
  );
}

function MemoryKindHint() {
  const t = useT();
  const [first, second] = t("world.memoryKindHint").split("\n");
  return (
    <p className="mt-4 border-t border-[var(--map-line)] pt-3 text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
      {first}
      <br />
      {second}
    </p>
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

function MiavIdCopy({ miavId }: { miavId: string }) {
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
    <div className="mt-2">
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
          className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center text-[0.95rem] text-[var(--map-muted)] hover:text-[var(--map-ink)]"
        >
          <span aria-hidden="true">📋</span>
        </button>
        {copied ? (
          <span className="text-[0.72rem] tracking-[0.06em] text-[#4a7c59]">
            {t("world.copied")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Status only — archive shows Place / Memory / Left.
 * Memory is the subject; Google is a quiet verification note.
 * Never shows Google name, email, or photo.
 */
function MemorySessionStatus({
  isGoogle,
  googleMemoryPosted,
  guestMemoryPosted,
  googleMine,
  onContinueGoogle,
}: {
  isGoogle: boolean;
  googleMemoryPosted: boolean;
  guestMemoryPosted: boolean;
  googleMine: TracePin | null;
  onContinueGoogle?: () => void;
}) {
  const t = useT();

  // 4) Permanent Memory posted
  if (googleMemoryPosted) {
    const miavId = googleMine?.miavId ?? null;
    return (
      <StatusCard>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span aria-hidden="true" className="text-[#4a7c59]">
            ✓
          </span>
          <span className="font-medium">{t("world.permanentMemory")}</span>
        </p>
        {miavId ? <MiavIdCopy miavId={miavId} /> : null}
        <p className="mt-3 text-[0.85rem] leading-[1.7] text-[var(--map-ink)]">
          {t("world.permanentMemorySaved")}
        </p>
        <VerifiedWithGoogle />
        <p className="mt-1 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.editingUnavailable")}
        </p>
      </StatusCard>
    );
  }

  // 3) Permanent Memory path open (verified, not posted)
  if (isGoogle) {
    return (
      <StatusCard>
        <p className="mt-2 text-[0.85rem] font-medium tracking-[0.04em] text-[var(--map-ink)]">
          {t("world.permanentMemory")}
        </p>
        <VerifiedWithGoogle />
        <p className="mt-2 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.charactersAvailable", { count: MAX_GOOGLE_MESSAGE_LENGTH })}
        </p>
      </StatusCard>
    );
  }

  // 2) Temporary Memory saved — optional Permanent path
  if (guestMemoryPosted) {
    return (
      <StatusCard>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span aria-hidden="true" className="text-[#4a7c59]">
            ✓
          </span>
          <span className="font-medium">{t("world.temporaryMemory")}</span>
        </p>
        <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.temporaryMemorySaved")}
        </p>
        <p className="mt-0.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          {t("world.temporaryCannotEdit")}
        </p>
        <PermanentMemoryCta onContinue={onContinueGoogle} />
        <MemoryKindHint />
      </StatusCard>
    );
  }

  // 1) Temporary Memory — not posted
  return (
    <StatusCard>
      <p className="mt-2 text-[0.85rem] font-medium tracking-[0.04em] text-[var(--map-ink)]">
        {t("world.temporaryMemory")}
      </p>
      <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
        {t("world.charactersAvailable", { count: MAX_GUEST_MESSAGE_LENGTH })}
      </p>
      <PermanentMemoryCta onContinue={onContinueGoogle} />
      <MemoryKindHint />
    </StatusCard>
  );
}

export function LeaveTraceForm({
  user,
  posted,
  guestPosted,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [traceEnabled, setTraceEnabled] = useState(true);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const authType = getTraceAuthType(user);
  const isGoogle = authType === "google";
  const maxLength = isGoogle
    ? MAX_GOOGLE_MESSAGE_LENGTH
    : MAX_GUEST_MESSAGE_LENGTH;

  const googleMemoryPosted = Boolean(
    mine?.authType === "google" || (isGoogle && posted),
  );
  // When Google is signed in, `posted` is Google-only; guest flag comes from guestPosted.
  const guestMemoryPosted =
    guestPosted ||
    mine?.authType === "guest" ||
    mine?.authType === "anonymous" ||
    (!isGoogle && posted);

  const googleMine = mine?.authType === "google" ? mine : null;

  const canWrite =
    traceEnabled && (isGoogle ? !googleMemoryPosted : !guestMemoryPosted);

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

  // Keep draft within the active auth limit (Guest 50 / Google 500).
  useEffect(() => {
    setMessage((current) =>
      current.length > maxLength ? current.slice(0, maxLength) : current,
    );
  }, [maxLength]);

  useEffect(() => {
    if (!canWrite || !composerOpen) return;
    const id = window.setTimeout(() => messageRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [canWrite, composerOpen, isGoogle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    if (!selectedPlace) {
      setError(t("world.choosePlaceFirst"));
      return;
    }
    if (!message.trim()) {
      setError(t("world.writeMemoryFirst"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let token: string | null = null;
      if (isGoogle && user) {
        token = await getIdTokenOrNull(user);
      }

      const body: Record<string, string> = {
        locationId: selectedPlace.locationId,
        message,
      };
      if (!token) {
        body.visitorId = getOrCreateVisitorId();
      }

      const response = await fetch("/api/trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
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
        onSaved(data.trace);
        setComposerOpen(false);
        setMessage("");
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1rem] font-medium tracking-[0.14em] text-[var(--map-ink)] uppercase">
            {t("world.leaveMemory")}
          </h2>
          {canWrite ? (
            <p className="mt-2 text-[0.82rem] leading-[1.8] text-[var(--map-muted)]">
              {isGoogle
                ? t("world.composerHelpGoogle", { max: MAX_GOOGLE_MESSAGE_LENGTH })
                : t("world.composerHelpGuest", { max: MAX_GUEST_MESSAGE_LENGTH })}
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
          googleMemoryPosted={googleMemoryPosted}
          guestMemoryPosted={guestMemoryPosted}
          googleMine={googleMine}
          onContinueGoogle={() => setGoogleDialogOpen(true)}
        />
      ) : null}

      {!traceEnabled ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {t("world.traceDisabled")}
        </p>
      ) : null}

      {canWrite && composerOpen ? (
        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
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
              {t("world.memoryLabel", { current: message.length, max: maxLength })}
              {isGoogle ? (
                <span className="ml-2 normal-case tracking-[0.04em] text-[var(--map-ink)]">
                  {t("world.googleLabel", { max: MAX_GOOGLE_MESSAGE_LENGTH })}
                </span>
              ) : (
                <span className="ml-2 normal-case tracking-[0.04em]">
                  {t("world.guestLabel", { max: MAX_GUEST_MESSAGE_LENGTH })}
                </span>
              )}
            </label>
            <textarea
              key={isGoogle ? "google-memory" : "guest-memory"}
              ref={messageRef}
              value={message}
              maxLength={maxLength}
              onChange={(event) => {
                setError(null);
                setMessage(event.target.value.slice(0, maxLength));
              }}
              rows={isGoogle ? 5 : 2}
              className="mt-2 w-full resize-y border border-[var(--map-line)] bg-white px-3 py-2.5 text-[0.85rem] leading-[1.7] text-[var(--map-ink)]"
              placeholder={t("world.memoryPlaceholder")}
            />
          </div>

          {!isGoogle && isFirebaseClientConfigured() ? (
            <div>
              <button
                type="button"
                onClick={() => setGoogleDialogOpen(true)}
                className="text-[0.78rem] tracking-[0.08em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
              >
                {t("world.continueToPermanent")}
              </button>
              <p className="mt-1 text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
                {t("world.verifiedGoogle")}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="text-[0.82rem] text-[#8b4a4a]">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t("world.saving") : t("world.writeMemory")}
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
            <p>{t("world.privacyBlurbEditOnlyYou")}</p>
            <p>{t("world.privacyBlurbNoEditContent")}</p>
          </div>
        </form>
      ) : null}

      <GoogleSignInDialog
        open={googleDialogOpen}
        onClose={() => setGoogleDialogOpen(false)}
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
