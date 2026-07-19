"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import type { TracePin } from "@/lib/trace/types";
import { TraceCard } from "@/components/trace-map/TraceCard";
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

type Props = {
  pins: TracePin[];
  focus: Focus;
  selectedCountry: string;
  selectedRegion: string;
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

function HierarchyLayer({
  countries,
  selectedCountry,
  selectedRegion,
  onSelectCountry,
  onSelectRegion,
  onSelectCity,
}: {
  countries: TraceCountry[];
  selectedCountry: string;
  selectedRegion: string;
  onSelectCountry: (name: string) => void;
  onSelectRegion: (name: string) => void;
  onSelectCity: (name: string) => void;
}) {
  const country = findCountry(selectedCountry);

  return (
    <>
      {countries.map((item) => (
        <CircleMarker
          key={item.code}
          center={[item.lat, item.lng]}
          radius={selectedCountry === item.name ? 10 : 7}
          pathOptions={{
            color: selectedCountry === item.name ? "#5b7c99" : "#9bb0c2",
            weight: 1,
            fillColor: selectedCountry === item.name ? "#c5d6e6" : "#e8eef4",
            fillOpacity: 0.85,
          }}
          eventHandlers={{
            click: () => onSelectCountry(item.name),
          }}
        >
          <Popup>
            <span className="text-[0.8rem] tracking-[0.06em] text-[#243447]">
              {item.name}
            </span>
          </Popup>
        </CircleMarker>
      ))}

      {country?.regions.map((region) => (
        <CircleMarker
          key={`${country.code}-${region.name}`}
          center={[region.lat, region.lng]}
          radius={selectedRegion === region.name ? 8 : 5}
          pathOptions={{
            color: selectedRegion === region.name ? "#4d6d88" : "#a9b9c8",
            weight: 1,
            fillColor: selectedRegion === region.name ? "#d7e3ee" : "#f0f4f7",
            fillOpacity: 0.9,
          }}
          eventHandlers={{
            click: () => onSelectRegion(region.name),
          }}
        />
      ))}

      {country?.regions
        .find((r) => r.name === selectedRegion)
        ?.cities.map((city) => (
          <CircleMarker
            key={`${selectedRegion}-${city.name}`}
            center={[city.lat, city.lng]}
            radius={4}
            pathOptions={{
              color: "#6f8fa8",
              weight: 1,
              fillColor: "#ffffff",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => onSelectCity(city.name),
            }}
          >
            <Popup>
              <span className="text-[0.78rem] tracking-[0.06em] text-[#243447]">
                {city.name}
              </span>
            </Popup>
          </CircleMarker>
        ))}
    </>
  );
}

const pinIcon = L.divIcon({
  className: "miav-trace-pin",
  html: `<span style="display:block;width:10px;height:10px;border-radius:999px;background:#6f8fa8;border:1px solid #2f4a63;"></span>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export function WorldMap({
  pins,
  focus,
  selectedCountry,
  selectedRegion,
  onSelectCountry,
  onSelectRegion,
  onSelectCity,
}: Props) {
  const countries = useMemo(() => TRACE_COUNTRIES, []);

  return (
    <div className="h-[min(70vh,640px)] w-full overflow-hidden border border-[var(--map-line)] bg-[#f7f9fb]">
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
          selectedCountry={selectedCountry}
          selectedRegion={selectedRegion}
          onSelectCountry={onSelectCountry}
          onSelectRegion={onSelectRegion}
          onSelectCity={onSelectCity}
        />
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
            <Popup>
              <TraceCard pin={pin} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
