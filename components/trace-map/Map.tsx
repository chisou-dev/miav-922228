"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { memoryStarSize } from "@/lib/places/starSize";
import type { MemoryStar, PlaceScope } from "@/lib/trace/types";

type Focus = { lat: number; lng: number; zoom: number } | null;

type Props = {
  stars: MemoryStar[];
  focus: Focus;
  placeScope: PlaceScope | null;
  interactionsEnabled?: boolean;
  onOpenMemories: (scope: PlaceScope) => void;
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

function starIcon(size: number, active: boolean) {
  return L.divIcon({
    className: "miav-memory-star-wrap",
    html: `<span class="miav-memory-star${active ? " miav-memory-star--active" : ""}" style="width:${size}px;height:${size}px"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function Map({
  stars,
  focus,
  placeScope,
  interactionsEnabled = true,
  onOpenMemories,
}: Props) {
  return (
    <div
      className={`h-[min(72vh,720px)] w-full overflow-hidden border border-[var(--map-line)] bg-[#f7f9fb] ${
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

        {stars.map((star) => {
          const active = placeScope?.locationId === star.locationId;
          const size = memoryStarSize(star.count);
          return (
            <Marker
              key={star.locationId}
              position={[star.lat, star.lng]}
              icon={starIcon(size, active)}
              zIndexOffset={500 + star.count}
              eventHandlers={{
                click: () => {
                  if (!interactionsEnabled) return;
                  onOpenMemories({
                    locationId: star.locationId,
                    country: star.country,
                    name: star.name,
                  });
                },
              }}
            >
              <Popup>
                <span className="text-[0.78rem] tracking-[0.06em] text-[#243447]">
                  {star.name}, {star.country}
                  {star.count > 1 ? ` · ${star.count}` : ""}
                </span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
