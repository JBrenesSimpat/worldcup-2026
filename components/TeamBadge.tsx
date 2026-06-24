"use client";

import { useI18n } from "@/lib/i18n";
import { positionLabel, slotLabelText, teamByCode, teamName } from "@/lib/data";
import { clinchedSlots } from "@/lib/standings";

export default function TeamBadge({
  code,
  label,
  align = "left",
}: {
  code: string | null;
  label?: string;
  align?: "left" | "right";
}) {
  const { locale, t } = useI18n();

  // Direct team, or — for an undecided knockout slot — a mathematically
  // clinched group position (e.g. "1A" already locked = México).
  const direct = teamByCode(code);
  const projectedCode = !direct && label ? clinchedSlots()[label] : undefined;
  const team = direct ?? teamByCode(projectedCode);
  const projected = !direct && !!team;

  const flag = team ? team.flag : "🏳️";
  const name = team ? teamName(team, locale) : slotLabelText(label, t);
  // "1.º A"/"2.º B" for winners/runners-up; for a best third (label lists
  // candidate groups) show "3.º" + the team's own group.
  const badge =
    team && label?.startsWith("3:")
      ? `${t("label.rank3")} ${team.group}`
      : positionLabel(label, t);

  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {flag}
      </span>
      <span
        className={`font-semibold ${team ? "" : "italic text-muted"}`}
        title={name}
      >
        {name}
      </span>
      {projected && badge && (
        <span
          className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.6rem] font-bold text-pitch-dark"
          title={t("bracket.clinched")}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
