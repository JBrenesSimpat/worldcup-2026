import { matches } from "./data";
import { clinchedSlots } from "./standings";
import type { Match, Stage } from "./types";

export interface ResolvedSlot {
  /** Resolved team code, if known (filled by the API once decided). */
  code: string | null;
  /** Official bracket label while undecided (e.g. "1A", "3:C/E/F/H/I", "W73"). */
  label?: string;
  /** True when the team is shown because its group position is mathematically clinched. */
  projected?: boolean;
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

function isFinished(m: Match): boolean {
  return (
    m.status === "finished" &&
    m.score.home !== null &&
    m.score.away !== null
  );
}

/**
 * Feeder match numbers for a knockout tie, parsed from its raw "W##" slot
 * labels (e.g. R16 match 89 → [74, 77]). The labels are baked into the
 * schedule by the bracket build and persist even after the teams are decided,
 * so this is a stable description of which earlier ties flow into this one.
 * R32 ties have group-position labels (no "W##"), so they return [].
 */
export function feederMatchNumbers(m: Match): number[] {
  const nums: number[] = [];
  for (const label of [m.homeLabel, m.awayLabel]) {
    const hit = label?.match(/^W(\d+)$/);
    if (hit) nums.push(Number(hit[1]));
  }
  return nums;
}

/** Winner team code of a knockout match, or null if not yet decided. */
export function winnerOf(m: Match | undefined): string | null {
  if (!m || !isFinished(m) || !m.home || !m.away) return null;
  // Prefer the explicit winner (covers extra time / penalties).
  if (m.winner === "home") return m.home;
  if (m.winner === "away") return m.away;
  if ((m.score.home as number) > (m.score.away as number)) return m.home;
  if ((m.score.away as number) > (m.score.home as number)) return m.away;
  return null; // even score with no shootout data — undecided
}

/** Loser team code of a knockout match (feeds the third-place play-off), or null. */
export function loserOf(m: Match | undefined): string | null {
  const w = winnerOf(m);
  if (!m || !w) return null;
  return m.home === w ? m.away : m.away === w ? m.home : null;
}

/**
 * Knockout slots already decided by a played tie, keyed by the "W##"/"L##"
 * label the next round uses to reference it — e.g. once match 73 is won,
 * { "W73": "CAN" }; "L101"/"L102" feed the third-place play-off. This lets a
 * winner flow into its successor tie the moment the result is in, instead of
 * waiting for the upstream feed to assign the team to the next fixture (which
 * lags). Mirrors `clinchedSlots()` for group positions — both supply
 * `resolveSlot`'s "projected" path.
 */
let advancedMemo: Record<string, string> | null = null;
export function advancedSlots(): Record<string, string> {
  if (advancedMemo) return advancedMemo;
  const result: Record<string, string> = {};
  for (const m of matches) {
    if (m.matchNumber == null) continue;
    const w = winnerOf(m);
    if (w) result[`W${m.matchNumber}`] = w;
    const l = loserOf(m);
    if (l) result[`L${m.matchNumber}`] = l;
  }
  advancedMemo = result;
  return result;
}

/**
 * Every undecided knockout slot we can fill early: mathematically clinched
 * group positions plus winners/losers of ties already played. Shared by the
 * bracket and the schedule so one result propagates to both views at once.
 */
export function projectedSlots(): Record<string, string> {
  return { ...clinchedSlots(), ...advancedSlots() };
}

/**
 * Resolve a slot to a team if the API has filled it in; otherwise keep the
 * official bracket label for display. The API is the source of truth for who
 * advances, so no self-computation is needed.
 */
export function resolveSlot(
  code: string | null,
  label: string | undefined,
  clinched: Record<string, string> = {},
): ResolvedSlot {
  if (code) return { code };
  // Mathematically locked group position → show the team early (projected).
  if (label && clinched[label]) return { code: clinched[label], label, projected: true };
  return { code: null, label };
}

function toBracketMatch(m: Match, clinched: Record<string, string>): BracketMatch {
  return {
    match: m,
    home: resolveSlot(m.home, m.homeLabel, clinched),
    away: resolveSlot(m.away, m.awayLabel, clinched),
    winnerCode: winnerOf(m),
  };
}

const KNOCKOUT_ORDER: Stage[] = ["r32", "r16", "qf", "sf", "final"];

/**
 * Vertical display order for every knockout tie, keyed by match id.
 *
 * A depth-first walk from the final, descending the home feeder before the
 * away feeder, lays the bracket out as a tree: within each round the ties come
 * out top-to-bottom so that the two ties feeding a successor are always
 * adjacent and sit directly across from it. This is what lets the connector
 * lines stay clean (no crossings). Ordering by kickoff time would not.
 */
function treeOrder(): Map<string, number> {
  const byNumber = new Map<number, Match>();
  for (const m of matches) {
    if (m.matchNumber != null) byNumber.set(m.matchNumber, m);
  }
  const order = new Map<string, number>();
  let seq = 0;
  const visit = (m: Match | undefined) => {
    if (!m || order.has(m.id)) return;
    order.set(m.id, seq++);
    for (const feeder of feederMatchNumbers(m)) visit(byNumber.get(feeder));
  };
  visit(matches.find((m) => m.stage === "final"));
  return order;
}

/** The main bracket rounds (R32 → Final), in display order. */
export function bracketRounds(): BracketRound[] {
  const clinched = projectedSlots();
  const order = treeOrder();
  const rank = (m: Match) => order.get(m.id) ?? Number.MAX_SAFE_INTEGER;
  return KNOCKOUT_ORDER.map((stage) => ({
    stage,
    matches: matches
      .filter((m) => m.stage === stage)
      // Bracket-tree order; fall back to kickoff time if the wiring is absent.
      .sort(
        (a, b) =>
          rank(a) - rank(b) || Date.parse(a.datetime) - Date.parse(b.datetime),
      )
      .map((m) => toBracketMatch(m, clinched)),
  }));
}

/** The third-place play-off, if present. */
export function thirdPlaceMatch(): BracketMatch | null {
  const m = matches.find((x) => x.stage === "third");
  return m ? toBracketMatch(m, {}) : null;
}

/** Champion team code, once the final is decided. */
export function championCode(): string | null {
  const final = matches.find((m) => m.stage === "final");
  return winnerOf(final);
}
