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
    src: "/images/editorial/japan-8000hz.webp",
    width: 1672, height: 941,
    alt: "A rain-dark Japanese railway platform at dusk with a red signal",
  },
  fourthPeriod: {
    src: "/images/editorial/fourth-period.webp",
    width: 1672, height: 941,
    alt: "An empty classroom illuminated by the setting sun",
  },
  nextTimeISeeYou: {
    src: "/images/editorial/next-time-i-see-you.webp",
    width: 1672, height: 941,
    alt: "A red ribbon and letter on a piano beside a twilight window",
  },
  miav: {
    src: "/images/miav/miav-og.png",
    width: 1280, height: 720,
    alt: "MIAV-922228 representative artwork",
  },
  after50Million: {
    src: "/images/editorial/after-50-million.webp",
    width: 1672, height: 941,
    alt: "A blue balloon rising alone through sunlit clouds — After ¥50 Million",
  },
} as const;
