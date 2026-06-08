import { matches } from "./data";
import { groupStandings } from "./standings";
import type { GroupId, Match, Stage } from "./types";

export interface ResolvedSlot {
  /** Resolved team code, if known. */
  code: string | null;
  /** Original placeholder label when still undecided (e.g. "1A", "W73"). */
  label?: string;
}

export interface BracketMatch {
  match: Match;
  home: ResolvedSlot;
  away: ResolvedSlot;
  winnerCode: string | null;
}

export interface BracketRound {
  stage: Stage;
  matches: BracketMatch[];
}

const MATCH_BY_ID = new Map(matches.map((m) => [m.id, m]));

function isFinished(m: Match): boolean {
  return (
    m.status === "finished" &&
    m.score.home !== null &&
    m.score.away !== null
  );
}

/** A group is "complete" once all 6 of its group-stage matches are finished. */
function groupComplete(group: GroupId): boolean {
  const gm = matches.filter((m) => m.stage === "group" && m.group === group);
  return gm.length === 6 && gm.every(isFinished);
}

/** Winner team code of a knockout match, or null if not yet decided. */
export function winnerOf(m: Match | undefined): string | null {
  if (!m || !isFinished(m)) return null;
  const home = resolveSlot(m.home, m.homeLabel).code;
  const away = resolveSlot(m.away, m.awayLabel).code;
  if (!home || !away) return null;
  // Prefer the explicit winner (covers extra time / penalties).
  if (m.winner === "home") return home;
  if (m.winner === "away") return away;
  if ((m.score.home as number) > (m.score.away as number)) return home;
  if ((m.score.away as number) > (m.score.home as number)) return away;
  return null; // even score with no shootout data — undecided
}

function loserOf(m: Match | undefined): string | null {
  if (!m || !isFinished(m)) return null;
  const home = resolveSlot(m.home, m.homeLabel).code;
  const away = resolveSlot(m.away, m.awayLabel).code;
  const w = winnerOf(m);
  if (!w || !home || !away) return null;
  return w === home ? away : home;
}

/** Resolve a slot (a team code, or a placeholder label) into a team if possible. */
export function resolveSlot(
  code: string | null,
  label: string | undefined,
): ResolvedSlot {
  if (code) return { code };
  if (!label) return { code: null };

  // Group position: "1A" / "2B" — resolvable once the group is complete.
  const pos = label.match(/^([12])([A-L])$/);
  if (pos) {
    const group = pos[2] as GroupId;
    if (groupComplete(group)) {
      const standings = groupStandings(group);
      const idx = Number(pos[1]) - 1;
      return { code: standings[idx]?.team.code ?? null, label };
    }
    return { code: null, label };
  }

  // Winner / loser of a previous match.
  const win = label.match(/^W(\d+)$/);
  if (win) {
    const code = winnerOf(MATCH_BY_ID.get(`M${win[1]}`));
    return { code, label };
  }
  const lose = label.match(/^L(\d+)$/);
  if (lose) {
    const code = loserOf(MATCH_BY_ID.get(`M${lose[1]}`));
    return { code, label };
  }

  // Best-third slots ("3C") aren't resolvable from our placeholder data.
  return { code: null, label };
}

function toBracketMatch(m: Match): BracketMatch {
  return {
    match: m,
    home: resolveSlot(m.home, m.homeLabel),
    away: resolveSlot(m.away, m.awayLabel),
    winnerCode: winnerOf(m),
  };
}

const KNOCKOUT_ORDER: Stage[] = ["r32", "r16", "qf", "sf", "final"];

/** The main bracket rounds (R32 → Final), in display order. */
export function bracketRounds(): BracketRound[] {
  return KNOCKOUT_ORDER.map((stage) => ({
    stage,
    matches: matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
      .map(toBracketMatch),
  }));
}

/** The third-place play-off, if present. */
export function thirdPlaceMatch(): BracketMatch | null {
  const m = matches.find((x) => x.stage === "third");
  return m ? toBracketMatch(m) : null;
}

/** Champion team code, once the final is decided. */
export function championCode(): string | null {
  const final = matches.find((m) => m.stage === "final");
  return winnerOf(final);
}
