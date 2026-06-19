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

/** The main bracket rounds (R32 → Final), in display order. */
export function bracketRounds(): BracketRound[] {
  const clinched = clinchedSlots();
  return KNOCKOUT_ORDER.map((stage) => ({
    stage,
    matches: matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
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
