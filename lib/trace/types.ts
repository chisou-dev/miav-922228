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

/** Public pin payload — never includes email, IP, or raw secrets. */
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

export type TraceStats = {
  countryCount: number;
  cityCount: number;
  permanentCount: number;
  temporaryCount: number;
  latest: TracePin | null;
};

export const TRACE_COLLECTION = "trace_map";
export const MIAV_COUNTER_DOC = "meta/miav_counter";
export const MAX_TRACE_MESSAGE_LENGTH = 20;
export const ANONYMOUS_TRACE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function formatMiavId(n: number): string {
  return `MIAV-${String(n).padStart(6, "0")}`;
}

export function isTraceAuthType(value: unknown): value is TraceAuthType {
  return value === "anonymous" || value === "google";
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

export function computeTraceStats(pins: TracePin[]): TraceStats {
  const countries = new Set<string>();
  const cities = new Set<string>();
  let permanentCount = 0;
  let temporaryCount = 0;
  let latest: TracePin | null = null;

  for (const pin of pins) {
    if (pin.country) countries.add(pin.country);
    if (pin.city) cities.add(`${pin.country}|${pin.region}|${pin.city}`);
    if (pin.authType === "google") permanentCount += 1;
    else temporaryCount += 1;
    if (
      !latest ||
      new Date(pin.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = pin;
    }
  }

  return {
    countryCount: countries.size,
    cityCount: cities.size,
    permanentCount,
    temporaryCount,
    latest,
  };
}
