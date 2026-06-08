"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { sortedMatches } from "@/lib/data";
import { dayKey, todayKey } from "@/lib/time";
import MatchDayList from "@/components/MatchDayList";

// "Today" depends on the visitor's clock — read it client-side without hydration
// drift: the server renders null, the client fills in the real Mexico-City date.
const NOOP_SUBSCRIBE = () => () => {};

export default function HomePage() {
  const { t } = useI18n();
  const all = useMemo(() => sortedMatches(), []);

  const today = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    () => todayKey(),
    () => null,
  );

  const { heading, list } = useMemo(() => {
    if (!today) return { heading: "today.title", list: [] };

    const todays = all.filter((m) => dayKey(m.datetime) === today);
    if (todays.length > 0) return { heading: "today.title", list: todays };

    // No matches today — show the next day that has matches.
    const nextDay = all.find((m) => dayKey(m.datetime) > today);
    const nextKey = nextDay ? dayKey(nextDay.datetime) : null;
    const upcoming = nextKey
      ? all.filter((m) => dayKey(m.datetime) === nextKey)
      : [];
    return { heading: "today.nextTitle", list: upcoming };
  }, [all, today]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-pitch to-pitch-dark p-8 text-white shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mt-2 max-w-xl text-sm opacity-90 sm:text-base">
          {t("home.heroText")}
        </p>
      </section>

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{t(heading)}</h2>
        <span className="text-xs text-muted">🕒 {t("common.tzNote")}</span>
      </div>

      {today === null ? (
        <p className="text-sm text-muted">…</p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
          {t("today.none")}
        </p>
      ) : (
        <MatchDayList matches={list} />
      )}
    </div>
  );
}
