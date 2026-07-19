"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import {
  MAX_CITY_MAP_DOTS,
  type TraceCityMarker,
  type TraceRegionMarker,
} from "@/lib/trace/types";
import { TRACE_COUNTRIES } from "@/lib/trace/locations";

type Focus = {
  lat: number;
  lng: number;
  zoom: number;
} | null;

type CityScope = {
  country: string;
  region: string;
  city: string;
} | null;

type Props = {
  focus: Focus;
  selectedCountry: string | null;
  selectedRegion: string | null;
  cityScope: CityScope;
  regions: TraceRegionMarker[];
  cities: TraceCityMarker[];
  interactionsEnabled?: boolean;
  onSelectCountry: (countryName: string) => void;
  onSelectRegion: (regionName: string) => void;
  onSelectCity: (cityName: string) => void;
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
      const container = map.getContainer();
      container.style.cursor = "";
      container.classList.remove("leaflet-interaction-off");
      return;
    }

    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.closePopup();
    const container = map.getContainer();
    container.style.cursor = "default";
    container.classList.add("leaflet-interaction-off");

    return () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      container.style.cursor = "";
      container.classList.remove("leaflet-interaction-off");
    };
  }, [enabled, map]);

  return null;
}

function stackOffsets(count: number): number[] {
  const dots = Math.min(Math.max(count, 0), MAX_CITY_MAP_DOTS);
  if (dots <= 0) return [0];
  const step = 0.045;
  const start = ((dots - 1) * step) / 2;
  return Array.from({ length: dots }, (_, index) => start - index * step);
}

/**
 * Hierarchical world map — Country → Region → City only.
 * City stacks show at most 10 quiet dots; list holds the rest.
 */
export function Map({
  focus,
  selectedCountry,
  selectedRegion,
  cityScope,
  regions,
  cities,
  interactionsEnabled = true,
  onSelectCountry,
  onSelectRegion,
  onSelectCity,
}: Props) {
  const countries = useMemo(() => TRACE_COUNTRIES, []);

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
        maxZoom={12}
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

        {countries.map((item) => {
          const active = selectedCountry === item.name;
          return (
            <CircleMarker
              key={item.code}
              center={[item.lat, item.lng]}
              radius={active ? 10 : 7}
              pathOptions={{
                color: active ? "#5b7c99" : "#9bb0c2",
                weight: 1,
                fillColor: active ? "#c5d6e6" : "#e8eef4",
                fillOpacity: 0.85,
              }}
              eventHandlers={{
                click: () => {
                  if (!interactionsEnabled) return;
                  onSelectCountry(item.name);
                },
              }}
            >
              <Popup>
                <span className="text-[0.8rem] tracking-[0.06em] text-[#243447]">
                  {item.name}
                </span>
              </Popup>
            </CircleMarker>
          );
        })}

        {selectedCountry
          ? regions.map((region) => {
              const active = selectedRegion === region.name;
              return (
                <CircleMarker
                  key={`${selectedCountry}-${region.name}`}
                  center={[region.lat, region.lng]}
                  radius={active ? 8 : 5}
                  pathOptions={{
                    color: active ? "#4d6d88" : "#a9b9c8",
                    weight: 1,
                    fillColor: active ? "#d7e3ee" : "#f0f4f7",
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (!interactionsEnabled) return;
                      onSelectRegion(region.name);
                    },
                  }}
                />
              );
            })
          : null}

        {selectedRegion
          ? cities.map((city) => {
              const offsets = stackOffsets(city.count);
              const cityActive = cityScope?.city === city.name;
              return offsets.map((offset, index) => (
                <CircleMarker
                  key={`${selectedRegion}-${city.name}-${index}`}
                  center={[city.lat + offset, city.lng]}
                  radius={cityActive ? 4.5 : city.count > 0 ? 3.5 : 3}
                  pathOptions={{
                    color: city.count > 0 ? "#6f8fa8" : "#b7c5d1",
                    weight: 1,
                    fillColor: cityActive
                      ? "#d7e3ee"
                      : city.count > 0
                        ? "#ffffff"
                        : "#ffffff",
                    fillOpacity: city.count > 0 ? 1 : 0.7,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (!interactionsEnabled) return;
                      onSelectCity(city.name);
                    },
                  }}
                >
                  {index === 0 ? (
                    <Popup>
                      <span className="text-[0.78rem] tracking-[0.06em] text-[#243447]">
                        {city.name}
                        {city.count > MAX_CITY_MAP_DOTS
                          ? ` · ${city.count}`
                          : city.count > 0
                            ? ` · ${city.count}`
                            : ""}
                      </span>
                    </Popup>
                  ) : null}
                </CircleMarker>
              ));
            })
          : null}
      </MapContainer>
    </div>
  );
}
