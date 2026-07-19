"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import "leaflet/dist/leaflet.css";
import { MapSidebar } from "@/components/trace-map/MapSidebar";
import { LeaveTraceForm } from "@/components/trace-map/LeaveTraceForm";
import { TraceList } from "@/components/trace-map/TraceList";
import { TraceCard } from "@/components/trace-map/TraceCard";
import { WelcomeDialog } from "@/components/trace/WelcomeDialog";
import {
  completeTraceRedirectSignIn,
  getIdTokenOrNull,
  getTraceAuthType,
  signOutTrace,
  watchAuth,
} from "@/lib/trace/auth";
import type {
  TraceLocationCluster,
  TraceListScope,
  TracePin,
  TraceStats,
} from "@/lib/trace/types";
import {
  findCountry,
  resolveLocationCoords,
  TRACE_COUNTRIES,
} from "@/lib/trace/locations";
import { WELCOME_DIALOG, WELCOME_STORAGE_KEY } from "@/lib/trace/policyCopy";

const WorldMap = dynamic(
  () =>
    import("@/components/trace-map/WorldMap").then((mod) => mod.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(72vh,720px)] items-center justify-center border border-[var(--map-line)] bg-[#f7f9fb] text-[0.85rem] tracking-[0.12em] text-[var(--map-muted)]">
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

function scopeLabel(scope: TraceListScope): string {
  if (scope.city && scope.region) {
    return `${scope.city} · ${scope.region} · ${scope.country}`;
  }
  if (scope.region) {
    return `${scope.region} · ${scope.country}`;
  }
  return scope.country;
}

function emptyStats(): TraceStats {
  return {
    countryCount: 0,
    cityCount: 0,
    permanentCount: 0,
    temporaryCount: 0,
    first: null,
    latest: null,
  };
}

export function TraceMapApp() {
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<TraceLocationCluster[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [mine, setMine] = useState<TracePin | null>(null);
  const [loading, setLoading] = useState(true);
  const [listScope, setListScope] = useState<TraceListScope | null>(null);
  const [listTraces, setListTraces] = useState<TracePin[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TracePin | null>(null);
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
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_STORAGE_KEY) === "true") return;
      setWelcomeOpen(true);
    } catch {
      setWelcomeOpen(true);
    }
  }, []);

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    } catch {
      // ignore quota / private mode
    }
    setWelcomeOpen(false);
  }

  const loadOverview = useCallback(async (active: User | null) => {
    setLoading(true);
    try {
      const token = await getIdTokenOrNull(active);
      const response = await fetch("/api/trace", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await response.json().catch(() => null)) as {
        locations?: TraceLocationCluster[];
        stats?: TraceStats;
        mine?: TracePin | null;
        error?: string;
      } | null;

      if (!response.ok) {
        setLocations([]);
        setStats(emptyStats());
        setMine(null);
        return;
      }

      setLocations(data?.locations || []);
      setStats(data?.stats || emptyStats());
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

  const loadList = useCallback(async (scope: TraceListScope) => {
    setListScope(scope);
    setListLoading(true);
    setSelectedTrace(null);
    try {
      const params = new URLSearchParams({ country: scope.country });
      if (scope.region) params.set("region", scope.region);
      if (scope.city) params.set("city", scope.city);
      const response = await fetch(`/api/trace?${params.toString()}`);
      const data = (await response.json().catch(() => null)) as {
        traces?: TracePin[];
      } | null;
      setListTraces(response.ok ? data?.traces || [] : []);
    } catch {
      setListTraces([]);
    } finally {
      setListLoading(false);
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
          void loadOverview(credential.user);
        }
      } catch {
        // Non-fatal; user can retry upgrade from the form.
      }
    })();
    return watchAuth((next) => {
      setUser(next);
      void loadOverview(next);
    });
  }, [loadOverview]);

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

  function onSelectCity(input: {
    country: string;
    region: string;
    city: string;
  }) {
    const country = findCountry(input.country);
    const region = country?.regions.find((r) => r.name === input.region);
    const city = region?.cities.find((c) => c.name === input.city);
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
      <WelcomeDialog
        open={welcomeOpen}
        title={WELCOME_DIALOG.title}
        body={{
          paragraphs: [...WELCOME_DIALOG.body.paragraphs],
          bullets: [...WELCOME_DIALOG.body.bullets],
          closing: [...WELCOME_DIALOG.body.closing],
        }}
        confirmLabel="I Understand"
        onClose={dismissWelcome}
      />
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
              Not a board — quiet traces left in place. One visitor, one MIAV
              ID. The map stays first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]">
            <a
              href="/"
              className="underline decoration-[var(--map-line)] underline-offset-[0.4em]"
            >
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

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          <MapSidebar stats={stats} loading={loading} />
        </div>

        <div className="order-1 space-y-8 lg:order-2">
          <WorldMap
            locations={locations}
            focus={focus}
            selectedCountry={draft.country}
            selectedRegion={draft.region}
            listScope={listScope}
            interactionsEnabled={!welcomeOpen}
            onSelectCountry={onSelectCountry}
            onSelectRegion={onSelectRegion}
            onSelectCity={onSelectCity}
            onOpenList={(scope) => void loadList(scope)}
          />

          <p className="text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
            Click a country, region, or city mark to open its Trace List. Same
            city stacks up to ten quiet dots — the map never fills with every
            Trace. Your MIAV ID and Joined date never change.
          </p>

          {listScope ? (
            <TraceList
              traces={listTraces}
              scopeLabel={scopeLabel(listScope)}
              loading={listLoading}
              selectedId={selectedTrace?.id || null}
              onSelect={setSelectedTrace}
              onClose={() => {
                setListScope(null);
                setListTraces([]);
                setSelectedTrace(null);
              }}
            />
          ) : null}

          {selectedTrace ? (
            <TraceCard
              pin={selectedTrace}
              onClose={() => setSelectedTrace(null)}
            />
          ) : null}

          <LeaveTraceForm
            user={user}
            mine={mine}
            draft={draft}
            onDraftChange={setDraft}
            onFocusLocation={setFocus}
            onSaved={(trace) => {
              setMine(trace);
              void loadOverview(user);
              if (listScope) void loadList(listScope);
              setFocus({ lat: trace.lat, lng: trace.lng, zoom: 11 });
            }}
          />
        </div>
      </div>
    </div>
  );
}
