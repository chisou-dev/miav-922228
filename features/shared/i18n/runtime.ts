import { en } from "./messages/en";
import {
  DEFAULT_UI_LOCALE,
  htmlLang,
  type AvailableUiLocale,
} from "./locales";
import type { MessageCatalog, MessageKey, TVars } from "./types";

type Listener = () => void;

type I18nStore = {
  activeLocale: AvailableUiLocale;
  activeCatalog: MessageCatalog;
  listeners: Set<Listener>;
  cache: Map<AvailableUiLocale, MessageCatalog>;
};

const STORE_KEY = "__miavUiI18nStore";

function getStore(): I18nStore {
  const g = globalThis as typeof globalThis & {
    [STORE_KEY]?: I18nStore;
  };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      activeLocale: DEFAULT_UI_LOCALE,
      activeCatalog: en as unknown as MessageCatalog,
      listeners: new Set<Listener>(),
      cache: new Map<AvailableUiLocale, MessageCatalog>([
        ["en", en as unknown as MessageCatalog],
      ]),
    };
  }
  return g[STORE_KEY]!;
}

/** Static switch so Next/Turbopack can code-split each locale chunk. */
async function loadCatalog(
  locale: AvailableUiLocale,
): Promise<MessageCatalog> {
  switch (locale) {
    case "fr": {
      const mod = await import("./messages/fr");
      return mod.default;
    }
    case "es": {
      const mod = await import("./messages/es");
      return mod.default;
    }
    case "en":
    default:
      return en as unknown as MessageCatalog;
  }
}

function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

function warnMissing(key: string, locale: AvailableUiLocale): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
  }
}

/** Translate; fallback English, then key (dev-warned). */
export function t(key: MessageKey | string, vars?: TVars): string {
  const store = getStore();
  const primary = (store.activeCatalog as Record<string, string>)[key];
  if (primary !== undefined) return interpolate(primary, vars);

  const fallback = (en as Record<string, string>)[key];
  if (fallback !== undefined) {
    warnMissing(key, store.activeLocale);
    return interpolate(fallback, vars);
  }

  warnMissing(key, store.activeLocale);
  return key;
}

export function getUiLocale(): AvailableUiLocale {
  return getStore().activeLocale;
}

export function subscribeUiLocale(listener: Listener): () => void {
  const { listeners } = getStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyHtmlLang(locale: AvailableUiLocale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLang(locale);
  }
}

function notify(): void {
  getStore().listeners.forEach((fn) => fn());
}

export async function activateUiLocale(
  locale: AvailableUiLocale,
): Promise<AvailableUiLocale> {
  const store = getStore();
  let catalog = store.cache.get(locale);
  if (!catalog) {
    try {
      catalog = await loadCatalog(locale);
      store.cache.set(locale, catalog);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[i18n] failed to load locale "${locale}"`, err);
      }
      catalog = en as unknown as MessageCatalog;
    }
  }
  store.activeLocale = locale;
  store.activeCatalog = catalog;
  applyHtmlLang(locale);
  notify();
  return locale;
}

/** First paint: en catalog always cached; other locales activate async. */
export function bootstrapUiLocale(locale: AvailableUiLocale): void {
  const store = getStore();
  const catalog = store.cache.get(locale);
  store.activeLocale = locale;
  store.activeCatalog = catalog ?? (en as unknown as MessageCatalog);
  applyHtmlLang(locale);
}
