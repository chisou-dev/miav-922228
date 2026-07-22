"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  PLACE_CONTINENTS,
  countriesForContinent,
  findPlaceCascade,
  placesForCountry,
  type PlaceContinent,
  type WorldPlace,
} from "@/lib/places/client";

type Props = {
  value: WorldPlace | null;
  onChange: (place: WorldPlace | null) => void;
  onFocusPlace?: (place: WorldPlace) => void;
};

function Column({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] min-w-0 flex-1 flex-col border border-[var(--map-line)] bg-white">
      <p className="shrink-0 border-b border-[var(--map-line)] px-3 py-2 text-[0.68rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
        {label}
      </p>
      <ul
        role="listbox"
        aria-label={label}
        className="max-h-[220px] flex-1 overflow-y-auto py-1"
      >
        {children}
      </ul>
    </div>
  );
}

function Row({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onSelect}
        className={`block w-full cursor-pointer px-3 py-2 text-left text-[0.85rem] tracking-[0.02em] transition-colors ${
          selected
            ? "bg-[#e8eef4] text-[var(--map-ink)]"
            : "text-[var(--map-ink)] hover:bg-[#f4f7fa]"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

/**
 * Miller-column place picker: Continent → Country → City.
 * Quiet list rows, not button clusters.
 */
export function PlaceCascadePicker({ value, onChange, onFocusPlace }: Props) {
  const initial = value ? findPlaceCascade(value.locationId) : null;
  const [continent, setContinent] = useState<PlaceContinent | null>(
    initial?.continent ?? null,
  );
  const [country, setCountry] = useState<string | null>(
    initial?.country ?? null,
  );

  useEffect(() => {
    if (!value) return;
    const path = findPlaceCascade(value.locationId);
    if (!path) return;
    setContinent(path.continent);
    setCountry(path.country);
  }, [value]);

  const countries = useMemo(
    () => (continent ? countriesForContinent(continent) : []),
    [continent],
  );
  const cities = useMemo(
    () => (country ? placesForCountry(country) : []),
    [country],
  );

  return (
    <div className="space-y-2">
      <p className="text-[0.72rem] tracking-[0.12em] text-[var(--map-muted)]">
        Place
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Column label="Continent">
          {PLACE_CONTINENTS.map((name) => (
            <Row
              key={name}
              selected={continent === name}
              onSelect={() => {
                setContinent(name);
                setCountry(null);
                onChange(null);
              }}
            >
              {name}
            </Row>
          ))}
        </Column>

        <Column label="Country">
          {continent ? (
            countries.map((name) => (
              <Row
                key={name}
                selected={country === name}
                onSelect={() => {
                  setCountry(name);
                  onChange(null);
                }}
              >
                {name}
              </Row>
            ))
          ) : (
            <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
              Choose a continent
            </li>
          )}
        </Column>

        <Column label="City">
          {country ? (
            cities.map((place) => (
              <Row
                key={place.locationId}
                selected={value?.locationId === place.locationId}
                onSelect={() => {
                  onChange(place);
                  onFocusPlace?.(place);
                }}
              >
                {place.name}
              </Row>
            ))
          ) : (
            <li className="px-3 py-3 text-[0.78rem] text-[var(--map-muted)]">
              {continent ? "Choose a country" : "—"}
            </li>
          )}
        </Column>
      </div>

      {value ? (
        <p className="text-[0.8rem] tracking-[0.04em] text-[var(--map-muted)]">
          Selected: {value.name}, {value.country}
        </p>
      ) : null}
    </div>
  );
}
