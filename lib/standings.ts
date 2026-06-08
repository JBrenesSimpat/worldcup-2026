import { matches, teams } from "./data";
import type { GroupId, Match, Team } from "./types";

export interface Standing {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

function blank(team: Team): Standing {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function applyResult(s: Standing, scored: number, conceded: number) {
  s.played += 1;
  s.gf += scored;
  s.ga += conceded;
  s.gd = s.gf - s.ga;
  if (scored > conceded) {
    s.won += 1;
    s.points += 3;
  } else if (scored === conceded) {
    s.drawn += 1;
    s.points += 1;
  } else {
    s.lost += 1;
  }
}

function isFinished(m: Match): boolean {
  return (
    m.status === "finished" &&
    m.score.home !== null &&
    m.score.away !== null
  );
}

/** Compute the standings table for one group from finished matches. */
export function groupStandings(group: GroupId): Standing[] {
  const table = new Map<string, Standing>();
  teams
    .filter((t) => t.group === group)
    .forEach((t) => table.set(t.code, blank(t)));

  matches
    .filter((m) => m.stage === "group" && m.group === group && isFinished(m))
    .forEach((m) => {
      const home = table.get(m.home as string);
      const away = table.get(m.away as string);
      if (!home || !away) return;
      applyResult(home, m.score.home as number, m.score.away as number);
      applyResult(away, m.score.away as number, m.score.home as number);
    });

  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.code.localeCompare(b.team.code),
  );
}

export const GROUP_IDS: GroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];
