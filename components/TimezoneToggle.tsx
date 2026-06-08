"use client";

import { useI18n } from "@/lib/i18n";
import { useTimezone, type TzMode } from "@/lib/timezone";

const OPTIONS: { value: TzMode; key: string }[] = [
  { value: "mexico", key: "tz.mexico" },
  { value: "local", key: "tz.local" },
];

export default function TimezoneToggle() {
  const { mode, setMode } = useTimezone();
  const { t } = useI18n();

  return (
    <div
      className="flex items-center gap-1 rounded-full bg-white/15 p-0.5"
      role="group"
      aria-label={t("tz.label")}
    >
      <span className="pl-1.5 text-xs" aria-hidden>
        🕒
      </span>
      {OPTIONS.map((opt) => {
        const active = opt.value === mode;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
              active ? "bg-white text-pitch-dark" : "text-white/80 hover:text-white"
            }`}
          >
            {t(opt.key)}
          </button>
        );
      })}
    </div>
  );
}
