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

type SelectedPlace = {
  locationId: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
};

export function TraceMapApp() {
  const [user, setUser] = useState<User | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null,
  );

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
    void data.loadMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void completeTraceRedirectSignIn();
    return watchAuth((next) => {
      setUser(next);
      void data.loadStatus(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void data.loadStatus(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setWelcomeOpen(false);
  }

  function onOpenMemories(scope: {
    locationId: string;
    country: string;
    name: string;
  }) {
    const star = data.stars.find((s) => s.locationId === scope.locationId);
    if (star) {
      setFocus({ lat: star.lat, lng: star.lng, zoom: 5 });
    }
    void data.loadMemories(scope);
  }

  const viewerOpen = Boolean(data.placeScope);

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
              Reader footprints left around the world — city by city.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]">
            <a href="/" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
              Home
            </a>
            <a href="/privacy" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
              Privacy
            </a>
            <a href="/site-policy" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
              Site Policy
            </a>
            {user && getTraceAuthType(user) === "google" ? (
              <>
                <span>Signed in with Google</span>
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
        <div className="order-2 lg:order-1 lg:self-stretch">
          <Sidebar stats={data.stats} loading={data.mapLoading} />
        </div>

        <div className="order-1 space-y-8 lg:order-2">
          <div
            className={`grid gap-6 ${
              viewerOpen ? "xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]" : ""
            }`}
          >
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <Map
                stars={data.stars}
                focus={focus}
                placeScope={data.placeScope}
                interactionsEnabled={!welcomeOpen}
                onOpenMemories={onOpenMemories}
              />
              <p className="text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
                Stars mark places where readers left a Memory. Click a star to
                read them — no GPS, no address.
              </p>
            </div>

            {viewerOpen && data.placeScope ? (
              <TraceViewer
                city={data.placeScope.name}
                country={data.placeScope.country}
                traces={data.traces}
                loading={data.tracesLoading}
                loadingMore={data.tracesLoadingMore}
                hasMore={data.hasMore}
                onLoadMore={() => void data.loadMoreMemories()}
                onClose={data.closeViewer}
              />
            ) : null}
          </div>

          <LeaveTraceForm
            user={user}
            posted={data.posted}
            mine={data.mine}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            onFocusLocation={setFocus}
            onSaved={(trace) => {
              data.setMine(trace);
              data.setPosted(true);
              void data.loadMap();
              if (data.placeScope) void data.loadMemories(data.placeScope);
            }}
          />
        </div>
      </div>
    </div>
  );
}
