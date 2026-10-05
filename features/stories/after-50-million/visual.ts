import { getSiteUrl } from "@/features/shared/site";

/** Hero and Open Graph image for After ¥50 Million. */
export const AFTER_50_MILLION_HERO = {
  path: "/images/after-50-million/after-50-million-hero.png",
  width: 1672,
  height: 941,
  alt: "A blue balloon against a cloudy sky — After ¥50 Million",
} as const;

export function after50MillionHeroAbsoluteUrl(): string {
  return `${getSiteUrl()}${AFTER_50_MILLION_HERO.path}`;
}

/** Next.js Metadata openGraph / twitter image entries (absolute URL). */
export function after50MillionOgMetadataImages() {
  const url = after50MillionHeroAbsoluteUrl();
  return [
    {
      url,
      width: AFTER_50_MILLION_HERO.width,
      height: AFTER_50_MILLION_HERO.height,
      alt: AFTER_50_MILLION_HERO.alt,
    },
  ];
}
