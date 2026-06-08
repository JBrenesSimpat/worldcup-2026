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
      return match;
    })
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
