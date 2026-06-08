// Renders PWA app icons (PNG) from an inline SVG using sharp.
// Run with: node scripts/gen-icons.mjs

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// Soccer-ball pentagon (centered) and seam lines out to the ball edge.
const cx = 256;
const cy = 222;
const pent = [-90, -18, 54, 126, 198].map((d) => {
  const a = (d * Math.PI) / 180;
  return [cx + 40 * Math.cos(a), cy + 40 * Math.sin(a)];
});
const edge = [-90, -18, 54, 126, 198].map((d) => {
  const a = (d * Math.PI) / 180;
  return [cx + 132 * Math.cos(a), cy + 132 * Math.sin(a)];
});
const pentPath =
  "M" + pent.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + " Z";
const seams = pent
  .map(
    ([px, py], i) =>
      `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${edge[i][0].toFixed(
        1,
      )}" y2="${edge[i][1].toFixed(1)}" stroke="#1a1a1a" stroke-width="9" stroke-linecap="round"/>`,
  )
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a7d52"/>
      <stop offset="1" stop-color="#055f3d"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="132" fill="#ffffff"/>
  ${seams}
  <path d="${pentPath}" fill="#1a1a1a"/>
  <text x="256" y="438" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="#f4c430">2026</text>
</svg>`;

const buf = Buffer.from(svg);

const targets = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 512, name: "maskable-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32, name: "favicon-32.png" },
];

for (const tgt of targets) {
  await sharp(buf)
    .resize(tgt.size, tgt.size)
    .png()
    .toFile(join(outDir, tgt.name));
  console.log(`Wrote public/icons/${tgt.name} (${tgt.size}px)`);
}
