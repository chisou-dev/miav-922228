export type TraceAuthType = "anonymous" | "google";

export type TraceRecord = {
  id: string;
  miavId: string;
  uid: string;
  authType: TraceAuthType;
  /** Canonical place key from Location Database. Null on legacy documents. */
  locationId: string | null;
  /** Denormalized for legacy docs / migration — prefer Location DB via locationId. */
  country: string;
  region: string;
  city: string;
  /**
   * Stored copy of Location Catalog representative coords at write time.
   * Never treat as device GPS; public APIs must re-resolve from Catalog.
   */
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

/** Public Memory pin — never includes email, displayName, photoURL, IP, or Firebase UID. */
export type TracePin = {
  /** Public identifier only (e.g. MIAV-000157). Never the Firestore document id / UID. */
  miavId: string;
  authType: TraceAuthType;
  locationId: string | null;
  country: string;
  region: string;
  city: string;
  /** Catalog representative coords only — not device GPS. */
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
};

/** City cluster for the map — never loads every Trace document. */
export type TraceLocationCluster = {
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
  /** Catalog representative coords only when exposed publicly. */
  lat: number;
  lng: number;
  count: number;
};

export type TraceFirstSummary = {
  miavId: string;
  createdAt: string;
};

export type TraceLatestSummary = {
  miavId: string;
  country: string;
  city: string;
  messagePreview: string;
  createdAt: string;
};

export type TraceStats = {
  countryCount: number;
  cityCount: number;
  permanentCount: number;
  temporaryCount: number;
  first: TraceFirstSummary | null;
  latest: TraceLatestSummary | null;
};

export type TraceListScope = {
  country: string;
  region?: string;
  city?: string;
  locationId?: string;
};

export type TraceRegionMarker = {
  name: string;
  lat: number;
  lng: number;
  count: number;
};

export type TraceCityMarker = {
  locationId: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
};

export type TracePageResult = {
  traces: TracePin[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const TRACE_COLLECTION = "trace_map";
export const TRACE_LOCATIONS_COLLECTION = "trace_locations";
export const MIAV_COUNTER_DOC = "meta/miav_counter";
export const TRACE_STATS_DOC = "meta/trace_stats";
export const MAX_TRACE_MESSAGE_LENGTH = 500;
export const MAX_CITY_MAP_DOTS = 10;
/** List preview only — keep short; full text belongs on the memory card. */
export const MESSAGE_PREVIEW_LENGTH = 40;
export const TRACE_PAGE_SIZE = 50;
export const ANONYMOUS_TRACE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function formatMiavId(n: number): string {
  return `MIAV-${String(n).padStart(6, "0")}`;
}

export function isTraceAuthType(value: unknown): value is TraceAuthType {
  return value === "anonymous" || value === "google";
}

export function previewMessage(
  message: string,
  max = MESSAGE_PREVIEW_LENGTH,
): string {
  // Prefer formatMessagePreview from messagePolicy in UI; kept for callers.
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}...`;
}

export function formatJoinedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Public Memory pin from a stored record.
 * Omits Firestore document id / Firebase UID — identify by miavId only.
 * Prefer `pinFromRecord` so lat/lng are Catalog-resolved.
 */
export function toTracePin(trace: TraceRecord): TracePin {
  return {
    miavId: trace.miavId,
    authType: trace.authType,
    locationId: trace.locationId,
    country: trace.country,
    region: trace.region,
    city: trace.city,
    lat: trace.lat,
    lng: trace.lng,
    message: trace.message,
    createdAt: trace.createdAt,
  };
}

/** Aggregate doc id — prefer locationId; legacy uses encoded triple. */
export function locationDocId(input: {
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
}): string {
  if (input.locationId) return encodeURIComponent(input.locationId);
  return [input.country, input.region, input.city]
    .map((part) => encodeURIComponent(part.trim()))
    .join("__");
}
