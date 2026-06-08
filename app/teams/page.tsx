"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { sortedMatches, teamByCode, teamName, teams } from "@/lib/data";
import type { Team } from "@/lib/types";
import MatchDayList from "@/components/MatchDayList";
import GroupTable from "@/components/GroupTable";

export default function TeamsPage() {
  const { locale, t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) =>
        teamName(a, locale).localeCompare(teamName(b, locale)),
      ),
    [locale],
  );

  const visibleTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedTeams;
    return sortedTeams.filter((tm) =>
      `${tm.en} ${tm.es} ${tm.code}`.toLowerCase().includes(q),
    );
  }, [sortedTeams, query]);

  const team: Team | undefined = teamByCode(selected);

  const teamMatches = useMemo(() => {
    if (!team) return [];
    return sortedMatches().filter(
      (m) => m.home === team.code || m.away === team.code,
    );
  }, [team]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("teams.title")}</h1>
        <p className="text-sm text-muted">{t("teams.subtitle")}</p>
      </div>

      <input
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("teams.search")}
      />

      {visibleTeams.length === 0 ? (
        <p className="text-sm text-muted">{t("teams.noneFound")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleTeams.map((tm) => {
            const active = tm.code === selected;
            return (
              <button
                key={tm.code}
                type="button"
                onClick={() => setSelected(tm.code)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  active
                    ? "border-pitch bg-emerald-50 text-pitch-dark"
                    : "border-line bg-surface hover:border-pitch/50"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tm.flag}
                </span>
                <span className="truncate">{teamName(tm, locale)}</span>
              </button>
            );
          })}
        </div>
      )}

      {team && (
        <div className="space-y-4 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none" aria-hidden>
              {team.flag}
            </span>
            <div>
              <h2 className="text-2xl font-extrabold leading-tight">
                {teamName(team, locale)}
              </h2>
              <p className="text-sm text-muted">
                {t("common.group")} {team.group}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">
              {t("teams.matches")} · 🕒 {t("common.tzNote")}
            </h3>
            <MatchDayList matches={teamMatches} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">{t("teams.groupTable")}</h3>
            <div className="max-w-md">
              <GroupTable group={team.group} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
