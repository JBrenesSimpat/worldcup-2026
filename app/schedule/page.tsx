"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { sortedMatches, teamByCode, teamName, teams } from "@/lib/data";
import { GROUP_IDS } from "@/lib/standings";
import type { Match, Stage } from "@/lib/types";
import MatchDayList from "@/components/MatchDayList";

const STAGES: Stage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export default function SchedulePage() {
  const { locale, t } = useI18n();
  const all = useMemo(() => sortedMatches(), []);

  const [group, setGroup] = useState("");
  const [team, setTeam] = useState("");
  const [stage, setStage] = useState("");
  const [query, setQuery] = useState("");

  const teamOptions = useMemo(
    () =>
      [...teams].sort((a, b) =>
        teamName(a, locale).localeCompare(teamName(b, locale)),
      ),
    [locale],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((m: Match) => {
      if (group && m.group !== group) return false;
      if (stage && m.stage !== stage) return false;
      if (team && m.home !== team && m.away !== team) return false;
      if (q) {
        const home = teamByCode(m.home);
        const away = teamByCode(m.away);
        const haystack = [
          home?.en,
          home?.es,
          away?.en,
          away?.es,
          m.venue,
          m.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [all, group, stage, team, query]);

  const selectClass =
    "rounded-xl border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("schedule.title")}</h1>
        <p className="text-sm text-muted">
          {t("schedule.subtitle")} · 🕒 {t("common.tzNote")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          aria-label={t("filters.allGroups")}
        >
          <option value="">{t("filters.allGroups")}</option>
          {GROUP_IDS.map((g) => (
            <option key={g} value={g}>
              {t("common.group")} {g}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          aria-label={t("filters.allTeams")}
        >
          <option value="">{t("filters.allTeams")}</option>
          {teamOptions.map((tm) => (
            <option key={tm.code} value={tm.code}>
              {tm.flag} {teamName(tm, locale)}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label={t("filters.allStages")}
        >
          <option value="">{t("filters.allStages")}</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {t(`stage.${s}`)}
            </option>
          ))}
        </select>

        <input
          className={`${selectClass} flex-1 min-w-[160px]`}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("filters.search")}
        />
      </div>

      <MatchDayList matches={filtered} />
    </div>
  );
}
