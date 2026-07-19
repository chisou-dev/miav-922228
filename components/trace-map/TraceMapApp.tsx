"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import "leaflet/dist/leaflet.css";
import { MapSidebar } from "@/components/trace-map/MapSidebar";
import { LeaveTraceForm } from "@/components/trace-map/LeaveTraceForm";
import {
  completeTraceRedirectSignIn,
  getIdTokenOrNull,
  getTraceAuthType,
  signOutTrace,
  watchAuth,
} from "@/lib/trace/auth";
import {
  computeTraceStats,
  type TracePin,
  type TraceStats,
} from "@/lib/trace/types";
import {
  findCountry,
  resolveLocationCoords,
  TRACE_COUNTRIES,
} from "@/lib/trace/locations";

const WorldMap = dynamic(
  () =>
    import("@/components/trace-map/WorldMap").then((mod) => mod.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,640px)] items-center justify-center border border-[var(--map-line)] bg-[#f7f9fb] text-[0.85rem] tracking-[0.12em] text-[var(--map-muted)]">
        Unfolding the map…
      </div>
    ),
  },
);

type LocationDraft = {
  country: string;
  region: string;
  city: string;
};

export function TraceMapApp() {
  const [user, setUser] = useState<User | null>(null);
  const [pins, setPins] = useState<TracePin[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [mine, setMine] = useState<TracePin | null>(null);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [draft, setDraft] = useState<LocationDraft>({
    country: TRACE_COUNTRIES[0]!.name,
    region: TRACE_COUNTRIES[0]!.regions[0]!.name,
    city: TRACE_COUNTRIES[0]!.regions[0]!.cities[0]!.name,
  });

  const loadTraces = useCallback(async (active: User | null) => {
    setLoading(true);
    try {
      const token = await getIdTokenOrNull(active);
      const response = await fetch("/api/trace", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await response.json().catch(() => null)) as {
        pins?: TracePin[];
        stats?: TraceStats;
        mine?: TracePin | null;
        error?: string;
      } | null;

      if (!response.ok) {
        setPins([]);
        setStats(computeTraceStats([]));
        setMine(null);
        return;
      }

      const nextPins = data?.pins || [];
      setPins(nextPins);
      setStats(data?.stats || computeTraceStats(nextPins));
      setMine(data?.mine || null);

      if (data?.mine) {
        setDraft({
          country: data.mine.country,
          region: data.mine.region,
          city: data.mine.city,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const credential = await completeTraceRedirectSignIn();
      if (!credential) return;
      try {
        const shouldUpgrade = sessionStorage.getItem("miav_trace_upgrade") === "1";
        sessionStorage.removeItem("miav_trace_upgrade");
        if (!shouldUpgrade) return;
        const token = await credential.user.getIdToken();
        const response = await fetch("/api/trace", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "upgrade" }),
        });
        if (response.ok) {
          void loadTraces(credential.user);
        }
      } catch {
        // Non-fatal; user can retry upgrade from the form.
      }
    })();
    return watchAuth((next) => {
      setUser(next);
      void loadTraces(next);
    });
  }, [loadTraces]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/geo/ip");
        const data = (await response.json().catch(() => null)) as {
          country?: string;
          region?: string;
          city?: string;
        } | null;
        if (!data?.country) return;
        const country = findCountry(data.country);
        if (!country) return;
        const region =
          country.regions.find((r) => r.name === data.region) ||
          country.regions[0]!;
        const city =
          region.cities.find((c) => c.name === data.city) || region.cities[0]!;
        const next = {
          country: country.name,
          region: region.name,
          city: city.name,
        };
        setDraft((current) => (mine ? current : next));
        const coords = resolveLocationCoords(next);
        if (coords) setFocus(coords);
      } catch {
        // Keep curated default.
      }
    })();
  }, [mine]);

  function onSelectCountry(countryName: string) {
    const country = findCountry(countryName);
    if (!country) return;
    const region = country.regions[0]!;
    const city = region.cities[0]!;
    setDraft({
      country: country.name,
      region: region.name,
      city: city.name,
    });
    setFocus({
      lat: country.lat,
      lng: country.lng,
      zoom: country.zoom,
    });
  }

  function onSelectRegion(regionName: string) {
    const country = findCountry(draft.country);
    if (!country) return;
    const region =
      country.regions.find((r) => r.name === regionName) || country.regions[0]!;
    const city = region.cities[0]!;
    setDraft({
      country: country.name,
      region: region.name,
      city: city.name,
    });
    setFocus({
      lat: region.lat,
      lng: region.lng,
      zoom: Math.min(country.zoom + 3, 10),
    });
  }

  function onSelectCity(cityName: string) {
    const country = findCountry(draft.country);
    const region = country?.regions.find((r) => r.name === draft.region);
    const city = region?.cities.find((c) => c.name === cityName);
    if (!country || !region || !city) return;
    setDraft({
      country: country.name,
      region: region.name,
      city: city.name,
    });
    setFocus({ lat: city.lat, lng: city.lng, zoom: 11 });
  }

  return (
    <div className="trace-map-shell">
      <header className="border-b border-[var(--map-line)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.7rem] tracking-[0.22em] text-[var(--map-muted)] uppercase">
              MIAV World Map
            </p>
            <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-medium tracking-[0.06em] text-[var(--map-ink)]">
              Trace Map
            </h1>
            <p className="mt-4 max-w-xl text-[0.92rem] leading-[1.9] text-[var(--map-muted)]">
              Not analytics — a quiet register of presence in the world of
              MIAV-922228. One visitor, one pin.
            </p>
          </div>
            <div className="flex flex-wrap items-center gap-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]">
            <a href="/" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
              Home
            </a>
            <a
              href="/privacy"
              className="underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            >
              Privacy
            </a>
            <a
              href="/site-policy"
              className="underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            >
              Site Policy
            </a>
            {user ? (
              <>
                <span>
                  {getTraceAuthType(user) === "google"
                    ? "Permanent Trace"
                    : "Anonymous Session"}
                </span>
                <button
                  type="button"
                  onClick={() => void signOutTrace()}
                  className="cursor-pointer underline decoration-[var(--map-line)] underline-offset-[0.4em]"
                >
                  Sign out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <MapSidebar stats={stats} loading={loading} />

        <div className="space-y-8">
          <WorldMap
            pins={pins}
            focus={focus}
            selectedCountry={draft.country}
            selectedRegion={draft.region}
            onSelectCountry={onSelectCountry}
            onSelectRegion={onSelectRegion}
            onSelectCity={onSelectCity}
          />

          <p className="text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
            Click a pale country mark to descend toward region and city. Your
            own Trace may be edited later; its MIAV ID and Joined date never
            change. Expired temporary numbers remain unused — absences kept.
          </p>

          <LeaveTraceForm
            user={user}
            mine={mine}
            draft={draft}
            onDraftChange={setDraft}
            onFocusLocation={setFocus}
            onSaved={(trace) => {
              setMine(trace);
              void loadTraces(user);
              setFocus({ lat: trace.lat, lng: trace.lng, zoom: 11 });
            }}
          />
        </div>
      </div>
    </div>
  );
}
