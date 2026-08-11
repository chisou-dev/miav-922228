import { NextResponse } from "next/server";
import { WRITER_MEMO_URL } from "@/features/core/apps";
import { getSiteUrl } from "@/features/shared/site";

/**
 * Minimal CORS allowlist for POST/OPTIONS /api/signals/redeem only.
 * Never use Access-Control-Allow-Origin: *.
 *
 * Confirmed Writer Memo production + local Vite ports, plus MIAV same-origin
 * so existing same-site redeem callers keep working when Origin is sent.
 */
const STATIC_REDEEM_CORS_ORIGINS: readonly string[] = [
  WRITER_MEMO_URL.replace(/\/$/, ""),
  "https://writer-memo.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://miav-922228.com",
  "https://www.miav-922228.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export type RedeemCorsDecision =
  | { kind: "no-origin" }
  | { kind: "allowed"; origin: string }
  | { kind: "denied" };

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/**
 * Optional extra origins via comma-separated env (never "*").
 * Example: SIGNAL_REDEEM_CORS_ORIGINS=https://preview.example.com
 */
export function listRedeemCorsAllowedOrigins(): readonly string[] {
  const set = new Set<string>();
  for (const origin of STATIC_REDEEM_CORS_ORIGINS) {
    set.add(normalizeOrigin(origin));
  }

  try {
    const site = getSiteUrl();
    if (site) set.add(normalizeOrigin(site));
  } catch {
    // ignore — static list still applies
  }

  const extra = process.env.SIGNAL_REDEEM_CORS_ORIGINS ?? "";
  for (const part of extra.split(",")) {
    const origin = normalizeOrigin(part);
    if (!origin || origin === "*") continue;
    set.add(origin);
  }

  return [...set];
}

export function decideRedeemCors(request: Request): RedeemCorsDecision {
  const raw = request.headers.get("Origin");
  if (!raw) return { kind: "no-origin" };

  const origin = normalizeOrigin(raw);
  if (!origin) return { kind: "no-origin" };

  const allowed = listRedeemCorsAllowedOrigins();
  if (allowed.includes(origin)) {
    return { kind: "allowed", origin };
  }
  return { kind: "denied" };
}

export function withRedeemCorsHeaders(
  response: NextResponse,
  origin: string,
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");
  return response;
}

/** Preflight for redeem only. */
export function redeemCorsPreflight(request: Request): NextResponse {
  const decision = decideRedeemCors(request);
  if (decision.kind === "denied") {
    return new NextResponse(null, { status: 403 });
  }
  if (decision.kind === "allowed") {
    const res = new NextResponse(null, { status: 204 });
    return withRedeemCorsHeaders(res, decision.origin);
  }
  // No Origin — not a browser CORS preflight we need to special-case.
  return new NextResponse(null, { status: 204 });
}

/**
 * Apply CORS to a redeem POST response, or reject disallowed cross-origin.
 * Same-origin / no-Origin requests are unchanged (no wildcard, no credentials).
 */
export function finalizeRedeemCorsResponse(
  request: Request,
  response: NextResponse,
): NextResponse {
  const decision = decideRedeemCors(request);
  if (decision.kind === "denied") {
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR" },
      { status: 403 },
    );
  }
  if (decision.kind === "allowed") {
    return withRedeemCorsHeaders(response, decision.origin);
  }
  return response;
}
