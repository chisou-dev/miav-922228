"use client";

import { FormEvent, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  TRACE_COUNTRIES,
  findCountry,
  resolveLocationCoords,
} from "@/lib/trace/locations";
import { MAX_TRACE_MESSAGE_LENGTH, type TracePin } from "@/lib/trace/types";
import {
  formatAuthError,
  getIdTokenOrNull,
  getTraceAuthType,
  signInTraceAnonymous,
  signInTraceGoogle,
} from "@/lib/trace/auth";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { TRACE_PRIVACY_BLURB } from "@/lib/trace/policyCopy";
import { GoogleSignInDialog } from "@/components/trace/GoogleSignInDialog";

type LocationDraft = {
  country: string;
  region: string;
  city: string;
};

type Props = {
  user: User | null;
  mine: TracePin | null;
  draft: LocationDraft;
  onDraftChange: (next: LocationDraft) => void;
  onFocusLocation: (focus: { lat: number; lng: number; zoom: number }) => void;
  onSaved: (trace: TracePin) => void;
};

export function LeaveTraceForm({
  user,
  mine,
  draft,
  onDraftChange,
  onFocusLocation,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(mine?.message || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);

  const country = useMemo(
    () => findCountry(draft.country) || TRACE_COUNTRIES[0],
    [draft.country],
  );
  const regions = country?.regions || [];
  const region =
    regions.find((r) => r.name === draft.region) || regions[0] || null;
  const cities = region?.cities || [];

  const authType = getTraceAuthType(user);
  const configured = isFirebaseClientConfigured();
  const isPermanent = authType === "google";
  const isAnonymousSession = Boolean(user && authType === "anonymous");

  function setCountry(name: string) {
    const nextCountry = findCountry(name) || TRACE_COUNTRIES[0]!;
    const nextRegion = nextCountry.regions[0]!;
    const nextCity = nextRegion.cities[0]!;
    const next = {
      country: nextCountry.name,
      region: nextRegion.name,
      city: nextCity.name,
    };
    onDraftChange(next);
    const coords = resolveLocationCoords(next);
    if (coords) onFocusLocation(coords);
  }

  function setRegion(name: string) {
    const nextRegion =
      country?.regions.find((r) => r.name === name) || country?.regions[0];
    if (!country || !nextRegion) return;
    const nextCity = nextRegion.cities[0]!;
    const next = {
      country: country.name,
      region: nextRegion.name,
      city: nextCity.name,
    };
    onDraftChange(next);
    onFocusLocation({
      lat: nextCity.lat,
      lng: nextCity.lng,
      zoom: 10,
    });
  }

  function setCity(name: string) {
    const nextCity = cities.find((c) => c.name === name) || cities[0];
    if (!country || !region || !nextCity) return;
    const next = {
      country: country.name,
      region: region.name,
      city: nextCity.name,
    };
    onDraftChange(next);
    onFocusLocation({
      lat: nextCity.lat,
      lng: nextCity.lng,
      zoom: 11,
    });
  }

  async function ensureAnonymous() {
    setError(null);
    setAuthNote(null);
    setBusy(true);
    try {
      if (!configured) {
        setError("Firebase is not configured.");
        return;
      }
      await signInTraceAnonymous();
      setAuthNote("Anonymous session ready. You can leave a Temporary Trace.");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function upgradeExistingTrace(activeUser: User) {
    if (!mine || mine.authType !== "anonymous") return mine;
    const token = await getIdTokenOrNull(activeUser);
    if (!token) return mine;

    const response = await fetch("/api/trace", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "upgrade" }),
    });
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      trace?: TracePin;
    } | null;

    if (!response.ok || !data?.trace) {
      throw new Error(data?.error || "Unable to upgrade Trace.");
    }
    return data.trace;
  }

  async function confirmGoogleSignIn() {
    setError(null);
    setAuthNote(null);
    setBusy(true);
    try {
      if (!configured) {
        setError("Firebase is not configured.");
        return;
      }

      const result = await signInTraceGoogle();
      if (result === null) {
        try {
          sessionStorage.setItem("miav_trace_upgrade", "1");
        } catch {
          // ignore
        }
        setAuthNote("Redirecting to Google sign-in…");
        setGoogleDialogOpen(false);
        return;
      }

      const upgraded = await upgradeExistingTrace(result.user);
      if (upgraded && upgraded !== mine) {
        onSaved(upgraded);
        setAuthNote(
          `Permanent Trace · ${upgraded.miavId} (MIAV ID unchanged)`,
        );
      } else {
        setAuthNote("Signed in with Google — Permanent Trace.");
      }
      setGoogleDialogOpen(false);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resolveUserForSubmit(): Promise<User | null> {
    if (user) return user;
    const credential = await signInTraceAnonymous();
    setAuthNote("Anonymous session — leaving your Temporary Trace…");
    return credential.user;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!configured) {
        setError("Firebase is not configured.");
        return;
      }

      let activeUser: User;
      try {
        const resolved = await resolveUserForSubmit();
        if (!resolved) {
          setError("Unable to authenticate.");
          return;
        }
        activeUser = resolved;
      } catch (err) {
        setError(formatAuthError(err));
        return;
      }

      const token = await getIdTokenOrNull(activeUser);
      if (!token) {
        setError("Unable to authenticate.");
        return;
      }

      if (
        getTraceAuthType(activeUser) === "google" &&
        mine?.authType === "anonymous"
      ) {
        try {
          const upgraded = await upgradeExistingTrace(activeUser);
          if (upgraded) onSaved(upgraded);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to upgrade.");
          return;
        }
      }

      const response = await fetch("/api/trace", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: draft.country,
          region: draft.region,
          city: draft.city,
          message: message.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        trace?: TracePin;
      } | null;

      if (!response.ok || !data?.trace) {
        setError(data?.error || "Unable to leave a trace.");
        return;
      }

      onSaved(data.trace);
      setOpen(false);
      setAuthNote(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to leave a trace.",
      );
    } finally {
      setBusy(false);
    }
  }

  const googleDialog = (
    <GoogleSignInDialog
      open={googleDialogOpen}
      busy={busy}
      onClose={() => {
        if (!busy) setGoogleDialogOpen(false);
      }}
      onConfirm={() => void confirmGoogleSignIn()}
    />
  );

  if (!open) {
    return (
      <>
        <div className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6 sm:px-6">
          <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
            Leave Trace
          </p>
          <p className="mt-4 max-w-md text-[0.9rem] leading-[1.9] text-[var(--map-muted)]">
            Leave a single presence on the map. Temporary traces fade after
            three months. Permanent traces remain with Google sign-in.
          </p>
          <ul className="mt-6 max-w-md space-y-2 text-[0.8rem] leading-[1.75] text-[var(--map-muted)]">
            {TRACE_PRIVACY_BLURB.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap gap-4">
            <a
              href="/privacy"
              className="text-[0.75rem] tracking-[0.1em] text-[var(--map-accent)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            >
              Privacy
            </a>
            <a
              href="/site-policy"
              className="text-[0.75rem] tracking-[0.1em] text-[var(--map-accent)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            >
              Site Policy
            </a>
          </p>

          {isPermanent ? (
            <p className="mt-6 text-[0.78rem] tracking-[0.08em] text-[var(--map-accent)]">
              Permanent Trace
              {mine ? ` · ${mine.miavId}` : ""}
            </p>
          ) : isAnonymousSession ? (
            <div className="mt-6 space-y-3">
              <p className="text-[0.78rem] tracking-[0.08em] text-[var(--map-muted)]">
                Anonymous Session
                {mine ? ` · Temporary Trace ${mine.miavId}` : ""}
              </p>
              <button
                type="button"
                disabled={busy || !configured}
                onClick={() => {
                  setError(null);
                  setGoogleDialogOpen(true);
                }}
                className="cursor-pointer text-[0.8rem] tracking-[0.12em] text-[var(--map-ink)] underline decoration-[var(--map-line)] underline-offset-[0.45em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upgrade to Permanent Trace
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setMessage(mine?.message || "");
              setError(null);
              setOpen(true);
            }}
            className="mt-8 cursor-pointer text-[0.85rem] tracking-[0.14em] text-[var(--map-ink)] underline decoration-[var(--map-line)] underline-offset-[0.5em]"
          >
            {mine ? "Edit your trace" : "Leave your trace"}
          </button>
        </div>
        {googleDialog}
      </>
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="border border-[var(--map-line)] bg-[var(--map-panel)] px-5 py-6 sm:px-6"
      >
        <p className="text-[0.68rem] tracking-[0.2em] text-[var(--map-muted)] uppercase">
          Trace registration
        </p>

        <ul className="mt-5 max-w-xl space-y-2 text-[0.8rem] leading-[1.75] text-[var(--map-muted)]">
          {TRACE_PRIVACY_BLURB.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-4">
          <a
            href="/privacy"
            className="text-[0.72rem] tracking-[0.1em] text-[var(--map-accent)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
          >
            Privacy
          </a>
          <a
            href="/site-policy"
            className="text-[0.72rem] tracking-[0.1em] text-[var(--map-accent)] underline decoration-[var(--map-line)] underline-offset-[0.4em]"
          >
            Site Policy
          </a>
        </p>

        {isPermanent ? (
          <p className="mt-6 text-[0.82rem] text-[var(--map-accent)]">
            Permanent Trace
            {mine ? ` · ${mine.miavId}` : ""}
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-6">
            {!user ? (
              <button
                type="button"
                disabled={busy || !configured}
                onClick={() => void ensureAnonymous()}
                className="cursor-pointer text-[0.8rem] tracking-[0.12em] text-[var(--map-ink)] underline decoration-[var(--map-line)] underline-offset-[0.45em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue anonymously
              </button>
            ) : (
              <p className="text-[0.82rem] text-[var(--map-muted)]">
                Anonymous Session
                {mine ? ` · ${mine.miavId}` : ""}
              </p>
            )}
            <button
              type="button"
              disabled={busy || !configured}
              onClick={() => {
                setError(null);
                setGoogleDialogOpen(true);
              }}
              className="cursor-pointer text-[0.8rem] tracking-[0.12em] text-[var(--map-ink)] underline decoration-[var(--map-line)] underline-offset-[0.45em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnonymousSession
                ? "Upgrade to Permanent Trace"
                : "Continue with Google"}
            </button>
          </div>
        )}

        {!user && !isPermanent ? (
          <p className="mt-4 text-[0.78rem] leading-[1.7] text-[var(--map-muted)]">
            You can press Leave your trace without signing in first — a
            Temporary Trace will be created. Use Google for a Permanent Trace
            after confirming the privacy notice.
          </p>
        ) : null}

        {authNote ? (
          <p className="mt-3 text-[0.78rem] text-[var(--map-accent)]">{authNote}</p>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <label className="block">
            <span className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
              Country
            </span>
            <select
              value={draft.country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-3 w-full border-0 border-b border-[var(--map-line)] bg-transparent py-2 text-[0.95rem] text-[var(--map-ink)] outline-none"
            >
              {TRACE_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
              Region
            </span>
            <select
              value={draft.region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-3 w-full border-0 border-b border-[var(--map-line)] bg-transparent py-2 text-[0.95rem] text-[var(--map-ink)] outline-none"
            >
              {regions.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
              City
            </span>
            <select
              value={draft.city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-3 w-full border-0 border-b border-[var(--map-line)] bg-transparent py-2 text-[0.95rem] text-[var(--map-ink)] outline-none"
            >
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-8 block">
          <span className="text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
            Message ({MAX_TRACE_MESSAGE_LENGTH} characters)
          </span>
          <input
            value={message}
            maxLength={MAX_TRACE_MESSAGE_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="mt-3 w-full border-0 border-b border-[var(--map-line)] bg-transparent py-2 text-[1rem] text-[var(--map-ink)] outline-none"
            placeholder="A quiet presence"
          />
        </label>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="cursor-pointer text-[0.85rem] tracking-[0.14em] text-[var(--map-ink)] underline decoration-[var(--map-line)] underline-offset-[0.5em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : mine ? "Save changes" : "Leave your trace"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer text-[0.78rem] tracking-[0.12em] text-[var(--map-muted)]"
          >
            Cancel
          </button>
        </div>

        {error ? (
          <p className="mt-6 text-[0.9rem] leading-[1.7] text-[#8a4b4b]">{error}</p>
        ) : null}
      </form>
      {googleDialog}
    </>
  );
}
