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

function groupLetter(g) {
  return g && g.startsWith("GROUP_") ? g.replace("GROUP_", "") : undefined;
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

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": TOKEN } },
  );
  if (!res.ok) {
    console.error(`API error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  const apiMatches = data.matches ?? [];

  // Static venue map (built by scripts/build-venues.mjs), keyed by API match id.
  const venuesPath = join(dataDir, "venues.json");
  const venues = existsSync(venuesPath)
    ? JSON.parse(readFileSync(venuesPath, "utf8"))
    : {};

  // Official bracket slot labels (built by scripts/build-bracket.mjs), keyed by our match id.
  const bracketPath = join(dataDir, "bracket.json");
  const bracket = existsSync(bracketPath)
    ? JSON.parse(readFileSync(bracketPath, "utf8"))
    : {};

  // --- Teams (from group-stage participants) ---
  const teamMap = new Map();
  for (const m of apiMatches) {
    if (m.stage !== "GROUP_STAGE") continue;
    for (const tm of [m.homeTeam, m.awayTeam]) {
      if (!tm?.tla || teamMap.has(tm.tla)) continue;
      const ref = REF[tm.tla] ?? { flag: "🏳️", es: tm.name };
      teamMap.set(tm.tla, {
        code: tm.tla,
        en: tm.name,
        es: ref.es,
        flag: ref.flag,
        group: groupLetter(m.group),
      });
    }
  }
  const teams = [...teamMap.values()].sort((a, b) =>
    a.group === b.group
      ? a.en.localeCompare(b.en)
      : (a.group ?? "").localeCompare(b.group ?? ""),
  );

  // --- Matches ---
  const matches = apiMatches
    .map((m) => {
      const match = {
        id: `WC-${m.id}`,
        apiId: m.id,
        stage: STAGE_MAP[m.stage] ?? "group",
        datetime: m.utcDate,
        home: m.homeTeam?.tla ?? null,
        away: m.awayTeam?.tla ?? null,
        score: {
          home: m.score?.fullTime?.home ?? null,
          away: m.score?.fullTime?.away ?? null,
        },
        winner: mapWinner(m.score?.winner),
        status: mapStatus(m.status),
      };
      const g = groupLetter(m.group);
      if (g) match.group = g;
      if (m.matchday && m.stage === "GROUP_STAGE") match.matchday = m.matchday;

      const v = venues[m.id];
      if (v) {
        match.venue = v.venue;
        if (v.city) match.city = v.city;
      }

      // Official bracket slot labels for knockout matches (shown until teams are set).
      const b = bracket[match.id];
      if (b) {
        match.matchNumber = b.matchNumber;
        match.homeLabel = b.homeLabel;
        match.awayLabel = b.awayLabel;
      }
      return match;
    })
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

  // Overlay real scores from worldcup26.ir (football-data's free tier doesn't
  // provide them). Keeps football-data structure / ids / venues / bracket intact.
  try {
    const overlaid = await overlayScores(matches);
    console.log(`Overlaid scores from worldcup26 on ${overlaid} matches.`);
  } catch (e) {
    console.log(`worldcup26 overlay skipped: ${e.message}`);
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

async function overlayScores(matches) {
  const teamsRes = await fetch("https://worldcup26.ir/get/teams");
  const wcTeams = (await teamsRes.json()).teams ?? [];
  const codeByWcId = new Map(
    wcTeams.map((t) => [t.id, normCode(t.fifa_code)]),
  );

  const gamesRes = await fetch("https://worldcup26.ir/get/games");
  const wcGames = (await gamesRes.json()).games ?? [];

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
    match.winner =
      ss.home > ss.away ? "home" : ss.away > ss.home ? "away" : null;
    // Fill knockout teams that football-data hasn't set yet.
    if (!match.home) match.home = codeByWcId.get(wc.home_team_id) ?? null;
    if (!match.away) match.away = codeByWcId.get(wc.away_team_id) ?? null;
    count += 1;
  }
  return count;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
