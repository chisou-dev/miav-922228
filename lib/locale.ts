export const locales = ["en", "ja", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Active reading locale for chapter content.
 * URL stays `/chapters/[slug]` and currently resolves to English.
 * Later this can read a cookie, header, or path prefix without changing
 * the chapter slug routes.
 */
export function getContentLocale(_options?: {
  preferredLocale?: string | null;
}): Locale {
  const preferred = _options?.preferredLocale;
  if (preferred && isLocale(preferred)) {
    return preferred;
  }
  return defaultLocale;
}
