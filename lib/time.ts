import type { Locale } from "./i18n";

// Default reference zone (Mexico City — no DST in summer 2026).
export const MEXICO_TZ = "America/Mexico_City";

const BCP47: Record<Locale, string> = {
  es: "es-MX",
  en: "en-US",
};

/** Kickoff time, e.g. "13:00" (24h) in the given timezone. */
export function formatTime(iso: string, locale: Locale, tz = MEXICO_TZ): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(new Date(iso));
}

/** Long date heading, e.g. "jueves, 11 de junio" / "Thursday, June 11". */
export function formatDateHeading(
  iso: string,
  locale: Locale,
  tz = MEXICO_TZ,
): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(new Date(iso));
}

/** Calendar date key "YYYY-MM-DD" in the given timezone (for grouping). */
export function dayKey(iso: string, tz = MEXICO_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

/** Today's date key in the given timezone (runtime). */
export function todayKey(tz = MEXICO_TZ): string {
  return dayKey(new Date().toISOString(), tz);
}
