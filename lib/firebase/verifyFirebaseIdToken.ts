import "server-only";

/**
 * Verify Firebase Auth ID tokens without firebase-admin.
 * Uses ESM jose via dynamic import (never require()).
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  signInProvider: string;
}> {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }

  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(
    new URL(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    ),
  );

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid =
    typeof payload.user_id === "string"
      ? payload.user_id
      : typeof payload.sub === "string"
        ? payload.sub
        : "";

  if (!uid) {
    throw new Error("Invalid Firebase ID token.");
  }

  const firebaseClaim = payload.firebase as
    | { sign_in_provider?: string }
    | undefined;
  const signInProvider = firebaseClaim?.sign_in_provider || "unknown";

  return { uid, signInProvider };
}
