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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_IDS.map((g) => (
          <GroupTable key={g} group={g} />
        ))}
      </div>
    </div>
  );
}
