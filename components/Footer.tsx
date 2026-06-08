"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-line px-5 py-6 text-center text-xs text-muted">
      <p>
        {t("footer.dataSource")} · {t("footer.disclaimer")}
      </p>
      <p className="mt-1.5">{t("footer.madeWith")}</p>
      <p className="mt-1.5">{t("footer.madeBy")}</p>
    </footer>
  );
}
