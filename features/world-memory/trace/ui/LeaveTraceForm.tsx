"use client";

import { FormEvent, useEffect, useState } from "react";
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
  mine: TracePin | null;
  selectedPlace: SelectedPlace | null;
  onSelectPlace: (place: SelectedPlace | null) => void;
  onFocusLocation: (focus: { lat: number; lng: number; zoom: number }) => void;
  onSaved: (trace: TracePin) => void;
};

export function LeaveTraceForm({
  user,
  posted,
  mine,
  selectedPlace,
  onSelectPlace,
  onFocusLocation,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [traceEnabled, setTraceEnabled] = useState(true);

  const authType = getTraceAuthType(user);
  const maxLength =
    authType === "google" ? MAX_GOOGLE_MESSAGE_LENGTH : MAX_GUEST_MESSAGE_LENGTH;
  const alreadyPosted = posted || Boolean(mine);
  const canWrite = traceEnabled && !alreadyPosted;

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !selectedPlace) return;

    setBusy(true);
    setError(null);
    try {
      let token: string | null = null;
      if (authType === "google" && user) {
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
        setOpen(false);
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
              Choose a continent, then a country, then a city. No login required
              — up to {MAX_GUEST_MESSAGE_LENGTH} characters. Google sign-in
              allows up to {MAX_GOOGLE_MESSAGE_LENGTH}.
            </p>
          ) : null}
        </div>
        {canWrite && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] text-[var(--map-ink)]"
          >
            Write a Memory
          </button>
        ) : null}
      </div>

      {!traceEnabled ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {TRACE_DISABLED_MESSAGE}
        </p>
      ) : null}

      {traceEnabled && alreadyPosted ? (
        <p className="mt-4 text-[0.85rem] leading-[1.8] text-[var(--map-muted)]">
          {mine
            ? `Your Memory is at ${mine.city}, ${mine.country}. One Memory per browser or Google account — editing is not available.`
            : "You have already left a Memory. One Memory per browser or Google account — editing is not available."}
        </p>
      ) : null}

      {canWrite && open ? (
        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
          <PlaceCascadePicker
            value={selectedPlace}
            onChange={(place) => onSelectPlace(place)}
            onFocusPlace={(place) =>
              onFocusLocation({ lat: place.lat, lng: place.lng, zoom: 5 })
            }
          />
          <input
            type="hidden"
            name="locationId"
            value={selectedPlace?.locationId || ""}
            required
          />

          <div>
            <label className="block text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
              Memory ({message.length}/{maxLength})
            </label>
            <textarea
              value={message}
              maxLength={maxLength}
              onChange={(event) => setMessage(event.target.value)}
              rows={authType === "google" ? 5 : 2}
              required
              className="mt-2 w-full resize-y border border-[var(--map-line)] bg-white px-3 py-2.5 text-[0.85rem] leading-[1.7] text-[var(--map-ink)]"
              placeholder="A quiet note that you read here…"
            />
          </div>

          {authType !== "google" && isFirebaseClientConfigured() ? (
            <button
              type="button"
              onClick={() => setGoogleDialogOpen(true)}
              className="text-[0.78rem] tracking-[0.08em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
            >
              Sign in with Google for a longer Memory ({MAX_GOOGLE_MESSAGE_LENGTH}{" "}
              chars)
            </button>
          ) : null}

          {error ? (
            <p className="text-[0.82rem] text-[#8b4a4a]">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || !selectedPlace || !message.trim()}
              className="min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Memory"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
