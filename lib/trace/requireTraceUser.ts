import "server-only";

import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import type { TraceAuthType } from "@/lib/trace/types";

export async function requireTraceUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  try {
    const decoded = await verifyFirebaseIdToken(match[1]);
    const authType: TraceAuthType =
      decoded.signInProvider === "google.com" ? "google" : "anonymous";

    return {
      uid: decoded.uid,
      authType,
      signInProvider: decoded.signInProvider,
    };
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
}
