import teamsData from "@/data/teams.json";
import scheduleData from "@/data/schedule.json";
import type { Locale } from "./i18n";
import type { Match, Team } from "./types";

export const teams: Team[] = teamsData as Team[];
export const matches: Match[] = scheduleData as Match[];

const TEAM_BY_CODE = new Map(teams.map((t) => [t.code, t]));

export function teamByCode(code: string | null | undefined): Team | undefined {
  return code ? TEAM_BY_CODE.get(code) : undefined;
}

export function teamName(team: Team, locale: Locale): string {
  return locale === "es" ? team.es : team.en;
}

/** Matches sorted chronologically. */
export function sortedMatches(): Match[] {
  return [...matches].sort(
    (a, b) => Date.parse(a.datetime) - Date.parse(b.datetime),
  );
}

export type Translate = (key: string) => string;

/**
 * Human-friendly text for an undecided knockout slot label.
 *  "1A" → "1.º A" / "1st A"
 *  "W73" → "Ganador M73" / "Winner M73"
 *  "L101" → "Perdedor M101" / "Loser M101"
 */
export function slotLabelText(label: string | undefined, t: Translate): string {
  if (!label) return t("common.tbd");

  const rank = label.match(/^([123])([A-L])$/);
  if (rank) {
    const rankWord = t(`label.rank${rank[1]}`);
    return `${rankWord} ${rank[2]}`;
  }

  const winner = label.match(/^W(\d+)$/);
  if (winner) return `${t("label.winner")} M${winner[1]}`;

  const loser = label.match(/^L(\d+)$/);
  if (loser) return `${t("label.loser")} M${loser[1]}`;

  return label;
}
