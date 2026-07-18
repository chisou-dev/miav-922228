import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Contact/admin APIs no longer import firebase-admin.
  // Keep these external in case transitive packages remain.
  serverExternalPackages: ["jose"],
};

export default nextConfig;
