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
 * Human-friendly text for an undecided knockout slot label (official bracket).
 *  "1A"            → "1.º Grupo A" / "1st Group A"
 *  "2B"            → "2.º Grupo B" / "2nd Group B"
 *  "3:C/E/F/H/I"   → "3.º (C/E/F/H/I)" / "3rd (C/E/F/H/I)"
 *  "W73"           → "Ganador P73" / "Winner M73"
 *  "L101"          → "Perdedor P101" / "Loser M101"
 */
export function slotLabelText(label: string | undefined, t: Translate): string {
  if (!label) return t("common.tbd");

  // Best-third slot with candidate groups, e.g. "3:C/E/F/H/I".
  const third = label.match(/^3:(.+)$/);
  if (third) return `${t("label.rank3")} (${third[1]})`;

  // Group winner / runner-up, e.g. "1A", "2B".
  const rank = label.match(/^([12])([A-L])$/);
  if (rank) {
    return `${t(`label.rank${rank[1]}`)} ${t("common.group")} ${rank[2]}`;
  }

  const winner = label.match(/^W(\d+)$/);
  if (winner) return `${t("label.winner")} ${t("label.matchAbbr")}${winner[1]}`;

  const loser = label.match(/^L(\d+)$/);
  if (loser) return `${t("label.loser")} ${t("label.matchAbbr")}${loser[1]}`;

  return label;
}

/** Compact group-position label for a clinched slot: "1A" → "1.º A" / "1st A". */
export function positionLabel(label: string | undefined, t: Translate): string {
  if (!label) return "";
  const m = label.match(/^([12])([A-L])$/);
  return m ? `${t(`label.rank${m[1]}`)} ${m[2]}` : "";
}
