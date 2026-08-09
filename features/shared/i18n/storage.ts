import {
  DEFAULT_UI_LOCALE,
  UI_LOCALE_COOKIE,
  UI_LOCALE_STORAGE_KEY,
  isAvailableUiLocale,
  type AvailableUiLocale,
} from "./locales";

/**
 * Never auto-detect browser/OS language.
 * Missing / invalid → English so first visit is always EN.
 */
export function loadStoredUiLocale(): AvailableUiLocale {
  if (typeof window === "undefined") return DEFAULT_UI_LOCALE;
  try {
    const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (isAvailableUiLocale(raw)) return raw;
  } catch {
    // private mode
  }
  return DEFAULT_UI_LOCALE;
}

export function saveStoredUiLocale(locale: AvailableUiLocale): void {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  try {
    // 1 year — readable by server components via cookies() later if needed
    document.cookie = `${UI_LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  } catch {
    // ignore
  }
}

export function readUiLocaleCookie(
  cookieHeader: string | null | undefined,
): AvailableUiLocale {
  if (!cookieHeader) return DEFAULT_UI_LOCALE;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${UI_LOCALE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isAvailableUiLocale(value) ? value : DEFAULT_UI_LOCALE;
}
