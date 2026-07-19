"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import "leaflet/dist/leaflet.css";
import { Sidebar } from "@/components/trace-map/Sidebar";
import { LeaveTraceForm } from "@/components/trace-map/LeaveTraceForm";
import { TraceViewer } from "@/components/trace-map/TraceViewer";
import { useMapDataLoader } from "@/components/trace-map/MapDataLoader";
import { WelcomeDialog } from "@/components/trace/WelcomeDialog";
import {
  completeTraceRedirectSignIn,
  getTraceAuthType,
  signOutTrace,
  watchAuth,
} from "@/lib/trace/auth";
import {
  fetchCountryLocations,
  CONTINENTS,
  type LocationCountryIndexEntry,
} from "@/lib/locations/client";
import { WELCOME_DIALOG, WELCOME_STORAGE_KEY } from "@/lib/trace/policyCopy";

const Map = dynamic(
  () => import("@/components/trace-map/Map").then((mod) => mod.Map),
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
  locationId?: string;
};

export function TraceMapApp() {
  const [user, setUser] = useState<User | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [draft, setDraft] = useState<LocationDraft>({
    country: "",
    region: "",
    city: "",
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapContinent, setMapContinent] = useState<string | null>(null);

  const data = useMapDataLoader();

  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_STORAGE_KEY) === "true") return;
      setWelcomeOpen(true);
    } catch {
      setWelcomeOpen(true);
    }
  }, []);

  useEffect(() => {
    void data.loadLocationIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data.locationIndex.length || draft.country) return;
    const first = data.locationIndex[0]!;
    void (async () => {
      const catalog = await fetchCountryLocations(first.path || first.code);
      if (!catalog?.regions[0]?.cities[0]) return;
      const region = catalog.regions[0]!;
      const city = region.cities[0]!;
      setDraft({
        country: catalog.name,
        region: region.name,
        city: city.name,
        locationId: city.locationId,
      });
    })();
  }, [data.locationIndex, draft.country]);

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setWelcomeOpen(false);
  }

  useEffect(() => {
    void (async () => {
      const credential = await completeTraceRedirectSignIn();
      if (!credential) return;
      try {
        const shouldUpgrade =
          sessionStorage.getItem("miav_trace_upgrade") === "1";
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
        if (response.ok) void data.loadOverview(credential.user);
      } catch {
        // Non-fatal
      }
    })();
    return watchAuth((next) => {
      setUser(next);
      void data.loadOverview(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadOverview is stable enough; avoid re-subscribe
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/geo/ip");
        const geo = (await response.json().catch(() => null)) as {
          country?: string;
          region?: string;
          city?: string;
        } | null;
        if (!geo?.country || data.mine) return;
        const entry = data.locationIndex.find(
          (c) => c.name.toLowerCase() === geo.country!.trim().toLowerCase(),
        );
        if (!entry) return;
        const catalog = await fetchCountryLocations(entry.path || entry.code);
        if (!catalog) return;
        const region =
          catalog.regions.find((r) => r.name === geo.region) ||
          catalog.regions[0]!;
        const city =
          region.cities.find((c) => c.name === geo.city) || region.cities[0]!;
        setDraft({
          country: catalog.name,
          region: region.name,
          city: city.name,
          locationId: city.locationId,
        });
        setFocus({
          lat: city.lat,
          lng: city.lng,
          zoom: 11,
        });
      } catch {
        // Keep curated default.
      }
    })();
  }, [data.locationIndex, data.mine]);

  useEffect(() => {
    if (data.mine) {
      setDraft({
        country: data.mine.country,
        region: data.mine.region,
        city: data.mine.city,
        locationId: data.mine.locationId || undefined,
      });
    }
  }, [data.mine]);

  function findIndexEntry(name: string): LocationCountryIndexEntry | undefined {
    return data.locationIndex.find((c) => c.name === name);
  }

  async function onSelectCountry(countryName: string) {
    const entry = findIndexEntry(countryName);
    if (!entry) return;
    setSelectedCountry(entry.name);
    setSelectedRegion(null);
    setFocus({
      lat: entry.lat,
      lng: entry.lng,
      zoom: entry.zoom,
    });
    await data.loadCountry(entry);
    const catalog = data.countryCatalog;
    // loadCountry sets catalog asynchronously; fetch local copy for draft
    const fresh = await fetchCountryLocations(entry.path || entry.code);
    if (fresh?.regions[0]?.cities[0]) {
      const region = fresh.regions[0]!;
      const city = region.cities[0]!;
      setDraft({
        country: fresh.name,
        region: region.name,
        city: city.name,
        locationId: city.locationId,
      });
    } else if (catalog?.regions[0]?.cities[0]) {
      const region = catalog.regions[0]!;
      const city = region.cities[0]!;
      setDraft({
        country: catalog.name,
        region: region.name,
        city: city.name,
        locationId: city.locationId,
      });
    }
  }

  async function onSelectRegion(regionName: string) {
    if (!selectedCountry) return;
    const catalog =
      data.countryCatalog?.name === selectedCountry
        ? data.countryCatalog
        : null;
    const entry = findIndexEntry(selectedCountry);
    const resolved =
      catalog ||
      (entry ? await fetchCountryLocations(entry.path || entry.code) : null);
    const region = resolved?.regions.find((r) => r.name === regionName);
    if (!resolved || !region?.cities[0]) return;
    setSelectedRegion(region.name);
    const city = region.cities[0]!;
    setDraft({
      country: resolved.name,
      region: region.name,
      city: city.name,
      locationId: city.locationId,
    });
    setFocus({
      lat: region.lat,
      lng: region.lng,
      zoom: Math.min((entry?.zoom || 5) + 3, 10),
    });
    await data.loadCities(resolved.name, region.name);
  }

  async function onSelectCity(cityName: string) {
    if (!selectedCountry || !selectedRegion) return;
    const entry = findIndexEntry(selectedCountry);
    const catalog =
      data.countryCatalog?.name === selectedCountry
        ? data.countryCatalog
        : entry
          ? await fetchCountryLocations(entry.path || entry.code)
          : null;
    const region = catalog?.regions.find((r) => r.name === selectedRegion);
    const city = region?.cities.find((c) => c.name === cityName);
    if (!catalog || !region || !city) return;
    setDraft({
      country: catalog.name,
      region: region.name,
      city: city.name,
      locationId: city.locationId,
    });
    setFocus({ lat: city.lat, lng: city.lng, zoom: 11 });
    await data.loadCityTraces({
      locationId: city.locationId,
      country: catalog.name,
      region: region.name,
      city: city.name,
    });
  }

  const viewerOpen = Boolean(data.cityScope);

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
          <div className="max-w-xl">
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-medium tracking-[0.06em] text-[var(--map-ink)]">
              World Memory
            </h1>
            <p className="mt-4 text-[0.95rem] leading-[1.9] tracking-[0.02em] text-[var(--map-muted)]">
              Reader traces preserved around the world.
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
          <Sidebar
            stats={data.stats}
            mine={data.mine}
            loading={data.overviewLoading}
          />
        </div>

        <div className="order-1 space-y-8 lg:order-2">
          <div
            className={`grid gap-6 ${
              viewerOpen ? "xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]" : ""
            }`}
          >
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <Map
                countries={
                  mapContinent
                    ? data.locationIndex.filter(
                        (c) => (c.continent || "Asia") === mapContinent,
                      )
                    : data.locationIndex
                }
                focus={focus}
                selectedCountry={selectedCountry}
                selectedRegion={selectedRegion}
                cityScope={data.cityScope}
                regions={data.regions}
                cities={data.cities}
                interactionsEnabled={!welcomeOpen}
                onSelectCountry={(name) => void onSelectCountry(name)}
                onSelectRegion={(name) => void onSelectRegion(name)}
                onSelectCity={(name) => void onSelectCity(name)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMapContinent(null)}
                  className={[
                    "min-h-[40px] cursor-pointer border px-3 text-[0.72rem] tracking-[0.1em]",
                    !mapContinent
                      ? "border-[#9bb0c2] bg-[#e8eef4] text-[var(--map-ink)]"
                      : "border-[var(--map-line)] text-[var(--map-muted)]",
                  ].join(" ")}
                >
                  All
                </button>
                {CONTINENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMapContinent(item.name)}
                    className={[
                      "min-h-[40px] cursor-pointer border px-3 text-[0.72rem] tracking-[0.08em]",
                      mapContinent === item.name
                        ? "border-[#9bb0c2] bg-[#e8eef4] text-[var(--map-ink)]"
                        : "border-[var(--map-line)] text-[var(--map-muted)]",
                    ].join(" ")}
                  >
                    <span className="mr-1" aria-hidden>
                      {item.emoji}
                    </span>
                    {item.name}
                  </button>
                ))}
              </div>
              <p className="text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
                Traces of readers who visited MIAV-922228. Filter by continent,
                then choose a country or territory marker — islands included.
              </p>
            </div>

            {viewerOpen && data.cityScope ? (
              <TraceViewer
                title={`${data.cityScope.city} · ${data.cityScope.region}`}
                traces={data.traces}
                loading={data.tracesLoading}
                loadingMore={data.tracesLoadingMore}
                hasMore={data.hasMore}
                selected={data.selectedTrace}
                onSelect={data.setSelectedTrace}
                onLoadMore={() => void data.loadMoreTraces()}
                onClose={data.closeViewer}
              />
            ) : null}
          </div>

          <LeaveTraceForm
            user={user}
            mine={data.mine}
            draft={draft}
            locationIndex={data.locationIndex}
            onDraftChange={setDraft}
            onFocusLocation={setFocus}
            onSaved={(trace) => {
              data.setMine(trace);
              void data.loadOverview(user);
              if (data.cityScope) void data.loadCityTraces(data.cityScope);
              if (selectedCountry) void data.refreshCounts(selectedCountry);
              if (selectedCountry && selectedRegion) {
                void data.loadCities(selectedCountry, selectedRegion);
              }
              setFocus({ lat: trace.lat, lng: trace.lng, zoom: 11 });
            }}
          />
        </div>
      </div>
    </div>
  );
}
