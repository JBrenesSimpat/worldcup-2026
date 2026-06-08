import type { Locale } from "./i18n";

// All match times are displayed in Mexico City time per user preference.
const TZ = "America/Mexico_City";

const BCP47: Record<Locale, string> = {
  es: "es-MX",
  en: "en-US",
};

/** Kickoff time, e.g. "13:00" (24h, Mexico City). */
export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Long date heading, e.g. "jueves, 11 de junio" / "Thursday, June 11". */
export function formatDateHeading(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Mexico-City calendar date key "YYYY-MM-DD" for grouping/comparison. */
export function dayKey(iso: string): string {
  // en-CA yields ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Today's date key in Mexico City time (computed at runtime in the browser). */
export function todayKey(): string {
  return dayKey(new Date().toISOString());
}
