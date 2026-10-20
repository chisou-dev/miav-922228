/**
 * Quiet editorial artwork for lists, not retailer cover images.
 * Amazon / Kindle cover art is deliberately not substituted with
 * invented images. Only verified first-party files may be shown.
 */
export const EDITORIAL_ART = {
  afterRain: {
    src: "/images/editorial/after-the-rain.svg",
    width: 1200, height: 675,
    alt: "An empty bookshop street reflected in the pavement after rain",
  },
  jeff: {
    src: "/images/editorial/jeff.svg",
    width: 1200, height: 675,
    alt: "A quiet Japanese side street and a warm restaurant lantern at dusk",
  },
  japan8000hz: {
    src: "/images/editorial/japan-8000hz.svg",
    width: 1200, height: 675,
    alt: "An almost empty railway platform with a red signal",
  },
  fourthPeriod: {
    src: "/images/editorial/fourth-period.svg",
    width: 1200, height: 675,
    alt: "An empty classroom in the late afternoon",
  },
  nextTimeISeeYou: {
    src: "/images/editorial/next-time-i-see-you.svg",
    width: 1200, height: 675,
    alt: "A red ribbon suspended against a quiet blue sky",
  },
  miav: {
    src: "/images/miav/miav-og.png",
    width: 1280, height: 720,
    alt: "MIAV-922228 representative artwork",
  },
  after50Million: {
    src: "/images/after-50-million/after-50-million-hero.png",
    width: 1672, height: 941,
    alt: "A blue balloon against a cloudy sky — After ¥50 Million",
  },
} as const;
