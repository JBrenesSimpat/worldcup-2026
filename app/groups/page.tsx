"use client";

import { useI18n } from "@/lib/i18n";
import { GROUP_IDS } from "@/lib/standings";
import GroupTable from "@/components/GroupTable";

export default function GroupsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("groups.title")}</h1>
        <p className="text-sm text-muted">{t("groups.subtitle")}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-pitch" />
            {t("groups.qualifies")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-gold" />
            {t("groups.bestThird")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_IDS.map((g) => (
          <GroupTable key={g} group={g} />
        ))}
      </div>
    </div>
  );
}
