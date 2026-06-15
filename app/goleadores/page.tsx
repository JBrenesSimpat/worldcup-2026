"use client";

import { useI18n } from "@/lib/i18n";
import { teamByCode, teamName } from "@/lib/data";
import scorersData from "@/data/scorers.json";
import type { Scorer } from "@/lib/types";

const scorers = scorersData as Scorer[];

// Medal color for the top 3 ranks.
function rankBadge(i: number): string {
  if (i === 0) return "bg-gold text-amber-900";
  if (i === 1) return "bg-zinc-300 text-zinc-800";
  if (i === 2) return "bg-amber-700 text-amber-50";
  return "bg-line text-muted";
}

export default function ScorersPage() {
  const { locale, t } = useI18n();
  const top = scorers.slice(0, 20);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">⚽ {t("scorers.title")}</h1>
        <p className="text-sm text-muted">{t("scorers.subtitle")}</p>
      </div>

      {top.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
          {t("scorers.empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[0.66rem] uppercase tracking-wide text-muted">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">
                  {t("scorers.player")}
                </th>
                <th className="px-3 py-2 text-right font-semibold">
                  {t("scorers.goals")}
                </th>
              </tr>
            </thead>
            <tbody>
              {top.map((s, i) => {
                const team = teamByCode(s.team);
                return (
                  <tr key={`${s.name}-${i}`} className="border-t border-line">
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${rankBadge(i)}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="mr-1.5" aria-hidden>
                        {team ? team.flag : "🏳️"}
                      </span>
                      <span className="font-semibold">{s.name}</span>
                      {team && (
                        <span className="ml-1.5 text-xs text-muted">
                          {teamName(team, locale)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-lg font-extrabold tabular-nums">
                      {s.goals}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-[0.7rem] text-muted">{t("scorers.note")}</p>
    </div>
  );
}
