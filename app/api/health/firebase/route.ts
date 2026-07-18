import { NextResponse } from "next/server";
import {
  getMissingFirebaseClientEnvKeys,
  isAdminUidConfigured,
  isFirebaseClientEnvReady,
} from "@/lib/firebase/env";
import {
  getAdminUidFromEnv,
  isFirebaseAdminEnvConfigured,
} from "@/lib/firebase/serviceAccount";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe configuration probe for production setup.
 * Does not import firebase-admin (avoids jose/jwks-rsa ESM bundling issues).
 * Returns booleans / missing key names only — never secret values.
 */
export async function GET() {
  const missingClientKeys = getMissingFirebaseClientEnvKeys();
  const client = isFirebaseClientEnvReady();
  const adminSdk = isFirebaseAdminEnvConfigured();
  const adminUid = isAdminUidConfigured() && Boolean(getAdminUidFromEnv());

  return NextResponse.json({
    ok: client && adminSdk && adminUid,
    siteUrl: getSiteUrl(),
    client,
    adminSdk,
    adminUid,
    missingClientKeys,
  });
}
