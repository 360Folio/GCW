"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Links to the same page in the other language.
export function LanguageSwitch() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "ur" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      aria-label={t("switchLanguageLabel")}
      className={`no-underline hover:text-red ${other === "ur" ? "font-urdu text-[0.9rem] tracking-normal normal-case" : ""}`}
    >
      {t("switchLanguage")}
    </Link>
  );
}
