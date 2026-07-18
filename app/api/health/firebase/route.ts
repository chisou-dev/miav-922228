import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured, getAdminUid } from "@/lib/firebase/admin";
import {
  getMissingFirebaseClientEnvKeys,
  isAdminUidConfigured,
  isFirebaseClientEnvReady,
} from "@/lib/firebase/env";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Safe configuration probe for production setup.
 * Returns booleans / missing key names only — never secret values.
 */
export async function GET() {
  const missingClientKeys = getMissingFirebaseClientEnvKeys();
  const client = isFirebaseClientEnvReady();
  const adminSdk = isFirebaseAdminConfigured();
  const adminUid = isAdminUidConfigured() && Boolean(getAdminUid());

  return NextResponse.json({
    ok: client && adminSdk && adminUid,
    siteUrl: getSiteUrl(),
    client,
    adminSdk,
    adminUid,
    missingClientKeys,
  });
}
