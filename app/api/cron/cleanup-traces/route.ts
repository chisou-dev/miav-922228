import { NextResponse } from "next/server";
import { deleteExpiredAnonymousTraces } from "@/lib/trace/traceRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cleanup Temporary (anonymous) Traces past expiresAt.
 * Canonical path for World Memory star consistency:
 *   delete Trace → decrement trace_locations → rebuild aggregates.
 * MIAV IDs are never reused.
 *
 * Secure with CRON_SECRET. Vercel Cron and the Cloud Function both call this route.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") || "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1];
  const cronHeader = request.headers.get("x-cron-secret");

  if (!secret || (bearer !== secret && cronHeader !== secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const deleted = await deleteExpiredAnonymousTraces();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
