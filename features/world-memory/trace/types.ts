import type { TraceCategory } from "@/features/world-memory/trace/works";

export type TraceAuthType = "guest" | "google" | "anonymous";

export type { TraceCategory };

export type TraceRecord = {
  id: string;
  miavId: string;
  uid: string;
  authType: TraceAuthType;
  /** Present on Phase 2+ Google posts only — omit on legacy traces. */
  category?: TraceCategory;
  /** Present on Phase 2+ Google posts only — omit on legacy traces. */
  workId?: string;
  locationId: string | null;
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

/** Public Memory — never includes uid, email, or device identifiers. */
export type TracePin = {
  miavId: string;
  authType: TraceAuthType;
  category?: TraceCategory;
  workId?: string;
  locationId: string | null;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
};

/** Aggregated star on the world map (legacy city stars / earlier memories). */
export type MemoryStar = {
  locationId: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
};

export type {
  AggregateWorkBreakdown,
  CategoryAggregate,
  GeographyAggregate,
  AggregateMemoryRow,
  AggregateScope,
} from "@/features/world-memory/trace/aggregate";

/** @deprecated Legacy cluster shape — use MemoryStar. */
export type TraceLocationCluster = {
  locationId?: string | null;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
};

export type TraceStats = {
  placeCount: number;
  memoryCount: number;
  guestCount: number;
  googleCount: number;
  latest: {
    miavId: string;
    country: string;
    city: string;
    messagePreview: string;
    createdAt: string;
  } | null;
};

export type TracePageResult = {
  traces: TracePin[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PlaceScope = {
  locationId: string;
  country: string;
  name: string;
};

export const TRACE_COLLECTION = "trace_map";
export const TRACE_LOCATIONS_COLLECTION = "trace_locations";
/** Phase 2.5 — one public MIAV ID per Google account (doc id = Firebase UID). */
export const MIAV_IDENTITIES_COLLECTION = "miav_identities";
/** Phase 2.5 — one Memory activity per (uid, workId). */
export const TRACE_ACTIVITIES_COLLECTION = "trace_activities";
export const MIAV_COUNTER_DOC = "meta/miav_counter";
export const TRACE_STATS_DOC = "meta/trace_stats";
export const MAX_GUEST_MESSAGE_LENGTH = 50;
export const MAX_GOOGLE_MESSAGE_LENGTH = 500;
/** @deprecated Use MAX_GOOGLE_MESSAGE_LENGTH */
export const MAX_TRACE_MESSAGE_LENGTH = MAX_GOOGLE_MESSAGE_LENGTH;
export const MESSAGE_PREVIEW_LENGTH = 40;
export const TRACE_PAGE_SIZE = 50;
export const ANONYMOUS_TRACE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Public MIAV Identity — never expose Firebase UID in API responses. */
export type MiavIdentityRecord = {
  /** Document id equals Firebase UID (server-only). */
  uid: string;
  miavId: string;
  createdAt: string;
  updatedAt: string;
};

/** Server Activity record — uid stays internal. */
export type TraceActivityRecord = {
  id: string;
  uid: string;
  miavId: string;
  category: TraceCategory;
  workId: string;
  locationId: string | null;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export function formatMiavId(n: number): string {
  return `MIAV-${String(n).padStart(6, "0")}`;
}

export function isTraceAuthType(value: unknown): value is TraceAuthType {
  return value === "guest" || value === "google" || value === "anonymous";
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
    miavId: trace.miavId,
    authType: trace.authType,
    ...(trace.category ? { category: trace.category } : {}),
    ...(trace.workId ? { workId: trace.workId } : {}),
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
