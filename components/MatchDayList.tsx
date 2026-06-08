"use client";

import { useI18n } from "@/lib/i18n";
import { dayKey, formatDateHeading } from "@/lib/time";
import type { Match } from "@/lib/types";
import MatchCard from "./MatchCard";

export default function MatchDayList({ matches }: { matches: Match[] }) {
  const { locale, t } = useI18n();

  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
        {t("schedule.empty")}
      </p>
    );
  }

  // Group matches by their Mexico-City calendar day, preserving order.
  const days: { key: string; matches: Match[] }[] = [];
  for (const m of matches) {
    const key = dayKey(m.datetime);
    let bucket = days.find((d) => d.key === key);
    if (!bucket) {
      bucket = { key, matches: [] };
      days.push(bucket);
    }
    bucket.matches.push(m);
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.key}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            {formatDateHeading(day.matches[0].datetime, locale)}
          </h2>
          <div className="space-y-2.5">
            {day.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
