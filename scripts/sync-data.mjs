// Syncs real World Cup data from football-data.org into:
//   data/teams.json     (48 teams: code, EN name, ES name, flag, group)
//   data/schedule.json  (all matches: dates, teams, scores, winners, status)
//
// Idempotent: run it any time. Used both for the initial real-data load and
// for the recurring auto-update (commit only happens if files actually change).
//
// Token resolution: env FOOTBALL_DATA_TOKEN, else a FOOTBALL_DATA_TOKEN=...
// line in a local .env.local file.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

function resolveToken() {
  if (process.env.FOOTBALL_DATA_TOKEN) return process.env.FOOTBALL_DATA_TOKEN.trim();
  const envPath = join(__dirname, "..", ".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("FOOTBALL_DATA_TOKEN="));
    if (line) return line.split("=").slice(1).join("=").trim();
  }
  return null;
}

const TOKEN = resolveToken();
if (!TOKEN) {
  console.error("Missing FOOTBALL_DATA_TOKEN (env or .env.local).");
  process.exit(1);
}

// tla -> { flag emoji, Spanish name } for all 48 participants.
const REF = {
  ALG: { flag: "🇩🇿", es: "Argelia" },
  ARG: { flag: "🇦🇷", es: "Argentina" },
  AUS: { flag: "🇦🇺", es: "Australia" },
  AUT: { flag: "🇦🇹", es: "Austria" },
  BEL: { flag: "🇧🇪", es: "Bélgica" },
  BIH: { flag: "🇧🇦", es: "Bosnia y Herzegovina" },
  BRA: { flag: "🇧🇷", es: "Brasil" },
  CAN: { flag: "🇨🇦", es: "Canadá" },
  CIV: { flag: "🇨🇮", es: "Costa de Marfil" },
  COD: { flag: "🇨🇩", es: "RD Congo" },
  COL: { flag: "🇨🇴", es: "Colombia" },
  CPV: { flag: "🇨🇻", es: "Cabo Verde" },
  CRO: { flag: "🇭🇷", es: "Croacia" },
  CUW: { flag: "🇨🇼", es: "Curazao" },
  CZE: { flag: "🇨🇿", es: "Chequia" },
  ECU: { flag: "🇪🇨", es: "Ecuador" },
  EGY: { flag: "🇪🇬", es: "Egipto" },
  ENG: { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", es: "Inglaterra" },
  ESP: { flag: "🇪🇸", es: "España" },
  FRA: { flag: "🇫🇷", es: "Francia" },
  GER: { flag: "🇩🇪", es: "Alemania" },
  GHA: { flag: "🇬🇭", es: "Ghana" },
  HAI: { flag: "🇭🇹", es: "Haití" },
  IRN: { flag: "🇮🇷", es: "Irán" },
  IRQ: { flag: "🇮🇶", es: "Irak" },
  JOR: { flag: "🇯🇴", es: "Jordania" },
  JPN: { flag: "🇯🇵", es: "Japón" },
  KOR: { flag: "🇰🇷", es: "Corea del Sur" },
  KSA: { flag: "🇸🇦", es: "Arabia Saudita" },
  MAR: { flag: "🇲🇦", es: "Marruecos" },
  MEX: { flag: "🇲🇽", es: "México" },
  NED: { flag: "🇳🇱", es: "Países Bajos" },
  NOR: { flag: "🇳🇴", es: "Noruega" },
  NZL: { flag: "🇳🇿", es: "Nueva Zelanda" },
  PAN: { flag: "🇵🇦", es: "Panamá" },
  PAR: { flag: "🇵🇾", es: "Paraguay" },
  POR: { flag: "🇵🇹", es: "Portugal" },
  QAT: { flag: "🇶🇦", es: "Catar" },
  RSA: { flag: "🇿🇦", es: "Sudáfrica" },
  SCO: { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", es: "Escocia" },
  SEN: { flag: "🇸🇳", es: "Senegal" },
  SUI: { flag: "🇨🇭", es: "Suiza" },
  SWE: { flag: "🇸🇪", es: "Suecia" },
  TUN: { flag: "🇹🇳", es: "Túnez" },
  TUR: { flag: "🇹🇷", es: "Turquía" },
  URY: { flag: "🇺🇾", es: "Uruguay" },
  USA: { flag: "🇺🇸", es: "Estados Unidos" },
  UZB: { flag: "🇺🇿", es: "Uzbekistán" },
};

const STAGE_MAP = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
};

function mapStatus(s) {
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  return "scheduled";
}

function mapWinner(w) {
  if (w === "HOME_TEAM") return "home";
  if (w === "AWAY_TEAM") return "away";
  return null;
}

// Penalty-shootout breakdown from a football-data score object, or null when
// the tie wasn't decided on penalties. football-data leaves `score.winner` null
// for shootouts and its standalone `penalties` field is unreliable (it can read
// e.g. 4-4 for a tie that obviously had a winner). The trustworthy figure is
// `fullTime`, which is the aggregate INCLUDING the shootout — so we recover the
// shootout score as fullTime minus the on-pitch (regular + extra time) result,
// and use `penalties` only as a last-resort fallback.
function shootout(score) {
  if (!score || score.duration !== "PENALTY_SHOOTOUT") return null;
  const n = (x) => (Number.isInteger(x) ? x : 0);
  const ft = score.fullTime ?? {};
  const reg = score.regularTime ?? {};
  const et = score.extraTime ?? {};
  // On-pitch result that stands going into the shootout (e.g. "1-1").
  const endHome = n(reg.home) + n(et.home);
  const endAway = n(reg.away) + n(et.away);
  let pHome = n(ft.home) - endHome;
  let pAway = n(ft.away) - endAway;
  if (pHome <= 0 && pAway <= 0 && score.penalties) {
    pHome = n(score.penalties.home);
    pAway = n(score.penalties.away);
  }
  if (pHome === pAway) return null; // no derivable winner — leave undecided
  return {
    endScore: { home: endHome, away: endAway },
    penalties: { home: pHome, away: pAway },
    winner: pHome > pAway ? "home" : "away",
  };
}

function groupLetter(g) {
  return g && g.startsWith("GROUP_") ? g.replace("GROUP_", "") : undefined;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bounded retry for flaky upstreams: worldcup26.ir has intermittent DNS failures
// (EAI_AGAIN) and occasionally returns an empty 200; football-data free tier
// rate-limits. A single transient blip must NOT cost us a whole 30-min poll
// cycle, so we retry in-process instead of waiting for the next scheduled run
// (which is what used to make the Action "need two consecutive runs").
async function fetchJSON(
  url,
  { headers, tries = 3, backoffMs = 800, timeoutMs = 10000 } = {},
) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastErr = e;
      if (attempt < tries) await sleep(backoffMs * attempt);
    }
  }
  throw lastErr;
}

// Hybrid guard: when MATCH_WINDOW_ONLY=1, only hit the API if a match is
// currently in progress (kickoff − 15 min … kickoff + 3 h). Lets the workflow
// poll often but stay a no-op outside actual match times.
function withinMatchWindow() {
  const schedulePath = join(dataDir, "schedule.json");
  if (!existsSync(schedulePath)) return true; // nothing to compare against yet
  const existing = JSON.parse(readFileSync(schedulePath, "utf8"));
  const now = Date.now();
  const PRE = 15 * 60 * 1000;
  const POST = 180 * 60 * 1000;
  return existing.some((m) => {
    const k = Date.parse(m.datetime);
    return now >= k - PRE && now <= k + POST;
  });
}

async function main() {
  if (process.env.MATCH_WINDOW_ONLY === "1" && !withinMatchWindow()) {
    console.log("Outside match window — skipping API call.");
    return;
  }

  // Static venue + bracket maps (committed; used when (re)building from football-data).
  const venuesPath = join(dataDir, "venues.json");
  const venues = existsSync(venuesPath)
    ? JSON.parse(readFileSync(venuesPath, "utf8"))
    : {};
  const bracketPath = join(dataDir, "bracket.json");
  const bracket = existsSync(bracketPath)
    ? JSON.parse(readFileSync(bracketPath, "utf8"))
    : {};

  // football-data only supplies the STRUCTURE (fixtures/teams/dates), which
  // doesn't change mid-tournament. A hiccup there must NOT fail the run — so on
  // any error we reuse the committed structure and still apply live scores.
  let teams;
  let matches;
  try {
    const apiMatches =
      (
        await fetchJSON(
          "https://api.football-data.org/v4/competitions/WC/matches",
          { headers: { "X-Auth-Token": TOKEN } },
        )
      ).matches ?? [];
    if (apiMatches.length === 0) throw new Error("empty response");

    const teamMap = new Map();
    for (const m of apiMatches) {
      if (m.stage !== "GROUP_STAGE") continue;
      for (const tm of [m.homeTeam, m.awayTeam]) {
        // Normalize the TLA (e.g. URU→URY) so codes stay consistent with REF
        // and with the worldcup26 score overlay regardless of which form the
        // API serves — otherwise the team gets a blank flag and its scores
        // never match during overlay.
        const code = tm?.tla ? normCode(tm.tla) : null;
        if (!code || teamMap.has(code)) continue;
        const ref = REF[code] ?? { flag: "🏳️", es: tm.name };
        teamMap.set(code, {
          code,
          en: tm.name,
          es: ref.es,
          flag: ref.flag,
          group: groupLetter(m.group),
        });
      }
    }
    teams = [...teamMap.values()].sort((a, b) =>
      a.group === b.group
        ? a.en.localeCompare(b.en)
        : (a.group ?? "").localeCompare(b.group ?? ""),
    );

    matches = apiMatches
      .map((m) => {
        // For shootouts, show the on-pitch result and carry the penalty score;
        // football-data's `fullTime` aggregate would otherwise read e.g. "4-5".
        const so = shootout(m.score);
        const match = {
          id: `WC-${m.id}`,
          apiId: m.id,
          stage: STAGE_MAP[m.stage] ?? "group",
          datetime: m.utcDate,
          home: m.homeTeam?.tla ? normCode(m.homeTeam.tla) : null,
          away: m.awayTeam?.tla ? normCode(m.awayTeam.tla) : null,
          score: so
            ? { home: so.endScore.home, away: so.endScore.away }
            : {
                home: m.score?.fullTime?.home ?? null,
                away: m.score?.fullTime?.away ?? null,
              },
          winner: so ? so.winner : mapWinner(m.score?.winner),
          status: mapStatus(m.status),
        };
        if (so) match.penalties = so.penalties;
        const g = groupLetter(m.group);
        if (g) match.group = g;
        if (m.matchday && m.stage === "GROUP_STAGE") match.matchday = m.matchday;

        const v = venues[m.id];
        if (v) {
          match.venue = v.venue;
          if (v.city) match.city = v.city;
        }

        const b = bracket[match.id];
        if (b) {
          match.matchNumber = b.matchNumber;
          match.homeLabel = b.homeLabel;
          match.awayLabel = b.awayLabel;
        }
        return match;
      })
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
  } catch (e) {
    console.log(
      `football-data unavailable (${e.message}); reusing committed structure.`,
    );
    const schedulePath0 = join(dataDir, "schedule.json");
    const teamsPath0 = join(dataDir, "teams.json");
    if (!existsSync(schedulePath0) || !existsSync(teamsPath0)) {
      console.error("No committed data to fall back to.");
      process.exit(1);
    }
    matches = JSON.parse(readFileSync(schedulePath0, "utf8"));
    teams = JSON.parse(readFileSync(teamsPath0, "utf8"));
  }

  // Fetch worldcup26 ONCE and reuse it for both scores and top scorers.
  try {
    const wc = await fetchWorldcup();
    const overlaid = overlayScores(matches, wc);
    console.log(`Overlaid scores from worldcup26 on ${overlaid} matches.`);
    const n = buildTopScorers(wc);
    console.log(`Top scorers parsed: ${n} players.`);
  } catch (e) {
    console.log(`worldcup26 unavailable (${e.message}); keeping existing scores.`);
  }

  writeFileSync(
    join(dataDir, "teams.json"),
    JSON.stringify(teams, null, 2) + "\n",
    "utf8",
  );
  writeFileSync(
    join(dataDir, "schedule.json"),
    JSON.stringify(matches, null, 2) + "\n",
    "utf8",
  );

  const byStage = matches.reduce((acc, m) => {
    acc[m.stage] = (acc[m.stage] || 0) + 1;
    return acc;
  }, {});
  const decided = matches.filter((m) => m.status === "finished").length;
  console.log(`Synced ${teams.length} teams, ${matches.length} matches.`);
  console.log("By stage:", byStage);
  console.log(`Finished matches: ${decided}`);
}

// football-data uses "URY" for Uruguay; worldcup26 uses "URU".
const normCode = (c) => (c === "URU" ? "URY" : c);

// worldcup26 local_date is Mexico time (UTC−6) → UTC epoch ms.
function wcEpoch(localDate) {
  const m = String(localDate).match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, MM, DD, YYYY, HH, mm] = m;
  return Date.UTC(+YYYY, +MM - 1, +DD, +HH + 6, +mm);
}

// Returns {status, home, away} from a worldcup26 game, or null if not started.
function wcScore(wc) {
  const hs = parseInt(wc.home_score, 10);
  const as = parseInt(wc.away_score, 10);
  if (!Number.isInteger(hs) || !Number.isInteger(as)) return null;
  const finished = String(wc.finished).toUpperCase() === "TRUE";
  const te = String(wc.time_elapsed || "").toLowerCase();
  if (finished) return { status: "finished", home: hs, away: as };
  if (te && te !== "notstarted") return { status: "live", home: hs, away: as };
  return null; // notstarted → don't overlay the placeholder 0-0
}

// Fetch worldcup26 teams + games ONCE; reused for scores and scorers.
// An empty (but HTTP 200) payload is treated as a failure: returning it would
// otherwise wipe good scores/scorers, so we throw and let the caller keep the
// committed data instead.
async function fetchWorldcup() {
  const wcTeams = (await fetchJSON("https://worldcup26.ir/get/teams")).teams ?? [];
  const wcGames = (await fetchJSON("https://worldcup26.ir/get/games")).games ?? [];
  if (wcTeams.length === 0 || wcGames.length === 0) {
    throw new Error("empty worldcup26 payload");
  }
  const codeByWcId = new Map(wcTeams.map((t) => [t.id, normCode(t.fifa_code)]));
  return { codeByWcId, wcGames };
}

function overlayScores(matches, { codeByWcId, wcGames }) {
  const byCode = new Map();
  const byEpoch = new Map();
  for (const wc of wcGames) {
    const h = codeByWcId.get(wc.home_team_id);
    const a = codeByWcId.get(wc.away_team_id);
    if (h && a) byCode.set(`${h}-${a}`, wc);
    const ep = wcEpoch(wc.local_date);
    if (ep != null) byEpoch.set(ep, wc);
  }

  let count = 0;
  for (const match of matches) {
    let wc =
      match.home && match.away
        ? byCode.get(`${match.home}-${match.away}`)
        : undefined;
    if (!wc) wc = byEpoch.get(Date.parse(match.datetime)); // knockout fallback
    if (!wc) continue;

    const ss = wcScore(wc);
    if (!ss) continue;

    match.score = { home: ss.home, away: ss.away };
    match.status = ss.status;
    // worldcup26 reports only the on-pitch score (no shootout), so a tie reads
    // as no winner. When football-data already gave us a penalty result for
    // this tie, keep it as the tiebreak instead of clobbering it to null.
    match.winner =
      ss.home > ss.away
        ? "home"
        : ss.away > ss.home
          ? "away"
          : match.penalties
            ? match.penalties.home > match.penalties.away
              ? "home"
              : "away"
            : null;
    // Fill knockout teams that football-data hasn't set yet.
    if (!match.home) match.home = codeByWcId.get(wc.home_team_id) ?? null;
    if (!match.away) match.away = codeByWcId.get(wc.away_team_id) ?? null;
    count += 1;
  }
  return count;
}

// --- Top scorers (Golden Boot), parsed from worldcup26.ir scorer strings ---
// Strings look like {"Felix Nmecha 7'","K. Havertz 45'+5'(p)"} — quotes can be
// straight or curly; "(OG)" = own goal (excluded); "(p)" = penalty (counts).
// Dedup key that collapses the two forms worldcup26 emits for one player:
// it lists e.g. "Kylian Mbappé" in one match and "K. Mbappé" in another.
// Keying on team + surname + first initial merges them (both → "fra|k|mbappe")
// while still telling apart different players (different surname/team/initial).
function scorerKey(name, teamCode) {
  const parts = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  const surname = parts[parts.length - 1];
  const initial = parts.length > 1 ? parts[0][0] : "";
  return `${teamCode ?? ""}|${initial}|${surname}`;
}

function addScorers(raw, teamCode, tally) {
  if (!raw || String(raw).toLowerCase() === "null") return;
  const re = /["“”]([^"“”]+)["“”]/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const entry = m[1];
    if (/\(\s*og\s*\)/i.test(entry)) continue; // own goal — doesn't count
    const d = entry.search(/\d/);
    const name = (d > 0 ? entry.slice(0, d) : entry)
      .replace(/['’`]+$/, "")
      .trim();
    if (!name) continue;
    const key = scorerKey(name, teamCode);
    if (!key) continue;
    const cur = tally.get(key);
    if (cur) {
      cur.goals += 1;
      if (name.length > cur.name.length) cur.name = name; // prefer fuller name
    } else {
      tally.set(key, { name, goals: 1, team: teamCode ?? null });
    }
  }
}

function buildTopScorers({ codeByWcId, wcGames }) {
  const tally = new Map();
  for (const g of wcGames) {
    addScorers(g.home_scorers, codeByWcId.get(g.home_team_id), tally);
    addScorers(g.away_scorers, codeByWcId.get(g.away_team_id), tally);
  }
  const list = [...tally.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 30);

  // Never replace a good scorer list with an empty one (belt-and-suspenders on
  // top of the empty-payload guard in fetchWorldcup): keep the committed data.
  const outPath = join(dataDir, "scorers.json");
  if (list.length === 0 && existsSync(outPath)) {
    const prev = JSON.parse(readFileSync(outPath, "utf8"));
    if (Array.isArray(prev) && prev.length > 0) return prev.length;
  }

  writeFileSync(outPath, JSON.stringify(list, null, 2) + "\n", "utf8");
  return list.length;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
