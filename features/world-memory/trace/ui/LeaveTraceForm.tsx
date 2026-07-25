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
import { TRACE_PRIVACY_BLURB } from "@/features/world-memory/trace/policyCopy";
import { TRACE_DISABLED_MESSAGE } from "@/features/dashboard/site-control/types";
import { GoogleSignInDialog } from "@/features/world-memory/trace/ui/GoogleSignInDialog";
import { getOrCreateVisitorId } from "@/features/world-memory/trace/visitorId";
import { PlaceCascadePicker } from "@/features/world-memory/map/PlaceCascadePicker";

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

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return email;
  if (local.length <= 3) {
    return `${local.slice(0, 1)}****@${domain}`;
  }
  return `${local.slice(0, 3)}****@${domain}`;
}

/** Prefer display name; otherwise a masked email for self-check without full PII. */
function googleAccountLabel(user: User | null): string | null {
  if (!user) return null;
  const name = user.displayName?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return maskEmail(email);
  return null;
}

function GoogleSignedInAs({ user }: { user: User | null }) {
  const label = googleAccountLabel(user);
  return (
    <div className="mt-2">
      <p className="flex flex-wrap items-center gap-1.5 text-[0.78rem] tracking-[0.04em] text-[var(--map-ink)]">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-[#4285F4]"
        />
        Google ✓
      </p>
      {label ? (
        <>
          <p className="mt-1 text-[0.72rem] tracking-[0.08em] text-[var(--map-muted)] uppercase">
            Signed in as
          </p>
          <p className="mt-0.5 text-[0.88rem] leading-[1.5] text-[var(--map-ink)]">
            {label}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
          Signed in with Google
        </p>
      )}
    </div>
  );
}

function StatusHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
      {children}
    </p>
  );
}

function BenefitRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
      <span className="shrink-0 text-[#4a7c59]" aria-hidden="true">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function PermanentMemoryNote() {
  return (
    <p className="text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
      <span className="text-[var(--map-ink)]">Permanent Memory</span>
      <br />
      Linked to your Google account
    </p>
  );
}

function MemorySessionStatus({
  user,
  isGoogle,
  googleMemoryPosted,
  guestMemoryPosted,
  guestMine,
  googleMine,
  onContinueGoogle,
}: {
  user: User | null;
  isGoogle: boolean;
  googleMemoryPosted: boolean;
  guestMemoryPosted: boolean;
  guestMine: TracePin | null;
  googleMine: TracePin | null;
  onContinueGoogle?: () => void;
}) {
  if (googleMemoryPosted) {
    const place =
      googleMine?.city && googleMine?.country
        ? `${googleMine.city}, ${googleMine.country}`
        : null;

    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 border border-[var(--map-line)] bg-white px-4 py-4"
      >
        <StatusHeading>Your Status</StatusHeading>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span aria-hidden="true" className="text-[#4a7c59]">
            ✓
          </span>
          <span className="font-medium">Google Memory</span>
          <span className="text-[#4a7c59]" aria-hidden="true">
            ✓
          </span>
        </p>
        {place ? (
          <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
            Place: {place}
          </p>
        ) : null}
        <div className="mt-2">
          <PermanentMemoryNote />
        </div>
        {isGoogle ? <GoogleSignedInAs user={user} /> : null}
        <p className="mt-3 text-[0.85rem] leading-[1.8] text-[var(--map-ink)]">
          Your permanent Google Memory has already been saved.
        </p>
        <p className="mt-1 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          Editing is not available.
        </p>
      </div>
    );
  }

  // Guest Memory posted — optional Google upgrade, not a required next step.
  if (guestMemoryPosted && !isGoogle) {
    const place =
      guestMine?.city && guestMine?.country
        ? `${guestMine.city}, ${guestMine.country}`
        : null;

    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 border border-[var(--map-line)] bg-white px-4 py-4"
      >
        <StatusHeading>Your Status</StatusHeading>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span aria-hidden="true" className="text-[#4a7c59]">
            ✓
          </span>
          <span className="font-medium">Guest Memory Posted</span>
        </p>
        {place ? (
          <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
            Place: {place}
          </p>
        ) : null}
        <p className="mt-2 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          Your Guest Memory has been saved. Guest Memories cannot be edited —
          you may leave it as is.
        </p>

        {onContinueGoogle && isFirebaseClientConfigured() ? (
          <div className="mt-4 border-t border-[var(--map-line)] pt-4">
            <p className="text-[0.85rem] leading-[1.8] text-[var(--map-ink)]">
              Want to leave a permanent Memory?
            </p>
            <p className="mt-1 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
              Optional — your Guest Memory stays. Google lets you leave one more
              Memory, linked to your Google account.
            </p>
            <ul className="mt-3 space-y-1">
              <BenefitRow>Up to {MAX_GOOGLE_MESSAGE_LENGTH} characters</BenefitRow>
              <BenefitRow>Permanent — linked to your Google account</BenefitRow>
              <BenefitRow>Separate from your Guest Memory</BenefitRow>
            </ul>
            <button
              type="button"
              onClick={onContinueGoogle}
              className="mt-4 min-h-[44px] w-full cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)] sm:w-auto"
            >
              Sign in with Google
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (isGoogle) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 border border-[var(--map-line)] bg-white px-4 py-4"
      >
        <StatusHeading>Your Status</StatusHeading>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-[#4285F4]"
          />
          <span className="font-medium">Google Account</span>
          <span className="text-[#4a7c59]" aria-hidden="true">
            ✓
          </span>
        </p>
        <div className="mt-2">
          <PermanentMemoryNote />
        </div>
        <p className="mt-1 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
          Maximum: {MAX_GOOGLE_MESSAGE_LENGTH} characters
        </p>
        <GoogleSignedInAs user={user} />
        {guestMemoryPosted ? (
          <p className="mt-3 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
            Your Guest Memory remains in this browser. You may optionally leave
            one separate permanent Memory linked to this Google account.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 border border-[var(--map-line)] bg-white px-4 py-4"
    >
      <StatusHeading>Your Status</StatusHeading>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.85rem] tracking-[0.04em] text-[var(--map-ink)]">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full border border-[#9bb0c2] bg-[#e8eef4]"
        />
        <span className="font-medium">Guest Visitor</span>
      </p>
      <p className="mt-1.5 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
        Temporary Memory · Maximum: {MAX_GUEST_MESSAGE_LENGTH} characters
      </p>
      <p className="mt-3 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
        No login required. Optionally, you can later sign in with Google to leave
        one permanent Memory linked to your Google account — separate from a Guest
        Memory.
      </p>
    </div>
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

  const guestMine =
    mine?.authType === "guest" || mine?.authType === "anonymous" ? mine : null;
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
      setError("Choose a continent, country, region, and city first.");
      return;
    }
    if (!message.trim()) {
      setError("Write a short Memory before saving.");
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
        setError(data?.error || "Unable to save Memory.");
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
            Leave a Memory
          </h2>
          {canWrite ? (
            <p className="mt-2 text-[0.82rem] leading-[1.8] text-[var(--map-muted)]">
              {isGoogle
                ? `Choose a continent, then a country, then a city. Signed in with Google — up to ${MAX_GOOGLE_MESSAGE_LENGTH} characters.`
                : `Choose a continent, then a country, then a city. No login required — up to ${MAX_GUEST_MESSAGE_LENGTH} characters.`}
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
              Write a Memory
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] cursor-pointer px-3 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      {traceEnabled ? (
        <MemorySessionStatus
          user={user}
          isGoogle={isGoogle}
          googleMemoryPosted={googleMemoryPosted}
          guestMemoryPosted={guestMemoryPosted}
          guestMine={guestMine}
          googleMine={googleMine}
          onContinueGoogle={() => setGoogleDialogOpen(true)}
        />
      ) : null}

      {!traceEnabled ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {TRACE_DISABLED_MESSAGE}
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
              Memory ({message.length}/{maxLength})
              {isGoogle ? (
                <span className="ml-2 normal-case tracking-[0.04em] text-[var(--map-ink)]">
                  · Google · up to {MAX_GOOGLE_MESSAGE_LENGTH}
                </span>
              ) : (
                <span className="ml-2 normal-case tracking-[0.04em]">
                  · Guest · up to {MAX_GUEST_MESSAGE_LENGTH}
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
              placeholder="A quiet note that you read here…"
            />
          </div>

          {!isGoogle && isFirebaseClientConfigured() ? (
            <button
              type="button"
              onClick={() => setGoogleDialogOpen(true)}
              className="text-[0.78rem] tracking-[0.08em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
            >
              Sign in to Leave a Permanent Memory ({MAX_GOOGLE_MESSAGE_LENGTH}{" "}
              chars)
            </button>
          ) : null}

          {isGoogle ? <GoogleSignedInAs user={user} /> : null}

          {error ? (
            <p className="text-[0.82rem] text-[#8b4a4a]">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Write a Memory"}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                onClose?.();
              }}
              className="min-h-[44px] cursor-pointer px-3 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]"
            >
              Cancel
            </button>
          </div>

          <p className="text-[0.75rem] leading-[1.7] text-[var(--map-muted)]">
            {TRACE_PRIVACY_BLURB}
          </p>
        </form>
      ) : null}

      <GoogleSignInDialog
        open={googleDialogOpen}
        onClose={() => setGoogleDialogOpen(false)}
        onConfirm={() => {
          setGoogleDialogOpen(false);
          void signInTraceGoogle();
        }}
      />
    </section>
  );
}
