import { NextResponse } from "next/server";
import { requireTraceUser } from "@/features/world-memory/trace/requireTraceUser";
import { claimSignalsForUid } from "@/features/signals/claimRest";

const MAX_CLAIM_BATCH = 50;

export async function POST_claim(request: Request) {
  const auth = await requireTraceUser(request);
  if (auth.error) return auth.error;
  if (auth.authType !== "google") {
    return NextResponse.json(
      { error: "Google sign-in is required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  const rawIds = record?.signalIds;
  if (!Array.isArray(rawIds)) {
    return NextResponse.json(
      { error: "signalIds array is required." },
      { status: 400 },
    );
  }

  const signalIds = rawIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean);

  if (signalIds.length === 0) {
    return NextResponse.json(
      { error: "signalIds must not be empty." },
      { status: 400 },
    );
  }
  if (signalIds.length > MAX_CLAIM_BATCH) {
    return NextResponse.json(
      { error: `At most ${MAX_CLAIM_BATCH} signals per request.` },
      { status: 400 },
    );
  }

  try {
    const result = await claimSignalsForUid(auth.uid, signalIds);
    if ("error" in result && result.error === "MIAV_ID_REQUIRED") {
      return NextResponse.json(
        {
          error: "MIAV ID is required before adding a Signal.",
          code: "MIAV_ID_REQUIRED",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to claim signals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
