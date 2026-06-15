// Core data model for the World Cup 2026 app.

export type GroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Stage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Team {
  /** FIFA 3-letter code, e.g. "MEX". Used as the stable id. */
  code: string;
  /** English display name. */
  en: string;
  /** Spanish display name. */
  es: string;
  /** Flag emoji. */
  flag: string;
  /** Group A–L. */
  group: GroupId;
}

export interface MatchScore {
  home: number | null;
  away: number | null;
}

export interface Scorer {
  /** Player display name. */
  name: string;
  /** Goals scored (own goals excluded). */
  goals: number;
  /** Team code, or null if unmapped. */
  team: string | null;
}

export interface Match {
  /** Stable match id, e.g. "WC-537327". */
  id: string;
  /** football-data.org numeric match id (for incremental updates). */
  apiId?: number;
  /** Official FIFA match number (1–104), for bracket slot references. */
  matchNumber?: number;
  stage: Stage;
  /** Present only for group-stage matches. */
  group?: GroupId;
  /** Group-stage matchday 1–3. */
  matchday?: number;
  /** ISO 8601 timestamp (UTC). Displayed in Mexico City time. */
  datetime: string;
  /** Optional venue/city — not provided by the free data tier. */
  venue?: string;
  city?: string;
  /** Team code, or null when the slot is not yet decided (knockout). */
  home: string | null;
  away: string | null;
  /** Placeholder label when the team is undecided, e.g. "1A", "W73". */
  homeLabel?: string;
  awayLabel?: string;
  score: MatchScore;
  /** Decided winner side (covers extra-time/penalties), when known. */
  winner?: "home" | "away" | null;
  status: MatchStatus;
}
