import { NextResponse } from "next/server";
import { requireTraceUser } from "@/features/world-memory/trace/requireTraceUser";
import { listMySignalsForUid } from "@/features/signals/claimRest";

export async function GET_mine(request: Request) {
  const auth = await requireTraceUser(request);
  if (auth.error) return auth.error;
  if (auth.authType !== "google") {
    return NextResponse.json(
      { error: "Google sign-in is required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const signals = await listMySignalsForUid(auth.uid);
    return NextResponse.json({ signals });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load signals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
