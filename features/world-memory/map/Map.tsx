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
  CATEGORY_MAP_COLORS,
  CATEGORY_MARKER_OFFSETS,
  CATEGORY_ORDER,
} from "@/features/world-memory/map/categoryColors";
import type { GeographyAggregate } from "@/features/world-memory/trace/aggregate";
import type { TraceCategory } from "@/features/world-memory/trace/works";

type Focus = { lat: number; lng: number; zoom: number } | null;

type Props = {
  level: "world" | "country" | "region";
  geographies: GeographyAggregate[];
  focus: Focus;
  selectedGeographyId?: string | null;
  emphasizeCategory?: TraceCategory | null;
  interactionsEnabled?: boolean;
  onSelectGeography: (
    geo: GeographyAggregate,
    category?: TraceCategory,
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
  emphasizeCategory: TraceCategory | null | undefined,
) {
  const cats = CATEGORY_ORDER.filter((c) =>
    geo.categories.some((row) => row.category === c),
  );
  const starsHtml = cats
    .map((category) => {
      const offset = CATEGORY_MARKER_OFFSETS[category];
      const color = CATEGORY_MAP_COLORS[category];
      const emph = emphasizeCategory === category;
      const size = emph || cats.length === 1 ? 14 : 11;
      return `<span class="miav-geo-cat-star${emph ? " miav-geo-cat-star--emph" : ""}" data-category="${category}" style="--ox:${offset.x}px;--oy:${offset.y}px;width:${size}px;height:${size}px;background-color:${color.fill};border-color:${color.border}"></span>`;
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
    <div className="min-w-[11rem] max-w-[min(16rem,calc(100vw-3rem))] px-1 py-0.5 text-[#243447]">
      <p className="text-[0.82rem] font-medium tracking-[0.06em]">{geo.label}</p>
      <p className="mt-1 text-[0.72rem] tracking-[0.04em] text-[#6b7c8d]">
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
      <ul className="mt-2 space-y-1">
        {CATEGORY_ORDER.map((category) => {
          const row = geo.categories.find((c) => c.category === category);
          if (!row) return null;
          const color = CATEGORY_MAP_COLORS[category];
          return (
            <li
              key={category}
              className="flex items-start gap-2 text-[0.7rem] tracking-[0.04em]"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-block h-2 w-2 shrink-0"
                style={{
                  clipPath:
                    "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                  backgroundColor: color.fill,
                }}
              />
              <span>
                <span className="font-medium tracking-[0.1em]">
                  {t(labelKey[category])}
                </span>
                <span className="block text-[#6b7c8d]">
                  {personLabel(
                    row.peopleCount,
                    t("world.personCount", { count: row.peopleCount }),
                    t("world.peopleCount", { count: row.peopleCount }),
                  )}
                  {" · "}
                  {personLabel(
                    row.activityCount,
                    t("world.activityCountOne", { count: row.activityCount }),
                    t("world.activityCountMany", { count: row.activityCount }),
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {level === "world" ? (
          <button
            type="button"
            className="cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-2 py-1 text-[0.68rem] tracking-[0.1em]"
            onClick={onOpen}
          >
            {t("world.openCountry")}
          </button>
        ) : null}
        {level === "country" ? (
          <button
            type="button"
            className="cursor-pointer border border-[#9bb0c2] bg-[#e8eef4] px-2 py-1 text-[0.68rem] tracking-[0.1em]"
            onClick={onOpen}
          >
            {t("world.openRegion")}
          </button>
        ) : null}
        <button
          type="button"
          className="cursor-pointer border border-[#9bb0c2] bg-white px-2 py-1 text-[0.68rem] tracking-[0.1em]"
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
  emphasizeCategory = null,
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
          emphasizeCategory,
        ),
      );
    }
    return iconMap;
  }, [geographies, selectedGeographyId, emphasizeCategory]);

  return (
    <div
      className={`h-[min(62vh,640px)] w-full overflow-hidden border border-[var(--map-line)] bg-[#f7f9fb] sm:h-[min(72vh,720px)] ${
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
          const categoryNames = geo.categories
            .map((c) => c.category.toUpperCase())
            .join(", ");
          const aria = t("world.geoMarkerAria", {
            label: geo.label,
            people: geo.peopleCount,
            activities: geo.activityCount,
            categories: categoryNames,
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
