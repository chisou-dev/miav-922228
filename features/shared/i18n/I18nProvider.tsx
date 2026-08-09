"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AVAILABLE_UI_LOCALES,
  type AvailableUiLocale,
} from "./locales";
import {
  activateUiLocale,
  bootstrapUiLocale,
  getUiLocale,
  subscribeUiLocale,
  t as translate,
} from "./runtime";
import { loadStoredUiLocale, saveStoredUiLocale } from "./storage";
import type { MessageKey, TVars } from "./types";

type I18nContextValue = {
  locale: AvailableUiLocale;
  setLocale: (locale: AvailableUiLocale) => Promise<void>;
  t: (key: MessageKey | string, vars?: TVars) => string;
  availableLocales: readonly AvailableUiLocale[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

function useLocaleStore(): AvailableUiLocale {
  return useSyncExternalStore(subscribeUiLocale, getUiLocale, () => "en");
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore();

  useEffect(() => {
    const stored = loadStoredUiLocale();
    // Sync path: en catalog always available; fr/es may briefly show EN until import.
    bootstrapUiLocale(stored);
    void activateUiLocale(stored);
  }, []);

  const setLocale = useCallback(async (next: AvailableUiLocale) => {
    saveStoredUiLocale(next);
    await activateUiLocale(next);
  }, []);

  const t = useCallback(
    (key: MessageKey | string, vars?: TVars) => {
      void locale;
      return translate(key, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      availableLocales: AVAILABLE_UI_LOCALES,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
