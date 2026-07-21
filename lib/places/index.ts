import { WORLD_PLACES } from "@/lib/places/places-data";
import type { WorldPlace } from "@/lib/places/types";

const byId = new Map(WORLD_PLACES.map((place) => [place.locationId, place]));

export function listPlaces(): WorldPlace[] {
  return WORLD_PLACES;
}

export function getPlaceById(locationId: string): WorldPlace | undefined {
  return byId.get(locationId);
}

export function placeToTraceFields(place: WorldPlace) {
  return {
    locationId: place.locationId,
    country: place.country,
    region: "",
    city: place.name,
    lat: place.lat,
    lng: place.lng,
  };
}
