export type TraceAuthType = "anonymous" | "google";

export type TraceRecord = {
  id: string;
  miavId: string;
  uid: string;
  authType: TraceAuthType;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

/** Public pin payload — never includes email, displayName, photoURL, IP, or UID. */
export type TracePin = {
  id: string;
  miavId: string;
  authType: TraceAuthType;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
};

/** City cluster for the map — never loads every Trace document. */
export type TraceLocationCluster = {
  country: string;
  region: string;
  city: string;
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
};

export const TRACE_COLLECTION = "trace_map";
export const TRACE_LOCATIONS_COLLECTION = "trace_locations";
export const MIAV_COUNTER_DOC = "meta/miav_counter";
export const TRACE_STATS_DOC = "meta/trace_stats";
export const MAX_TRACE_MESSAGE_LENGTH = 200;
export const MAX_CITY_MAP_DOTS = 10;
export const MESSAGE_PREVIEW_LENGTH = 18;
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

export function toTracePin(trace: TraceRecord): TracePin {
  return {
    id: trace.id,
    miavId: trace.miavId,
    authType: trace.authType,
    country: trace.country,
    region: trace.region,
    city: trace.city,
    lat: trace.lat,
    lng: trace.lng,
    message: trace.message,
    createdAt: trace.createdAt,
  };
}

export function locationDocId(input: {
  country: string;
  region: string;
  city: string;
}): string {
  return [input.country, input.region, input.city]
    .map((part) => encodeURIComponent(part.trim()))
    .join("__");
}
