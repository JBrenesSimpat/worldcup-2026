"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import es from "@/locales/es.json";
import en from "@/locales/en.json";

export type Locale = "es" | "en";

const DICTS: Record<Locale, Record<string, unknown>> = { es, en };
const DEFAULT_LOCALE: Locale = "es";
const STORAGE_KEY = "wc2026-locale";

// --- Tiny external store for the chosen locale (SSR-safe, no effect setState) ---
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "es" || saved === "en") return saved;
  const browser = navigator.language?.toLowerCase() ?? "";
  return browser.startsWith("en") ? "en" : "es";
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function persistLocale(l: Locale) {
  window.localStorage.setItem(STORAGE_KEY, l);
  listeners.forEach((cb) => cb());
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Resolve a dotted key like "nav.today" against a nested dictionary. */
function lookup(dict: Record<string, unknown>, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Keep <html lang> in sync (updating an external system — allowed in effects).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => persistLocale(l);
  const t = (key: string) => lookup(DICTS[locale], key);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
