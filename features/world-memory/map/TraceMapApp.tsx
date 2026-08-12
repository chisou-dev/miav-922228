"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import "leaflet/dist/leaflet.css";
import { Sidebar } from "@/features/world-memory/map/Sidebar";
import { CategoryFilter } from "@/features/world-memory/map/CategoryFilter";
import { WorkFilter } from "@/features/world-memory/map/WorkFilter";
import {
  effectiveWorkIds,
  resolveInitialMapFilter,
} from "@/features/world-memory/map/mapFilter";
import { workMarkerStyle } from "@/features/world-memory/map/workColors";
import { workLabelForId } from "@/features/world-memory/my-miav/myMiavPublic";
import { LeaveTraceForm } from "@/features/world-memory/trace/ui/LeaveTraceForm";
import { TraceViewer } from "@/features/world-memory/viewer/TraceViewer";
import {
  useMapDataLoader,
  type GeoScope,
} from "@/features/world-memory/map/MapDataLoader";
import { WelcomeDialog } from "@/features/world-memory/trace/ui/WelcomeDialog";
import type { GeographyAggregate } from "@/features/world-memory/trace/aggregate";
import type { TracePin } from "@/features/world-memory/trace/types";
import {
  TRACE_CATEGORIES,
  type TraceCategory,
} from "@/features/world-memory/trace/works";
import {
  completeTraceRedirectSignIn,
  getTraceAuthType,
  signOutTrace,
  watchAuth,
} from "@/features/world-memory/trace/auth";
import { WELCOME_STORAGE_KEY, getWelcomeDialogBody } from "@/features/world-memory/trace/policyCopy";
import { t as translate, useT } from "@/features/shared/i18n";

const Map = dynamic(
  () => import("@/features/world-memory/map/Map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(68vh,720px)] items-center justify-center border border-[var(--map-line)] bg-[var(--map-canvas)] text-[0.85rem] tracking-[0.12em] text-[var(--map-muted)] sm:h-[min(76vh,820px)] lg:h-[min(78vh,880px)]">
        {translate("world.loadingMap")}
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

export function TraceMapApp({
  initialWorkQuery = null,
}: {
  initialWorkQuery?: string | null;
}) {
  const t = useT();
  const initialFilter = resolveInitialMapFilter(initialWorkQuery);
  const [user, setUser] = useState<User | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [leavePanelOpen, setLeavePanelOpen] = useState(false);
  const leavePanelRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null,
  );

  /** Map filter — independent from Leave a Memory form category. */
  const [mapCategories, setMapCategories] = useState<TraceCategory[]>([
    ...TRACE_CATEGORIES,
  ]);
  const [mapWorkIds, setMapWorkIds] = useState<string[]>(initialFilter.workIds);
  const formInitialWorkId = initialFilter.formWorkId;
  const [geoScope, setGeoScope] = useState<GeoScope>({ level: "world" });
  const [selectedGeographyId, setSelectedGeographyId] = useState<string | null>(
    null,
  );
  const [emphasizeWorkId, setEmphasizeWorkId] = useState<string | null>(null);

  const activeWorkIds = effectiveWorkIds(mapCategories, mapWorkIds);

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
    void data.loadGeo(geoScope, mapCategories, activeWorkIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoScope, mapCategories, mapWorkIds]);

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

  useEffect(() => {
    if (!leavePanelOpen) return;
    const id = window.setTimeout(() => {
      leavePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(id);
  }, [leavePanelOpen]);

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setWelcomeOpen(false);
  }

  function backToWorld() {
    setGeoScope({ level: "world" });
    setSelectedGeographyId(null);
    setEmphasizeWorkId(null);
    setFocus({ lat: 20, lng: 0, zoom: 2 });
    data.closeViewer();
  }

  function backToCountry() {
    if (geoScope.level !== "region") return;
    const { countryCode, countryLabel } = geoScope;
    setGeoScope({
      level: "country",
      countryCode,
      countryLabel,
    });
    setSelectedGeographyId(null);
    setEmphasizeWorkId(null);
    setFocus(null);
    data.closeViewer();
  }

  function onSelectGeography(
    geo: GeographyAggregate,
    workId?: string,
  ) {
    setSelectedGeographyId(geo.geographyId);
    setEmphasizeWorkId(workId || null);

    if (geoScope.level === "world") {
      setGeoScope({
        level: "country",
        countryCode: geo.geographyId,
        countryLabel: geo.label,
      });
      setFocus({
        lat: geo.lat,
        lng: geo.lng,
        zoom: 5,
      });
      data.closeViewer();
      return;
    }

    if (geoScope.level === "country") {
      setGeoScope({
        level: "region",
        countryCode: geo.countryCode || geoScope.countryCode,
        countryLabel: geo.countryLabel || geoScope.countryLabel,
        regionLabel: geo.label,
      });
      setFocus({
        lat: geo.lat,
        lng: geo.lng,
        zoom: 8,
      });
      data.closeViewer();
      return;
    }

    // City is leaf — select / emphasize only; use View Memories to open archive.
    setFocus({ lat: geo.lat, lng: geo.lng, zoom: 10 });
  }

  function onViewMemories(geo: GeographyAggregate) {
    setSelectedGeographyId(geo.geographyId);
    const zoom =
      geoScope.level === "world" ? 5 : geoScope.level === "country" ? 8 : 10;
    setFocus({
      lat: geo.lat,
      lng: geo.lng,
      zoom,
    });

    if (geoScope.level === "world") {
      void data.loadMemories(
        {
          countryCode: geo.geographyId,
          country: geo.label,
          name: geo.label,
          region: null,
          city: null,
        },
        mapCategories,
        activeWorkIds,
      );
      return;
    }

    if (geoScope.level === "country") {
      const countryCode = geo.countryCode || geoScope.countryCode;
      const countryLabel = geo.countryLabel || geoScope.countryLabel;
      void data.loadMemories(
        {
          countryCode,
          country: countryLabel,
          region: geo.label,
          city: null,
          name: geo.label,
        },
        mapCategories,
        activeWorkIds,
      );
      return;
    }

    // Region view → city memories (leaf)
    void data.loadMemories(
      {
        countryCode: geo.countryCode || geoScope.countryCode,
        country: geo.countryLabel || geoScope.countryLabel,
        region: geo.regionLabel || geoScope.regionLabel,
        city: geo.label,
        name: geo.label,
      },
      mapCategories,
      activeWorkIds,
    );
  }

  const viewerOpen = Boolean(data.placeScope);
  const welcomeBody = getWelcomeDialogBody(t);
  const filterEmpty =
    mapCategories.length === 0 || activeWorkIds.length === 0;

  const leaveTraceFormProps = {
    user,
    miavId: data.miavId,
    postedWorkIds: data.postedWorkIds,
    mine: data.mine,
    selectedPlace,
    onSelectPlace: setSelectedPlace,
    onFocusLocation: setFocus,
    onSaved: (trace: TracePin) => {
      data.setMine(trace);
      data.setPosted(true);
      if (trace.miavId) data.setMiavId(trace.miavId);
      if (trace.workId) {
        data.setPostedWorkIds(
          Array.from(new Set([...data.postedWorkIds, trace.workId])),
        );
      }
      void data.loadStatus(user);
      void data.loadMap();
      void data.loadGeo(geoScope, mapCategories, activeWorkIds);
      if (data.placeScope) {
        void data.loadMemories(data.placeScope, mapCategories, activeWorkIds);
      }
    },
    onClose: () => setLeavePanelOpen(false),
    initialWorkId: formInitialWorkId,
  };

  const viewerTitle = data.placeScope?.name ?? "";
  const viewerCountry = data.placeScope?.country ?? "";

  return (
    <div className="trace-map-shell">
      <WelcomeDialog
        open={welcomeOpen}
        title={t("world.welcomeTitle")}
        body={welcomeBody}
        confirmLabel={t("world.welcomeUnderstand")}
        onClose={dismissWelcome}
      />

      <header className="border-b border-[var(--map-line)] px-5 py-5 pl-14 sm:px-8 sm:py-6 lg:pl-8">
        <div className="mx-auto w-full max-w-[88rem]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-medium tracking-[0.06em] text-[var(--map-ink)]">
              {t("world.title")}
            </h1>
            <nav
              aria-label={t("world.navAria")}
              className="flex flex-wrap items-center gap-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-muted)]"
            >
              <a href="/privacy" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
                {t("world.privacy")}
              </a>
              <a href="/site-policy" className="underline decoration-[var(--map-line)] underline-offset-[0.4em]">
                {t("world.sitePolicy")}
              </a>
              {user && getTraceAuthType(user) === "google" ? (
                <>
                  <span className="inline-flex max-w-[14rem] flex-col items-end gap-0.5 text-right text-[var(--map-ink)] sm:max-w-[18rem]">
                    {data.miavId ? (
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden="true" className="text-[#4a7c59]">
                            ✓
                          </span>
                          {t("world.yourMemory")}
                        </span>
                        <span className="truncate font-mono text-[0.7rem] tracking-[0.04em] text-[var(--map-ink)]">
                          {data.miavId}
                        </span>
                        <a
                          href="/my-miav"
                          className="text-[0.7rem] tracking-[0.08em] text-[var(--map-muted)] underline decoration-[var(--map-line)] underline-offset-[0.35em]"
                        >
                          {t("nav.myMiav")}
                        </a>
                      </>
                    ) : (
                      <>
                        <span>{t("world.readyToLeave")}</span>
                        <span className="text-[0.7rem] tracking-[0.04em] text-[var(--map-muted)]">
                          ✓ {t("world.verifiedGoogle")}
                        </span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOutTrace()}
                    className="cursor-pointer underline decoration-[var(--map-line)] underline-offset-[0.4em]"
                  >
                    {t("world.signOut")}
                  </button>
                </>
              ) : null}
            </nav>
          </div>

          <div className="mt-2 max-w-xl sm:mt-2.5">
            <p className="text-[0.95rem] leading-[1.65] tracking-[0.02em] text-[var(--map-muted)]">
              {t("world.subtitle")}
            </p>
            <button
              type="button"
              onClick={() => setLeavePanelOpen(true)}
              className="mt-3 min-h-[44px] cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-6 text-[0.78rem] tracking-[0.16em] text-[#243447]"
            >
              {t("world.leaveMemory")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[88rem] space-y-8 px-5 py-8 sm:px-8">
        <div className="desktop-shell grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
          <div className="grid gap-6 lg:grid-cols-[minmax(200px,220px)_minmax(0,1fr)] lg:items-start">
            <div className="order-2 lg:order-1 lg:self-stretch">
              <Sidebar
                stats={data.stats}
                loading={data.mapLoading || data.geoLoading}
                recent={data.recent}
                geoScope={geoScope}
                geoTotals={data.geoTotals}
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
                }}
              />
            </div>
            <div className="order-1 space-y-3 lg:order-2 lg:sticky lg:top-4 lg:self-start">
              <div className="trace-map-panel space-y-2 rounded-sm border border-[var(--map-line)] bg-[var(--map-panel)] px-3 py-3">
                <CategoryFilter
                  selected={mapCategories}
                  onChange={setMapCategories}
                />
                <WorkFilter
                  selectedCategories={mapCategories}
                  selectedWorkIds={mapWorkIds}
                  onChange={setMapWorkIds}
                />
                <ul
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--map-line)] pt-2 text-[0.62rem] tracking-[0.08em] text-[var(--map-muted)]"
                  aria-label={t("world.workLegendAria")}
                >
                  {activeWorkIds.map((workId) => {
                    const color = workMarkerStyle(workId);
                    return (
                      <li
                        key={workId}
                        className="inline-flex max-w-full items-center gap-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-block h-2 w-2 shrink-0"
                          style={{
                            clipPath:
                              "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                            backgroundColor: color.fill,
                          }}
                        />
                        <span className="truncate text-[var(--map-ink)]">
                          {workLabelForId(workId)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {geoScope.level === "country" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={backToWorld}
                    aria-label={t("world.backToWorld")}
                    className="min-h-[40px] cursor-pointer border border-[var(--map-line)] bg-[var(--map-panel)] px-3 text-[0.72rem] tracking-[0.12em] text-[var(--map-ink)]"
                  >
                    {t("world.backToWorld")}
                  </button>
                  <p className="text-[0.78rem] tracking-[0.08em] text-[var(--map-ink)]">
                    {geoScope.countryLabel}
                  </p>
                </div>
              ) : null}

              {geoScope.level === "region" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={backToCountry}
                    aria-label={t("world.backToCountry", {
                      country: geoScope.countryLabel,
                    })}
                    className="min-h-[40px] cursor-pointer border border-[var(--map-line)] bg-[var(--map-panel)] px-3 text-[0.72rem] tracking-[0.12em] text-[var(--map-ink)]"
                  >
                    {t("world.backToCountry", {
                      country: geoScope.countryLabel,
                    })}
                  </button>
                  <p className="text-[0.78rem] tracking-[0.08em] text-[var(--map-ink)]">
                    {geoScope.countryLabel} / {geoScope.regionLabel}
                  </p>
                </div>
              ) : null}

              {filterEmpty ? (
                <p className="trace-map-panel border border-[var(--map-line)] bg-[var(--map-panel)] px-4 py-3 text-[0.82rem] leading-[1.7] text-[var(--map-muted)]">
                  {mapCategories.length === 0
                    ? t("world.filterEmpty")
                    : t("world.filterWorksEmpty")}
                </p>
              ) : (
                <Map
                  level={geoScope.level}
                  geographies={data.geographies}
                  focus={focus}
                  selectedGeographyId={selectedGeographyId}
                  emphasizeWorkId={emphasizeWorkId}
                  interactionsEnabled={!welcomeOpen}
                  onSelectGeography={onSelectGeography}
                  onViewMemories={onViewMemories}
                />
              )}
              <p className="text-[0.78rem] leading-[1.8] text-[var(--map-muted)]">
                {t("world.mapHelpGeo")}
              </p>
              <p className="text-[0.72rem] leading-[1.7] text-[var(--map-muted)]">
                {t("world.earlierOnMapNote")}
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            {viewerOpen && data.placeScope ? (
              <TraceViewer
                city={viewerTitle}
                country={viewerCountry}
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

        {viewerOpen && data.placeScope ? (
          <div className="lg:hidden">
            <TraceViewer
              city={viewerTitle}
              country={viewerCountry}
              traces={data.traces}
              loading={data.tracesLoading}
              loadingMore={data.tracesLoadingMore}
              hasMore={data.hasMore}
              onLoadMore={() => void data.loadMoreMemories()}
              onClose={data.closeViewer}
            />
          </div>
        ) : null}

        {leavePanelOpen ? (
          <div ref={leavePanelRef} className="scroll-mt-4">
            <LeaveTraceForm {...leaveTraceFormProps} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
