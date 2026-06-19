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

/**
 * Break a tie (teams equal on points, overall GD and overall GF) using the
 * official head-to-head criteria: points, then GD, then goals scored in the
 * matches played among only the tied teams. Alphabetical as last resort
 * (fair-play points aren't available from the data source).
 */
function headToHead(cluster: Standing[], group: GroupId): Standing[] {
  const codes = new Set(cluster.map((s) => s.team.code));
  const h = new Map(
    cluster.map((s) => [s.team.code, { pts: 0, gd: 0, gf: 0 }]),
  );

  matches
    .filter(
      (m) =>
        m.stage === "group" &&
        m.group === group &&
        isFinished(m) &&
        m.home != null &&
        m.away != null &&
        codes.has(m.home) &&
        codes.has(m.away),
    )
    .forEach((m) => {
      const hh = h.get(m.home as string)!;
      const aa = h.get(m.away as string)!;
      const hs = m.score.home as number;
      const as = m.score.away as number;
      hh.gf += hs;
      hh.gd += hs - as;
      aa.gf += as;
      aa.gd += as - hs;
      if (hs > as) hh.pts += 3;
      else if (as > hs) aa.pts += 3;
      else {
        hh.pts += 1;
        aa.pts += 1;
      }
    });

  return [...cluster].sort((x, y) => {
    const hx = h.get(x.team.code)!;
    const hy = h.get(y.team.code)!;
    return (
      hy.pts - hx.pts ||
      hy.gd - hx.gd ||
      hy.gf - hx.gf ||
      x.team.code.localeCompare(y.team.code)
    );
  });
}

/** Compute the standings for one group (official tiebreakers applied). */
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

  // 1) Overall: points → goal difference → goals scored.
  const ranked = [...table.values()].sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );

  // 2) Resolve teams still tied (equal points, GD and GF) by head-to-head.
  const result: Standing[] = [];
  let i = 0;
  while (i < ranked.length) {
    let j = i + 1;
    while (
      j < ranked.length &&
      ranked[j].points === ranked[i].points &&
      ranked[j].gd === ranked[i].gd &&
      ranked[j].gf === ranked[i].gf
    ) {
      j += 1;
    }
    const cluster = ranked.slice(i, j);
    if (cluster.length > 1) result.push(...headToHead(cluster, group));
    else result.push(cluster[0]);
    i = j;
  }

  return result;
}

export const GROUP_IDS: GroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

/**
 * Positions that are MATHEMATICALLY locked (can't change no matter the
 * remaining results), by points alone — conservative, so it never pins wrong
 * (it ignores tiebreakers, only locking when points make it certain).
 * Returns a map like { "1A": "MEX", "2B": "CAN" }.
 */
export function clinchedSlots(): Record<string, string> {
  const result: Record<string, string> = {};

  for (const G of GROUP_IDS) {
    const codes = teams.filter((t) => t.group === G).map((t) => t.code);
    const st: Record<string, { pts: number; rem: number }> = {};
    codes.forEach((c) => (st[c] = { pts: 0, rem: 0 }));

    for (const m of matches) {
      if (m.stage !== "group" || m.group !== G) continue;
      const home = m.home && st[m.home] ? st[m.home] : null;
      const away = m.away && st[m.away] ? st[m.away] : null;
      if (!home || !away) continue;
      if (isFinished(m)) {
        const h = m.score.home as number;
        const a = m.score.away as number;
        if (h > a) home.pts += 3;
        else if (a > h) away.pts += 3;
        else {
          home.pts += 1;
          away.pts += 1;
        }
      } else {
        home.rem += 1;
        away.rem += 1;
      }
    }

    const arr = codes.map((c) => ({ c, ...st[c] }));
    for (const x of arr) {
      const others = arr.filter((y) => y.c !== x.c);
      // Clinched 1st: more points than every rival's maximum possible.
      if (others.every((y) => x.pts > y.pts + 3 * y.rem)) {
        result[`1${G}`] = x.c;
        continue;
      }
      // Clinched exactly 2nd: exactly one rival is sure to finish above, and
      // no other rival can even reach this team's current points.
      const sureAbove = others.filter((y) => y.pts > x.pts + 3 * x.rem).length;
      const canReach = others.filter((y) => y.pts + 3 * y.rem >= x.pts).length;
      if (sureAbove === 1 && canReach === 1) result[`2${G}`] = x.c;
    }
  }

  return result;
}
