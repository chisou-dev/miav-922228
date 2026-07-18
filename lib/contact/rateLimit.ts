type RateLimitEntry = {
  timestamps: number[];
};

const hitsByIp = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;

function prune(timestamps: number[], now: number) {
  return timestamps.filter((time) => now - time < WINDOW_MS);
}

/**
 * In-memory IP rate limit for contact submissions.
 * Best-effort on multi-instance hosts (e.g. Vercel); sufficient as a baseline.
 */
export function consumeContactRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const key = ip.trim() || "unknown";
  const current = hitsByIp.get(key);
  const recent = prune(current?.timestamps ?? [], now);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    );
    hitsByIp.set(key, { timestamps: recent });
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  hitsByIp.set(key, { timestamps: recent });
  return { allowed: true, retryAfterSec: 0 };
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "unknown";
}
