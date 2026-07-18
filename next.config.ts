import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep firebase-admin and its auth deps outside the Turbopack/webpack bundle.
  // Prevents ERR_REQUIRE_ESM (jose / jwks-rsa) on Node API routes.
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "jose",
    "jwks-rsa",
  ],
};

export default nextConfig;
