"use client";

import { useI18n } from "@/lib/i18n";
import { formatTime } from "@/lib/time";
import type { Match } from "@/lib/types";
import TeamBadge from "./TeamBadge";

function StageLabel({ match }: { match: Match }) {
  const { t } = useI18n();
  if (match.stage === "group") {
    return <>{`${t("common.group")} ${match.group}`}</>;
  }
  return <>{t(`stage.${match.stage}`)}</>;
}

export default function MatchCard({ match }: { match: Match }) {
  const { locale, t } = useI18n();
  const { score, status } = match;
  const hasScore = score.home !== null && score.away !== null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
      <TeamBadge code={match.home} label={match.homeLabel} align="right" />

      <div className="min-w-[88px] text-center">
        {status === "live" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-live">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
            {t("status.live")}
          </span>
        )}
        {status === "finished" && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-pitch-dark">
            {t("status.ft")}
          </span>
        )}

        {hasScore ? (
          <div className="text-xl font-extrabold">
            {score.home} – {score.away}
          </div>
        ) : (
          <div className="text-lg font-bold text-ink">
            {formatTime(match.datetime, locale)}
          </div>
        )}

        <div className="mt-0.5 text-[0.72rem] text-muted">
          <StageLabel match={match} />
        </div>
      </div>

      <TeamBadge code={match.away} label={match.awayLabel} align="left" />

      {match.venue && (
        <div className="col-span-3 mt-1 text-center text-[0.72rem] text-muted">
          {match.venue}
          {match.city ? ` · ${match.city}` : ""}
        </div>
      )}
    </div>
  );
}
