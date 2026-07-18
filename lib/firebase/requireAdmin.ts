import { NextResponse } from "next/server";
import { getAdminAuth, getAdminUid, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

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
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    if (decoded.uid !== adminUid) {
      return {
        error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
      };
    }

    return { uid: decoded.uid };
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
}
