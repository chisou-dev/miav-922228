import "server-only";

import { NextResponse } from "next/server";
import {
  getAdminUid,
  isAllowedAdminUid,
  isFirebaseAdminConfigured,
  verifyFirebaseIdToken,
} from "@/lib/firebase/admin";

export async function requireAdmin(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Firebase Admin is not configured." },
        { status: 503 },
      ),
    };
  }

  const adminUid = getAdminUid();
  if (!adminUid) {
    return {
      error: NextResponse.json(
        { error: "ADMIN_UID is not configured." },
        { status: 503 },
      ),
    };
  }

  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  try {
    const decoded = await verifyFirebaseIdToken(match[1]);
    // Accept if uid matches ADMIN_UID and/or NEXT_PUBLIC_ADMIN_UID
    // (both are normalized; mismatch between the two was a common 403 cause).
    if (!isAllowedAdminUid(decoded.uid)) {
      return {
        error: NextResponse.json(
          {
            error: "Forbidden.",
            code: "ADMIN_UID_MISMATCH",
            hint: "Signed-in Firebase Auth uid does not match ADMIN_UID / NEXT_PUBLIC_ADMIN_UID.",
          },
          { status: 403 },
        ),
      };
    }

    return { uid: decoded.uid };
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
}
