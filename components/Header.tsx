"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV = [
  { href: "/", key: "nav.today" },
  { href: "/schedule", key: "nav.schedule" },
  { href: "/teams", key: "nav.teams" },
  { href: "/groups", key: "nav.groups" },
  { href: "/bracket", key: "nav.bracket" },
] as const;

export default function Header() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-br from-pitch to-pitch-dark text-white">
      <div className="mx-auto w-full max-w-5xl px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl leading-none" aria-hidden>
              ⚽
            </span>
            <span>
              <span className="block text-xl font-extrabold leading-tight tracking-tight">
                {t("app.title")}
              </span>
              <span className="block text-xs font-medium opacity-85">
                {t("app.subtitle")} · {t("app.hosts")}
              </span>
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
        <p className="mt-1 text-sm opacity-90">{t("app.tagline")}</p>

        <nav className="mt-4 flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-gold opacity-100"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
