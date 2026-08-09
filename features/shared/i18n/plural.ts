import { getUiLocale } from "./runtime";

/**
 * Locale-aware plural category for message keys like `reader.firstVisit.one`.
 * Uses Intl.PluralRules so future locales (ja, etc.) inherit CLDR rules.
 */
export function pluralCategory(
  count: number,
  locale: string = getUiLocale(),
): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

/** Resolve `baseKey.one` / `baseKey.other` / … for the active (or given) locale. */
export function selectPluralKey(
  baseKey: string,
  count: number,
  locale?: string,
): string {
  return `${baseKey}.${pluralCategory(count, locale)}`;
}
