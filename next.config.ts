import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack/webpack from bundling firebase-admin and jose/jwks-rsa.
  // Combined with lib/firebase/admin.load.cjs (Node require), this avoids ERR_REQUIRE_ESM.
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/auth",
    "firebase-admin/firestore",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    "jose",
    "jwks-rsa",
    "gcp-metadata",
    "google-auth-library",
  ],
};

export default nextConfig;
