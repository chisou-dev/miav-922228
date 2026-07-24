"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import "leaflet/dist/leaflet.css";
import { Sidebar } from "@/features/world-memory/map/Sidebar";
import { LeaveTraceForm } from "@/features/world-memory/trace/ui/LeaveTraceForm";
import { TraceViewer } from "@/features/world-memory/viewer/TraceViewer";
import { useMapDataLoader } from "@/features/world-memory/map/MapDataLoader";
import { WelcomeDialog } from "@/features/world-memory/trace/ui/WelcomeDialog";
import type { TracePin } from "@/features/world-memory/trace/types";
import {
  completeTraceRedirectSignIn,
  getTraceAuthType,
  signOutTrace,
  watchAuth,
} from "@/features/world-memory/trace/auth";
import { WELCOME_DIALOG, WELCOME_STORAGE_KEY } from "@/features/world-memory/trace/policyCopy";

const Map = dynamic(
  () => import("@/features/world-memory/map/Map").then((mod) => mod.Map),
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
  const [highlightLocationId, setHighlightLocationId] = useState<string | null>(
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

  const leaveTraceFormProps = {
    user,
    posted: data.posted,
    mine: data.mine,
    selectedPlace,
    onSelectPlace: setSelectedPlace,
    onFocusLocation: setFocus,
    onSaved: (trace: TracePin) => {
      data.setMine(trace);
      data.setPosted(true);
      void data.loadMap();
      if (data.placeScope) void data.loadMemories(data.placeScope);
    },
  };

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

      <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 sm:px-8">
        {/*
          Page-shell layout: map column and TraceViewer are siblings.
          Desktop (lg+): Map + LeaveTraceForm | Reader Memories.
          Mobile: map only until a star is opened; then viewer stacks below;
          LeaveTraceForm stays after the mobile viewer (unchanged).
        */}
        <div className="desktop-shell grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <div className="order-2 lg:order-1 lg:self-stretch">
              <Sidebar
                stats={data.stats}
                loading={data.mapLoading}
                recent={data.recent}
                onFocusMemory={(memory) => {
                  if (
                    memory.lat != null &&
                    memory.lng != null &&
                    Number.isFinite(memory.lat) &&
                    Number.isFinite(memory.lng)
                  ) {
                    setFocus({
                      lat: memory.lat,
                      lng: memory.lng,
                      zoom: 5,
                    });
                  }
                  setHighlightLocationId(memory.locationId);
                }}
              />
            </div>
            <div className="order-1 space-y-4 lg:order-2 lg:self-start">
              {/* Desktop: Leave a Memory above the map so Write a Memory stays in view */}
              <div className="hidden lg:block">
                <LeaveTraceForm {...leaveTraceFormProps} />
              </div>
              <div className="lg:sticky lg:top-4">
                <Map
                  stars={data.stars}
                  focus={focus}
                  placeScope={data.placeScope}
                  highlightLocationId={highlightLocationId}
                  interactionsEnabled={!welcomeOpen}
                  onOpenMemories={onOpenMemories}
                />
                <p className="mt-4 text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
                  Stars mark places where readers left a Memory. Click a star to
                  read them — no GPS, no address.
                </p>
              </div>
            </div>
          </div>

          {/* Desktop: always reserve the right panel */}
          <div className="hidden lg:block">
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
            ) : (
              <TraceViewer idle />
            )}
          </div>
        </div>

        {/* Mobile: keep stacked viewer only after a star is selected */}
        {viewerOpen && data.placeScope ? (
          <div className="lg:hidden">
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
          </div>
        ) : null}

        {/* Mobile: Leave a Memory remains below the shell / viewer */}
        <div className="lg:hidden">
          <LeaveTraceForm {...leaveTraceFormProps} />
        </div>
      </div>
    </div>
  );
}
