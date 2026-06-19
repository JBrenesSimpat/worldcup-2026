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

type H2H = { pts: number; gd: number; gf: number };

/** Head-to-head stats among a set of team codes, from finished matches between them. */
function h2hStats(codes: string[], group: GroupId): Record<string, H2H> {
  const set = new Set(codes);
  const h: Record<string, H2H> = {};
  codes.forEach((c) => (h[c] = { pts: 0, gd: 0, gf: 0 }));

  for (const m of matches) {
    if (m.stage !== "group" || m.group !== group || !isFinished(m)) continue;
    if (!m.home || !m.away || !set.has(m.home) || !set.has(m.away)) continue;
    const hs = m.score.home as number;
    const as = m.score.away as number;
    h[m.home].gf += hs;
    h[m.home].gd += hs - as;
    h[m.away].gf += as;
    h[m.away].gd += as - hs;
    if (hs > as) h[m.home].pts += 3;
    else if (as > hs) h[m.away].pts += 3;
    else {
      h[m.home].pts += 1;
      h[m.away].pts += 1;
    }
  }
  return h;
}

/**
 * Group standings using the OFFICIAL 2026 World Cup tiebreaker order:
 * 1) points, then among teams level on points: 2) head-to-head points,
 * 3) head-to-head goal difference, 4) head-to-head goals, then 5) overall
 * goal difference, 6) overall goals. (Fair play / FIFA ranking omitted —
 * no data — falling back to team code.)
 */
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

  const rows = [...table.values()].sort((a, b) => b.points - a.points);

  // Resolve teams level on points via head-to-head, then overall GD/GF.
  const result: Standing[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && rows[j].points === rows[i].points) j += 1;
    const cluster = rows.slice(i, j);
    if (cluster.length > 1) {
      const h = h2hStats(cluster.map((s) => s.team.code), group);
      cluster.sort((a, b) => {
        const ha = h[a.team.code];
        const hb = h[b.team.code];
        return (
          hb.pts - ha.pts ||
          hb.gd - ha.gd ||
          hb.gf - ha.gf ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.team.code.localeCompare(b.team.code)
        );
      });
    }
    result.push(...cluster);
    i = j;
  }
  return result;
}

export const GROUP_IDS: GroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

/**
 * Group positions that are MATHEMATICALLY locked, using the 2026 tiebreakers
 * (head-to-head first). Conservative — never pins wrong. Returns e.g. { "1A": "MEX" }.
 */
let clinchedMemo: Record<string, string> | null = null;

export function clinchedSlots(): Record<string, string> {
  if (clinchedMemo) return clinchedMemo;
  const result: Record<string, string> = {};

  for (const G of GROUP_IDS) {
    const codes = teams.filter((t) => t.group === G).map((t) => t.code);
    const pts: Record<string, number> = {};
    const rem: Record<string, number> = {};
    codes.forEach((c) => {
      pts[c] = 0;
      rem[c] = 0;
    });

    const gm = matches.filter((m) => m.stage === "group" && m.group === G);
    for (const m of gm) {
      if (!m.home || !m.away || pts[m.home] === undefined || pts[m.away] === undefined)
        continue;
      if (isFinished(m)) {
        const h = m.score.home as number;
        const a = m.score.away as number;
        if (h > a) pts[m.home] += 3;
        else if (a > h) pts[m.away] += 3;
        else {
          pts[m.home] += 1;
          pts[m.away] += 1;
        }
      } else {
        rem[m.home] += 1;
        rem[m.away] += 1;
      }
    }

    const pendingBetween = (x: string, y: string) =>
      gm.some(
        (m) =>
          !isFinished(m) &&
          ((m.home === x && m.away === y) || (m.home === y && m.away === x)),
      );

    // >0 if x is ahead of y on their already-played head-to-head.
    const h2hCompare = (x: string, y: string) => {
      const h = h2hStats([x, y], G);
      return h[x].pts - h[y].pts || h[x].gd - h[y].gd || h[x].gf - h[y].gf;
    };

    for (const T of codes) {
      const rivals = codes.filter((c) => c !== T);
      // T is guaranteed above R if R can't out-point T, or — on a possible
      // points tie — their head-to-head is settled in T's favour.
      const guaranteedAbove = (R: string) => {
        const rMax = pts[R] + 3 * rem[R];
        if (rMax < pts[T]) return true;
        if (rMax === pts[T] && !pendingBetween(T, R) && h2hCompare(T, R) > 0)
          return true;
        return false;
      };

      if (rivals.every(guaranteedAbove)) {
        result[`1${G}`] = T;
        continue;
      }

      // Conservative exactly-2nd (points only — never wrong).
      const sureAbove = rivals.filter((R) => pts[R] > pts[T] + 3 * rem[T]).length;
      const canReach = rivals.filter((R) => pts[R] + 3 * rem[R] >= pts[T]).length;
      if (sureAbove === 1 && canReach === 1) result[`2${G}`] = T;
    }
  }

  clinchedMemo = result;
  return result;
}
