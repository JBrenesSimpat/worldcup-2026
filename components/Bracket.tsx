"use client";

import { useI18n } from "@/lib/i18n";
import { positionLabel, slotLabelText, teamByCode, teamName } from "@/lib/data";
import {
  bracketRounds,
  championCode,
  thirdPlaceMatch,
  type BracketMatch,
  type ResolvedSlot,
} from "@/lib/bracket";

function SlotRow({
  slot,
  score,
  isWinner,
}: {
  slot: ResolvedSlot;
  score: number | null;
  isWinner: boolean;
}) {
  const { locale, t } = useI18n();
  const team = teamByCode(slot.code);
  const name = team ? teamName(team, locale) : slotLabelText(slot.label, t);
  // Projected badge: "1.º A"/"2.º B" for winners/runners-up, or — for a best
  // third, whose label lists candidate groups — "3.º" + the team's own group.
  const badge =
    team && slot.label?.startsWith("3:")
      ? `${t("label.rank3")} ${team.group}`
      : positionLabel(slot.label, t);

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
        {slot.projected && badge && (
          <span
            className="shrink-0 rounded bg-emerald-50 px-1 text-[0.6rem] font-bold text-pitch-dark"
            title={t("bracket.clinched")}
          >
            {badge}
          </span>
        )}
      </span>
      <span className="tabular-nums text-muted">{score ?? ""}</span>
    </div>
  );
}

function Tie({ bm }: { bm: BracketMatch }) {
  const { t } = useI18n();
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
        isWinner={!!bm.winnerCode && bm.winnerCode === bm.home.code}
      />
      <div className="border-t border-line" />
      <SlotRow
        slot={bm.away}
        score={bm.match.score.away}
        isWinner={!!bm.winnerCode && bm.winnerCode === bm.away.code}
      />
    </div>
  );
}

export default function Bracket() {
  const { locale, t } = useI18n();
  const rounds = bracketRounds();
  const third = thirdPlaceMatch();
  const champion = teamByCode(championCode());

  return (
    <div className="space-y-6">
      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map((round) => (
          <div
            key={round.stage}
            className="flex min-w-[190px] flex-col justify-around gap-3"
          >
            <h3 className="text-center text-xs font-bold uppercase tracking-wide text-muted">
              {t(`stage.${round.stage}`)}
            </h3>
            {round.matches.map((bm) => (
              <Tie key={bm.match.id} bm={bm} />
            ))}
          </div>
        ))}
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
