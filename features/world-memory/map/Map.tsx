"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useT } from "@/features/shared/i18n";
import {
  workIdsFromGeography,
  workMarkerOffsets,
  workMarkerStyle,
} from "@/features/world-memory/map/workColors";
import { workLabelForId } from "@/features/world-memory/my-miav/myMiavPublic";
import type { GeographyAggregate } from "@/features/world-memory/trace/aggregate";

type Focus = { lat: number; lng: number; zoom: number } | null;

type Props = {
  level: "world" | "country" | "region";
  geographies: GeographyAggregate[];
  focus: Focus;
  selectedGeographyId?: string | null;
  emphasizeWorkId?: string | null;
  interactionsEnabled?: boolean;
  onSelectGeography: (
    geo: GeographyAggregate,
    workId?: string,
  ) => void;
  onViewMemories: (geo: GeographyAggregate) => void;
};

function FocusController({ focus }: { focus: Focus }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.85 });
  }, [focus, map]);
  return null;
}

function MapInteractionGate({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.getContainer().classList.remove("leaflet-interaction-off");
      return;
    }
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.getContainer().classList.add("leaflet-interaction-off");
  }, [enabled, map]);
  return null;
}

function personLabel(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function geographyIcon(
  geo: GeographyAggregate,
  active: boolean,
  emphasizeWorkId: string | null | undefined,
) {
  const workIds = workIdsFromGeography(geo.categories);
  const offsets = workMarkerOffsets(workIds);
  const starsHtml = workIds
    .map((workId) => {
      const offset = offsets.get(workId) ?? { x: 0, y: 0 };
      const color = workMarkerStyle(workId);
      const emph = emphasizeWorkId === workId;
      const size = emph || workIds.length === 1 ? 14 : 11;
      return `<span class="miav-geo-work-star${emph ? " miav-geo-work-star--emph" : ""}" data-work="${workId}" style="--ox:${offset.x}px;--oy:${offset.y}px;width:${size}px;height:${size}px;background-color:${color.fill};border-color:${color.border}"></span>`;
    })
    .join("");

  return L.divIcon({
    className: `miav-geo-marker-wrap${active ? " miav-geo-marker-wrap--active" : ""}`,
    html: `<span class="miav-geo-marker" aria-hidden="true">${starsHtml}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function GeographyPopup({
  geo,
  level,
  onOpen,
  onView,
}: {
  geo: GeographyAggregate;
  level: "world" | "country" | "region";
  onOpen: () => void;
  onView: () => void;
}) {
  const t = useT();
  const labelKey = {
    read: "world.category.read",
    play: "world.category.play",
    apps: "world.category.apps",
  } as const;

  return (
    <div className="min-w-[11rem] max-w-[min(18rem,calc(100vw-3rem))] px-1 py-0.5 text-[var(--map-ink)]">
      <p className="text-[0.82rem] font-medium tracking-[0.06em]">{geo.label}</p>
      <p className="mt-1 text-[0.72rem] tracking-[0.04em] text-[var(--map-muted)]">
        {personLabel(
          geo.peopleCount,
          t("world.personCount", { count: geo.peopleCount }),
          t("world.peopleCount", { count: geo.peopleCount }),
        )}
        {" · "}
        {personLabel(
          geo.activityCount,
          t("world.activityCountOne", { count: geo.activityCount }),
          t("world.activityCountMany", { count: geo.activityCount }),
        )}
      </p>
      <ul className="mt-2 space-y-2">
        {geo.categories.map((row) => {
          const color = workMarkerStyle(row.works[0]?.workId ?? "");
          return (
            <li key={row.category}>
              <p className="flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.1em]">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0"
                  style={{
                    clipPath:
                      "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                    backgroundColor: color.fill,
                  }}
                />
                {t(labelKey[row.category])}
              </p>
              <ul className="mt-1 space-y-1 pl-4">
                {row.works.map((work) => {
                  const workColor = workMarkerStyle(work.workId);
                  const workLabel = workLabelForId(work.workId);
                  return (
                    <li
                      key={work.workId}
                      className="text-[0.68rem] tracking-[0.04em] text-[var(--map-muted)]"
                    >
                      <span className="inline-flex items-start gap-1.5">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0"
                          style={{
                            clipPath:
                              "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                            backgroundColor: workColor.fill,
                          }}
                        />
                        <span>
                          <span className="font-medium text-[var(--map-ink)]">
                            {workLabel}
                          </span>
                          <span className="block">
                            {personLabel(
                              work.peopleCount,
                              t("world.personCount", {
                                count: work.peopleCount,
                              }),
                              t("world.peopleCount", {
                                count: work.peopleCount,
                              }),
                            )}
                            {" · "}
                            {personLabel(
                              work.activityCount,
                              t("world.activityCountOne", {
                                count: work.activityCount,
                              }),
                              t("world.activityCountMany", {
                                count: work.activityCount,
                              }),
                            )}
                          </span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {level === "world" ? (
          <button
            type="button"
            className="cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-2 py-1 text-[0.68rem] tracking-[0.1em] text-[var(--map-ink)]"
            onClick={onOpen}
          >
            {t("world.openCountry")}
          </button>
        ) : null}
        {level === "country" ? (
          <button
            type="button"
            className="cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-2 py-1 text-[0.68rem] tracking-[0.1em] text-[var(--map-ink)]"
            onClick={onOpen}
          >
            {t("world.openRegion")}
          </button>
        ) : null}
        <button
          type="button"
          className="cursor-pointer border border-[#9bb0c2] bg-[var(--map-panel)] px-2 py-1 text-[0.68rem] tracking-[0.1em] text-[var(--map-ink)]"
          onClick={onView}
        >
          {t("world.viewMemories")}
        </button>
      </div>
    </div>
  );
}

export function Map({
  level,
  geographies,
  focus,
  selectedGeographyId = null,
  emphasizeWorkId = null,
  interactionsEnabled = true,
  onSelectGeography,
  onViewMemories,
}: Props) {
  const t = useT();

  const icons = useMemo(() => {
    const iconMap = new globalThis.Map<string, L.DivIcon>();
    for (const geo of geographies) {
      iconMap.set(
        geo.geographyId,
        geographyIcon(
          geo,
          selectedGeographyId === geo.geographyId,
          emphasizeWorkId,
        ),
      );
    }
    return iconMap;
  }, [geographies, selectedGeographyId, emphasizeWorkId]);

  return (
    <div
      className={`trace-map-frame h-[min(68vh,720px)] w-full overflow-hidden border border-[var(--map-line)] bg-[var(--map-canvas)] sm:h-[min(76vh,820px)] lg:h-[min(78vh,880px)] ${
        interactionsEnabled ? "" : "pointer-events-none"
      }`}
      aria-hidden={!interactionsEnabled}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom={interactionsEnabled}
        dragging={interactionsEnabled}
        doubleClickZoom={interactionsEnabled}
        boxZoom={interactionsEnabled}
        keyboard={interactionsEnabled}
        touchZoom={interactionsEnabled}
        className="h-full w-full"
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FocusController focus={focus} />
        <MapInteractionGate enabled={interactionsEnabled} />

        {geographies.map((geo) => {
          const active = selectedGeographyId === geo.geographyId;
          const workNames = workIdsFromGeography(geo.categories)
            .map((id) => workLabelForId(id))
            .join(", ");
          const aria = t("world.geoMarkerAriaWorks", {
            label: geo.label,
            people: geo.peopleCount,
            activities: geo.activityCount,
            works: workNames,
          });
          return (
            <Marker
              key={geo.geographyId}
              position={[geo.lat, geo.lng]}
              icon={icons.get(geo.geographyId)}
              title={aria}
              zIndexOffset={500 + geo.peopleCount + (active ? 200 : 0)}
              eventHandlers={{
                click: () => {
                  if (!interactionsEnabled) return;
                  onSelectGeography(geo);
                },
              }}
            >
              <Popup>
                <GeographyPopup
                  geo={geo}
                  level={level}
                  onOpen={() => onSelectGeography(geo)}
                  onView={() => onViewMemories(geo)}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
