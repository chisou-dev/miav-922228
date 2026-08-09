import { cookies } from "next/headers";
import {
  UI_LOCALE_COOKIE,
  isAvailableUiLocale,
  uiLocaleToContentLocale,
} from "@/features/shared/i18n/locales";

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

/**
 * Request-scoped content locale — reads the `miav_ui_locale` cookie (same
 * cookie the UI language switcher writes) and maps it to a content locale
 * via `uiLocaleToContentLocale` (fr UI → fr content; es UI → en content,
 * no Spanish fiction). Falls back to `getContentLocale()` (English) when
 * the cookie is missing or `cookies()` is unavailable (e.g. static build).
 */
export async function getContentLocaleFromRequest(): Promise<Locale> {
  try {
    const jar = await cookies();
    const raw = jar.get(UI_LOCALE_COOKIE)?.value;
    if (isAvailableUiLocale(raw)) {
      return getContentLocale({ preferredLocale: uiLocaleToContentLocale(raw) });
    }
  } catch {
    // cookies() throws outside a request scope (e.g. sitemap/static generation).
  }
  return getContentLocale();
}
