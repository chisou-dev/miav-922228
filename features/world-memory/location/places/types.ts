/** Fixed World Memory place — city-level catalog coordinates only. */
export type WorldPlace = {
  locationId: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
};

export type WorldPlacesCatalog = {
  places: WorldPlace[];
};
