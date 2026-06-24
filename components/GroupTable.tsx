"use client";

import { useI18n } from "@/lib/i18n";
import { teamName } from "@/lib/data";
import { bestThirdTeamCodes, groupStandings } from "@/lib/standings";
import type { GroupId } from "@/lib/types";

// Qualification styling by position: 1st/2nd advance (green); a 3rd place is
// gold while it can still be a best third, or once confirmed as one.
function posStyles(i: number, thirdQualifies: boolean): { row: string; badge: string } {
  if (i < 2) return { row: "bg-emerald-50/70", badge: "bg-pitch text-white" };
  if (i === 2 && thirdQualifies)
    return { row: "bg-amber-50/70", badge: "bg-gold text-amber-900" };
  return { row: "", badge: "bg-line text-muted" };
}

export default function GroupTable({ group }: { group: GroupId }) {
  const { locale, t } = useI18n();
  const rows = groupStandings(group);
  // Once the best eight thirds are decided, only the qualifiers stay gold;
  // until then every third place is still a candidate.
  const qualifiedThirds = bestThirdTeamCodes();
  const thirdsDecided = qualifiedThirds.size > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h3 className="bg-emerald-50 px-4 py-2.5 text-sm font-bold text-pitch-dark">
        {t("common.group")} {group}
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[0.66rem] uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-left font-semibold">
              {t("standings.team")}
            </th>
            <th className="px-2 py-2 font-semibold">{t("standings.p")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.w")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.d")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.l")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.gd")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.pts")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const thirdQualifies =
              !thirdsDecided || qualifiedThirds.has(s.team.code);
            const styles = posStyles(i, thirdQualifies);
            return (
              <tr key={s.team.code} className={`border-t border-line ${styles.row}`}>
                <td className="px-3 py-2 text-left">
                  <span
                    className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${styles.badge}`}
                  >
                    {i + 1}
                  </span>
                  <span className="mr-1.5" aria-hidden>
                    {s.team.flag}
                  </span>
                  {teamName(s.team, locale)}
                </td>
                <td className="px-2 py-2 text-center text-muted">{s.played}</td>
                <td className="px-2 py-2 text-center">{s.won}</td>
                <td className="px-2 py-2 text-center">{s.drawn}</td>
                <td className="px-2 py-2 text-center">{s.lost}</td>
                <td className="px-2 py-2 text-center">
                  {s.gd > 0 ? `+${s.gd}` : s.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
