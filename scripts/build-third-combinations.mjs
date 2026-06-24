// Builds data/third-place-combinations.json from FIFA's Annex C table:
// the 495 ways the eight best third-placed teams can be drawn into the eight
// Round-of-32 slots that pit a group winner against a third-placed team.
//
// Which third faces which winner depends ONLY on the SET of eight groups whose
// third-placed team qualifies — never on their ranking order. So the table is a
// pure lookup: { <8 sorted group letters> -> <8 group letters in slot order> }.
//
// Slot (opponent) order is fixed by FIFA: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.
//
// Source: Template:2026 FIFA World Cup third-place table (English Wikipedia),
// itself a verbatim copy of Annex C of the tournament regulations.
//
// Run: node scripts/build-third-combinations.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const SOURCE =
  "https://en.wikipedia.org/w/index.php?title=Template:2026_FIFA_World_Cup_third-place_table&action=raw";

// The eight group winners (in table-column order) who face a third-placed team.
const OPPONENT_ORDER = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const wikitext = await (await fetch(SOURCE, {
  headers: { "User-Agent": "worldcup-2026 build script" },
})).text();

// Each row is "! scope=\"row\" | N" followed by table cells spread over one or
// more "| ..." lines (the lone "! rowspan" spacer on row 1 is a header line, so
// skipping "!" lines keeps every row at exactly 12 group + 8 assignment cells).
const lines = wikitext.split("\n");
const combinations = {};
let cells = null;
let parsed = 0;

const flush = () => {
  if (!cells) return;
  if (cells.length !== 20)
    throw new Error(`Row has ${cells.length} cells, expected 20: ${cells}`);

  const groupCells = cells.slice(0, 12);
  const assignCells = cells.slice(12);

  const qualifying = [];
  groupCells.forEach((c, i) => {
    const want = GROUPS[i];
    if (c.includes(want)) qualifying.push(want);
    else if (c.replace(/<!--.*?-->/g, "").trim() !== "")
      throw new Error(`Unexpected group cell ${i} ("${c}"), expected ${want} or blank`);
  });

  const assigned = assignCells.map((c) => {
    const m = c.match(/3\s*([A-L])/);
    if (!m) throw new Error(`Bad assignment cell: "${c}"`);
    return m[1];
  });

  if (qualifying.length !== 8)
    throw new Error(`Row has ${qualifying.length} qualifying groups: ${qualifying}`);
  // The eight assigned thirds must be exactly the eight qualifying groups.
  const key = [...qualifying].sort().join("");
  if ([...assigned].sort().join("") !== key)
    throw new Error(`Assigned groups ${assigned} != qualifying ${qualifying}`);
  if (combinations[key]) throw new Error(`Duplicate combination: ${key}`);

  combinations[key] = assigned.join("");
  parsed += 1;
  cells = null;
};

for (const line of lines) {
  if (/^!\s*scope="row"/.test(line)) {
    flush(); // close the previous row
    cells = [];
    continue;
  }
  if (cells === null) continue;
  if (line.startsWith("!")) continue; // header/spacer cell (rowspan)
  if (line.startsWith("|-") || line.startsWith("|}") || line.startsWith("|+")) {
    continue;
  }
  if (line.startsWith("|")) {
    line
      .replace(/^\|/, "")
      .split("||")
      .forEach((c) => cells.push(c.trim()));
  }
}
flush(); // close the final row

if (parsed !== 495) throw new Error(`Parsed ${parsed} combinations, expected 495.`);

writeFileSync(
  join(dataDir, "third-place-combinations.json"),
  JSON.stringify({ opponentOrder: OPPONENT_ORDER, combinations }, null, 2) + "\n",
  "utf8",
);

console.log(`Wrote ${parsed} third-place combinations.`);
