const PRODUCTION_SITE_URL = "https://miav-922228.com";

export const SITE_NAME = "MIAV-922228";

export const SITE_DESCRIPTION =
  "Official website of MIAV-922228, a literary science fiction project exploring AI, memory, and human emotions.";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
