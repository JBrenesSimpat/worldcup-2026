// Builds data/bracket.json: { [ourMatchId]: { matchNumber, homeLabel, awayLabel } }
// for the 32 knockout matches, using the OFFICIAL FIFA 2026 bracket.
//
// Slot codes:
//   "1A" = winner Group A, "2B" = runner-up Group B
//   "3:C/E/F/H/I" = best third from one of those groups
//   "W73" = winner of match 73, "L101" = loser of match 101
//
// Our matches are mapped to FIFA match numbers via the fixturedownload feed
// (MatchNumber + DateUtc), joined on exact kickoff time.
//
// Run: node scripts/build-bracket.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const FEED = "https://fixturedownload.com/feed/json/fifa-world-cup-2026";

// Official 2026 knockout bracket, by FIFA match number (verified vs Wikipedia).
const SLOTS = {
  // Round of 32
  73: ["2A", "2B"],
  74: ["1E", "3:A/B/C/D/F"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3:C/D/F/G/H"],
  78: ["2E", "2I"],
  79: ["1A", "3:C/E/F/H/I"],
  80: ["1L", "3:E/H/I/J/K"],
  81: ["1D", "3:B/E/F/I/J"],
  82: ["1G", "3:A/E/H/I/J"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3:E/F/G/I/J"],
  86: ["1J", "2H"],
  87: ["1K", "3:D/E/I/J/L"],
  88: ["2D", "2G"],
  // Round of 16
  89: ["W74", "W77"],
  90: ["W73", "W75"],
  91: ["W76", "W78"],
  92: ["W79", "W80"],
  93: ["W83", "W84"],
  94: ["W81", "W82"],
  95: ["W86", "W88"],
  96: ["W85", "W87"],
  // Quarter-finals
  97: ["W89", "W90"],
  98: ["W93", "W94"],
  99: ["W91", "W92"],
  100: ["W95", "W96"],
  // Semi-finals
  101: ["W97", "W98"],
  102: ["W99", "W100"],
  // Third place & Final
  103: ["L101", "L102"],
  104: ["W101", "W102"],
};

const schedule = JSON.parse(
  readFileSync(join(dataDir, "schedule.json"), "utf8"),
);

const feed = await (await fetch(FEED)).json();
// FIFA match number by exact kickoff instant (knockout times are unique).
const numberByEpoch = new Map(
  feed.map((f) => [Date.parse(f.DateUtc.replace(" ", "T")), f.MatchNumber]),
);

const bracket = {};
let mapped = 0;
const missing = [];

for (const m of schedule) {
  if (m.stage === "group") continue;
  const num = numberByEpoch.get(Date.parse(m.datetime));
  const slot = num != null ? SLOTS[num] : undefined;
  if (slot) {
    bracket[m.id] = { matchNumber: num, homeLabel: slot[0], awayLabel: slot[1] };
    mapped += 1;
  } else {
    missing.push(`${m.id} (${m.stage})`);
  }
}

writeFileSync(
  join(dataDir, "bracket.json"),
  JSON.stringify(bracket, null, 2) + "\n",
  "utf8",
);

console.log(`Mapped bracket slots for ${mapped} knockout matches.`);
if (missing.length) console.log("Missing:", missing.join(", "));
