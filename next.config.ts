import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Contact/admin APIs no longer import firebase-admin.
  // Keep these external in case transitive packages remain.
  serverExternalPackages: ["jose"],
  // Redirect the alternate hostname if its DNS reaches this app.
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "miav-922228.com" }],
      destination: "https://www.miav-922228.com/:path*",
      permanent: true,
    }];
  },
};

export default nextConfig;
