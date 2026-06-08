// Builds data/venues.json: { [apiId]: { venue, city } } by joining our synced
// schedule (football-data) to the official fixture feed (fixturedownload.com),
// which carries the host venue per match. Joined by exact kickoff time, with
// team-name disambiguation for simultaneous group-stage matches.
//
// Run once (and again only if the schedule fixtures change): node scripts/build-venues.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const FEED = "https://fixturedownload.com/feed/json/fifa-world-cup-2026";

// FIFA tournament "City Stadium" names -> real stadium + clean city.
const CITYMAP = {
  "Atlanta Stadium": { venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  "BC Place Vancouver": { venue: "BC Place", city: "Vancouver" },
  "Boston Stadium": { venue: "Gillette Stadium", city: "Boston" },
  "Dallas Stadium": { venue: "AT&T Stadium", city: "Dallas" },
  "Guadalajara Stadium": { venue: "Estadio Akron", city: "Guadalajara" },
  "Houston Stadium": { venue: "NRG Stadium", city: "Houston" },
  "Kansas City Stadium": { venue: "Arrowhead Stadium", city: "Kansas City" },
  "Los Angeles Stadium": { venue: "SoFi Stadium", city: "Los Angeles" },
  "Mexico City Stadium": { venue: "Estadio Azteca", city: "Mexico City" },
  "Miami Stadium": { venue: "Hard Rock Stadium", city: "Miami" },
  "Monterrey Stadium": { venue: "Estadio BBVA", city: "Monterrey" },
  "New York/New Jersey Stadium": {
    venue: "MetLife Stadium",
    city: "New York/New Jersey",
  },
  "Philadelphia Stadium": {
    venue: "Lincoln Financial Field",
    city: "Philadelphia",
  },
  "San Francisco Bay Area Stadium": {
    venue: "Levi's Stadium",
    city: "San Francisco Bay Area",
  },
  "Seattle Stadium": { venue: "Lumen Field", city: "Seattle" },
  "Toronto Stadium": { venue: "BMO Field", city: "Toronto" },
};

const schedule = JSON.parse(
  readFileSync(join(dataDir, "schedule.json"), "utf8"),
);
const teams = JSON.parse(readFileSync(join(dataDir, "teams.json"), "utf8"));
const nameByCode = new Map(teams.map((t) => [t.code, t.en]));

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function tokens(s) {
  return new Set(norm(s).split(" ").filter(Boolean));
}
function overlap(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

const feed = await (await fetch(FEED)).json();

// Group feed entries by exact kickoff instant.
const byEpoch = new Map();
for (const f of feed) {
  const epoch = Date.parse(f.DateUtc.replace(" ", "T"));
  if (!byEpoch.has(epoch)) byEpoch.set(epoch, []);
  byEpoch.get(epoch).push(f);
}

const venues = {};
let matched = 0;
const unmatched = [];

for (const m of schedule) {
  const epoch = Date.parse(m.datetime);
  const cands = byEpoch.get(epoch) || [];
  let chosen;

  const ht = tokens(nameByCode.get(m.home) || "");
  const at = tokens(nameByCode.get(m.away) || "");

  if (cands.length === 1) {
    chosen = cands[0];
  } else if (cands.length > 1) {
    // Simultaneous matches: pick the feed entry whose teams best match ours.
    let best = -1;
    for (const f of cands) {
      const score =
        overlap(tokens(f.HomeTeam), ht) + overlap(tokens(f.AwayTeam), at);
      if (score > best) {
        best = score;
        chosen = f;
      }
    }
  }

  // Fallback: sources sometimes differ by 30–60 min. Match by same UTC day +
  // best team-name overlap (group-stage teams are known).
  if (!chosen && m.home && m.away) {
    const day = m.datetime.slice(0, 10);
    let best = 0;
    for (const f of feed) {
      if (f.DateUtc.slice(0, 10) !== day) continue;
      const score =
        overlap(tokens(f.HomeTeam), ht) + overlap(tokens(f.AwayTeam), at);
      if (score > best) {
        best = score;
        chosen = f;
      }
    }
  }

  if (chosen && m.apiId != null) {
    venues[m.apiId] =
      CITYMAP[chosen.Location] || { venue: chosen.Location, city: "" };
    matched += 1;
  } else {
    unmatched.push(m.id);
  }
}

writeFileSync(
  join(dataDir, "venues.json"),
  JSON.stringify(venues, null, 2) + "\n",
  "utf8",
);

console.log(`Matched venues for ${matched}/${schedule.length} matches.`);
if (unmatched.length) console.log("Unmatched:", unmatched.join(", "));
