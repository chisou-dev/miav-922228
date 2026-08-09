"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import type { AvailableUiLocale } from "./locales";

const LOCALE_SHORT: Record<AvailableUiLocale, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
};

/**
 * Compact language control: 🌐 EN ▾ — no flags (language ≠ country).
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t, availableLocales } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Use click (not mousedown) so the toggle click isn't raced closed.
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`lang-switcher ${className}`.trim()}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className="lang-switcher__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("lang.menuAria")}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span aria-hidden="true">🌐</span>
        <span className="lang-switcher__code">{LOCALE_SHORT[locale]}</span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="lang-switcher__list"
          role="listbox"
          aria-label={t("lang.menuAria")}
        >
          {availableLocales.map((code) => (
            <li key={code} role="option" aria-selected={code === locale}>
              <button
                type="button"
                className={
                  code === locale
                    ? "lang-switcher__option is-active"
                    : "lang-switcher__option"
                }
                onClick={() => {
                  void setLocale(code);
                  setOpen(false);
                }}
              >
                {t(`lang.${code}`)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
