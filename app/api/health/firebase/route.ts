import { NextResponse } from "next/server";
import {
  getMissingFirebaseClientEnvKeys,
  isAdminUidConfigured,
  isFirebaseClientEnvReady,
} from "@/lib/firebase/env";
import {
  areAdminUidEnvVarsAligned,
  getAdminUidFromEnv,
  isFirebaseAdminEnvConfigured,
  normalizeAdminUid,
} from "@/lib/firebase/serviceAccount";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe configuration probe for production setup.
 * Returns booleans / missing key names only — never secret values or UIDs.
 */
export async function GET() {
  const missingClientKeys = getMissingFirebaseClientEnvKeys();
  const client = isFirebaseClientEnvReady();
  const adminSdk = isFirebaseAdminEnvConfigured();
  const adminUid = isAdminUidConfigured() && Boolean(getAdminUidFromEnv());
  const adminUidAligned = areAdminUidEnvVarsAligned();

  return NextResponse.json({
    ok: client && adminSdk && adminUid && adminUidAligned !== false,
    siteUrl: getSiteUrl(),
    client,
    adminSdk,
    adminUid,
    adminUidSources: {
      ADMIN_UID: Boolean(normalizeAdminUid(process.env.ADMIN_UID)),
      NEXT_PUBLIC_ADMIN_UID: Boolean(
        normalizeAdminUid(process.env.NEXT_PUBLIC_ADMIN_UID),
      ),
    },
    /** null = only one set; true = both set and equal; false = both set but differ */
    adminUidAligned,
    missingClientKeys,
  });
}
