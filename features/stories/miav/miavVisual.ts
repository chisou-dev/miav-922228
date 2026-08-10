import { getSiteUrl } from "@/features/shared/site";

/**
 * Shared MIAV-922228 representative visual for archive display + OG/Twitter cards.
 * Chapter pages reuse this until per-chapter art exists.
 */
export const MIAV_OG_IMAGE = {
  /** Public path under /public */
  path: "/images/miav/miav-og.png",
  width: 1280,
  height: 720,
  alt: "Representative science-fiction visual for MIAV-922228",
} as const;

export function miavOgImageAbsoluteUrl(): string {
  return `${getSiteUrl()}${MIAV_OG_IMAGE.path}`;
}

/** Next.js Metadata openGraph / twitter image entries (absolute URL). */
export function miavOgMetadataImages() {
  const url = miavOgImageAbsoluteUrl();
  return [
    {
      url,
      width: MIAV_OG_IMAGE.width,
      height: MIAV_OG_IMAGE.height,
      alt: MIAV_OG_IMAGE.alt,
    },
  ];
}
