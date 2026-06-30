"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { slotLabelText, teamByCode, teamName } from "@/lib/data";
import {
  bracketRounds,
  championCode,
  feederMatchNumbers,
  thirdPlaceMatch,
  type BracketMatch,
  type ResolvedSlot,
} from "@/lib/bracket";

function SlotRow({
  slot,
  score,
  pens,
  isWinner,
  showOrigin,
}: {
  slot: ResolvedSlot;
  score: number | null;
  /** Penalty-shootout goals for this side, when the tie went to penalties. */
  pens: number | null;
  isWinner: boolean;
  /** Show the team's group-position origin badge (Round of 32 only). */
  showOrigin: boolean;
}) {
  const { locale, t } = useI18n();
  const team = teamByCode(slot.code);
  const name = team ? teamName(team, locale) : slotLabelText(slot.label, t);
  // Compact origin badge ("1A"/"2B"/"3C"): winner/runner-up slot labels are
  // already in that form; a best-third label ("3:C/E/F/H/I") collapses to "3"
  // plus the team's own group. Only annotates a resolved team.
  const badge = !team
    ? ""
    : slot.label?.startsWith("3:")
      ? `3${team.group}`
      : slot.label && /^[12][A-L]$/.test(slot.label)
        ? slot.label
        : "";

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${
        isWinner ? "bg-emerald-50 font-bold text-pitch-dark" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden>{team ? team.flag : "🏳️"}</span>
        <span
          className={
            team
              ? "truncate"
              : "text-[0.72rem] italic leading-tight text-muted"
          }
        >
          {name}
        </span>
        {showOrigin && badge && (
          <span
            className={`shrink-0 rounded px-1 text-[0.6rem] font-bold ${
              slot.projected
                ? "bg-emerald-50 text-pitch-dark"
                : "bg-line text-muted"
            }`}
            title={slot.projected ? t("bracket.clinched") : t("bracket.groupOrigin")}
          >
            {badge}
          </span>
        )}
      </span>
      <span className="tabular-nums text-muted">
        {score ?? ""}
        {pens != null && (
          <span className="ml-1 text-[0.72rem] font-bold text-pitch-dark">
            ({pens})
          </span>
        )}
      </span>
    </div>
  );
}

function Tie({ bm }: { bm: BracketMatch }) {
  const { t } = useI18n();
  // Group-position origin ("2A") only makes sense for Round-of-32 ties; later
  // rounds are fed by match winners, not group slots.
  const showOrigin = bm.match.stage === "r32";
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {bm.match.matchNumber && (
        <div className="bg-emerald-50/40 px-3 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
          {t("label.matchAbbr")}
          {bm.match.matchNumber}
        </div>
      )}
      <SlotRow
        slot={bm.home}
        score={bm.match.score.home}
        pens={bm.match.penalties?.home ?? null}
        isWinner={!!bm.winnerCode && bm.winnerCode === bm.home.code}
        showOrigin={showOrigin}
      />
      <div className="border-t border-line" />
      <SlotRow
        slot={bm.away}
        score={bm.match.score.away}
        pens={bm.match.penalties?.away ?? null}
        isWinner={!!bm.winnerCode && bm.winnerCode === bm.away.code}
        showOrigin={showOrigin}
      />
    </div>
  );
}

interface Connector {
  /** Cubic-bezier path data, in container pixel coordinates. */
  d: string;
  /** The feeding tie already has a winner → emphasize the live path. */
  highlight: boolean;
}

export default function Bracket() {
  const { locale, t } = useI18n();
  const rounds = bracketRounds();
  const third = thirdPlaceMatch();
  const champion = teamByCode(championCode());

  // Connectors link each tie to the two earlier ties that feed it. We measure
  // the rendered card positions and draw curves in an SVG overlay, so the
  // wiring stays correct whatever the responsive layout does.
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Re-measure whenever a result or the locale could shift card geometry.
  const signature =
    rounds
      .flatMap((r) => r.matches.map((m) => `${m.match.id}:${m.winnerCode ?? ""}`))
      .join("|") +
    `|${locale}`;

  // Stable across renders: reads the latest card geometry on demand. The bracket
  // data is a static import, so recomputing the wiring here is cheap and keeps
  // the resize listeners free of stale closures.
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const c = container.getBoundingClientRect();

    // Feeder → successor pairs, with whether the feeder's winner is known.
    const byNumber = new Map<number, BracketMatch>();
    for (const round of bracketRounds()) {
      for (const bm of round.matches) {
        if (bm.match.matchNumber != null) byNumber.set(bm.match.matchNumber, bm);
      }
    }

    const next: Connector[] = [];
    for (const bm of byNumber.values()) {
      const to = bm.match.matchNumber;
      if (to == null) continue;
      const toEl = cardRefs.current.get(to);
      if (!toEl) continue;
      for (const from of feederMatchNumbers(bm.match)) {
        const fromEl = cardRefs.current.get(from);
        if (!fromEl) continue;
        const f = fromEl.getBoundingClientRect();
        const g = toEl.getBoundingClientRect();
        // Right-middle of the feeder → left-middle of the successor.
        const sx = f.right - c.left;
        const sy = f.top - c.top + f.height / 2;
        const ex = g.left - c.left;
        const ey = g.top - c.top + g.height / 2;
        const mx = (sx + ex) / 2; // horizontal-tangent control points → smooth S
        next.push({
          d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`,
          highlight: !!byNumber.get(from)?.winnerCode,
        });
      }
    }
    setSize({ w: container.offsetWidth, h: container.offsetHeight });
    setConnectors(next);
  }, []);

  // Re-measure after layout settles and whenever results/locale change.
  useEffect(() => {
    measure();
  }, [measure, signature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4">
        <div ref={containerRef} className="relative flex w-max gap-6">
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0"
            width={size.w}
            height={size.h}
            aria-hidden
          >
            {connectors.map((conn, i) => (
              <path
                key={i}
                d={conn.d}
                fill="none"
                stroke={
                  conn.highlight ? "var(--color-pitch)" : "var(--color-muted)"
                }
                strokeOpacity={conn.highlight ? 0.9 : 0.28}
                strokeWidth={conn.highlight ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            ))}
          </svg>
          {rounds.map((round) => (
            <div key={round.stage} className="relative z-10 flex min-w-[190px] flex-col">
              <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted">
                {t(`stage.${round.stage}`)}
              </h3>
              {/* Cards distribute in the space below the title — keeping the
                  title out of the flow centers each tie on its two feeders. */}
              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((bm) => (
                  <div
                    key={bm.match.id}
                    ref={(el) => {
                      const n = bm.match.matchNumber;
                      if (n == null) return;
                      if (el) cardRefs.current.set(n, el);
                      else cardRefs.current.delete(n);
                    }}
                  >
                    <Tie bm={bm} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        {third && (
          <div className="min-w-[220px]">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              {t("stage.third")}
            </h3>
            <Tie bm={third} />
          </div>
        )}

        <div className="min-w-[220px]">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            🏆 {t("bracket.champion")}
          </h3>
          <div className="rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-4 text-center font-extrabold text-amber-900">
            {champion ? (
              <span>
                {champion.flag} {teamName(champion, locale)}
              </span>
            ) : (
              <span className="italic opacity-80">{t("common.tbd")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
