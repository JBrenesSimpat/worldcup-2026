"use client";

import { useI18n } from "@/lib/i18n";
import { slotLabelText, teamByCode, teamName } from "@/lib/data";

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
  const team = teamByCode(code);

  const flag = team ? team.flag : "🏳️";
  const name = team ? teamName(team, locale) : slotLabelText(label, t);

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
    </div>
  );
}
