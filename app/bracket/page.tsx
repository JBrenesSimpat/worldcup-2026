"use client";

import { useI18n } from "@/lib/i18n";
import Bracket from "@/components/Bracket";

export default function BracketPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("bracket.title")}</h1>
        <p className="text-sm text-muted">{t("bracket.subtitle")}</p>
        <p className="mt-1 text-xs text-muted sm:hidden">
          ↔ {t("bracket.scrollHint")}
        </p>
      </div>
      <Bracket />
    </div>
  );
}
