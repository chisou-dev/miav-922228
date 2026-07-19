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
  type TraceLocationCluster,
} from "@/lib/trace/types";
import {
  TRACE_COUNTRIES,
  findCountry,
  type TraceCountry,
} from "@/lib/trace/locations";

type Focus = {
  lat: number;
  lng: number;
  zoom: number;
} | null;

type ListScope = {
  country: string;
  region?: string;
  city?: string;
};

type Props = {
  locations: TraceLocationCluster[];
  focus: Focus;
  selectedCountry: string;
  selectedRegion: string;
  listScope: ListScope | null;
  onSelectCountry: (countryName: string) => void;
  onSelectRegion: (regionName: string) => void;
  onSelectCity: (input: {
    country: string;
    region: string;
    city: string;
  }) => void;
  onOpenList: (scope: ListScope) => void;
};

function FocusController({ focus }: { focus: Focus }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.85 });
  }, [focus, map]);
  return null;
}

function stackOffsets(count: number): number[] {
  const dots = Math.min(Math.max(count, 0), MAX_CITY_MAP_DOTS);
  if (dots <= 0) return [];
  const step = 0.045;
  const start = ((dots - 1) * step) / 2;
  return Array.from({ length: dots }, (_, index) => start - index * step);
}

function HierarchyLayer({
  countries,
  locations,
  selectedCountry,
  selectedRegion,
  listScope,
  onSelectCountry,
  onSelectRegion,
  onSelectCity,
  onOpenList,
}: {
  countries: TraceCountry[];
  locations: TraceLocationCluster[];
  selectedCountry: string;
  selectedRegion: string;
  listScope: ListScope | null;
  onSelectCountry: (name: string) => void;
  onSelectRegion: (name: string) => void;
  onSelectCity: (input: {
    country: string;
    region: string;
    city: string;
  }) => void;
  onOpenList: (scope: ListScope) => void;
}) {
  const country = findCountry(selectedCountry);

  const cityClusters = useMemo(() => {
    if (!country) return [] as TraceLocationCluster[];
    return locations.filter((item) => item.country === country.name);
  }, [locations, country]);

  return (
    <>
      {countries.map((item) => {
        const active =
          selectedCountry === item.name || listScope?.country === item.name;
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
                onSelectCountry(item.name);
                onOpenList({ country: item.name });
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

      {country?.regions.map((region) => {
        const active =
          selectedRegion === region.name ||
          (listScope?.country === country.name &&
            listScope?.region === region.name);
        return (
          <CircleMarker
            key={`${country.code}-${region.name}`}
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
                onSelectRegion(region.name);
                onOpenList({
                  country: country.name,
                  region: region.name,
                });
              },
            }}
          />
        );
      })}

      {cityClusters.map((cluster) => {
        const offsets = stackOffsets(cluster.count);
        const cityActive =
          listScope?.country === cluster.country &&
          listScope?.region === cluster.region &&
          listScope?.city === cluster.city;

        return offsets.map((offset, index) => (
          <CircleMarker
            key={`${cluster.country}-${cluster.region}-${cluster.city}-${index}`}
            center={[cluster.lat + offset, cluster.lng]}
            radius={cityActive ? 4.5 : 3.5}
            pathOptions={{
              color: "#6f8fa8",
              weight: 1,
              fillColor: cityActive ? "#d7e3ee" : "#ffffff",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => {
                onSelectCity({
                  country: cluster.country,
                  region: cluster.region,
                  city: cluster.city,
                });
                onOpenList({
                  country: cluster.country,
                  region: cluster.region,
                  city: cluster.city,
                });
              },
            }}
          >
            {index === 0 ? (
              <Popup>
                <span className="text-[0.78rem] tracking-[0.06em] text-[#243447]">
                  {cluster.city}
                  {cluster.count > MAX_CITY_MAP_DOTS
                    ? ` · ${cluster.count}`
                    : ""}
                </span>
              </Popup>
            ) : null}
          </CircleMarker>
        ));
      })}

      {/* Curated city markers when no traces yet — still open an empty list */}
      {country?.regions
        .find((r) => r.name === selectedRegion)
        ?.cities.filter(
          (city) =>
            !cityClusters.some(
              (cluster) =>
                cluster.city === city.name &&
                cluster.region === selectedRegion,
            ),
        )
        .map((city) => (
          <CircleMarker
            key={`empty-${selectedRegion}-${city.name}`}
            center={[city.lat, city.lng]}
            radius={3}
            pathOptions={{
              color: "#b7c5d1",
              weight: 1,
              fillColor: "#ffffff",
              fillOpacity: 0.7,
            }}
            eventHandlers={{
              click: () => {
                onSelectCity({
                  country: country.name,
                  region: selectedRegion,
                  city: city.name,
                });
                onOpenList({
                  country: country.name,
                  region: selectedRegion,
                  city: city.name,
                });
              },
            }}
          />
        ))}
    </>
  );
}

export function WorldMap({
  locations,
  focus,
  selectedCountry,
  selectedRegion,
  listScope,
  onSelectCountry,
  onSelectRegion,
  onSelectCity,
  onOpenList,
}: Props) {
  const countries = useMemo(() => TRACE_COUNTRIES, []);

  return (
    <div className="h-[min(72vh,720px)] w-full overflow-hidden border border-[var(--map-line)] bg-[#f7f9fb]">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom
        className="h-full w-full"
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FocusController focus={focus} />
        <HierarchyLayer
          countries={countries}
          locations={locations}
          selectedCountry={selectedCountry}
          selectedRegion={selectedRegion}
          listScope={listScope}
          onSelectCountry={onSelectCountry}
          onSelectRegion={onSelectRegion}
          onSelectCity={onSelectCity}
          onOpenList={onOpenList}
        />
      </MapContainer>
    </div>
  );
}
