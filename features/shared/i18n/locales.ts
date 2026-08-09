/**
 * UI locales for the MIAV site chrome.
 * Content/story locales stay in `features/shared/locale.ts` (separate layer).
 *
 * Available in Language menu: en / fr / es only.
 * `ja` (and others) stay reserved for future registration — not shown now.
 */
export const UI_LOCALES = ["en", "fr", "es", "ja", "de", "it", "ko", "zh"] as const;

export type UiLocale = (typeof UI_LOCALES)[number];

/** Languages offered in the Language selector this release. */
export const AVAILABLE_UI_LOCALES = ["en", "fr", "es"] as const satisfies readonly UiLocale[];

export type AvailableUiLocale = (typeof AVAILABLE_UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: AvailableUiLocale = "en";

export const UI_LOCALE_STORAGE_KEY = "miav_ui_locale";
export const UI_LOCALE_COOKIE = "miav_ui_locale";

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

export function isAvailableUiLocale(value: unknown): value is AvailableUiLocale {
  return (
    typeof value === "string" &&
    (AVAILABLE_UI_LOCALES as readonly string[]).includes(value)
  );
}

export function htmlLang(locale: UiLocale): string {
  return locale;
}

/** Map UI locale → story/chapter content locale (no invented Spanish fiction). */
export function uiLocaleToContentLocale(
  ui: AvailableUiLocale,
): "en" | "ja" | "fr" {
  if (ui === "fr") return "fr";
  // es has no story bodies yet — keep English fiction under Spanish UI
  return "en";
}
