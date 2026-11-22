import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Temporary holding page. Replaced by the real home page once a design
// concept is chosen.
export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const other = locale === "en" ? "ur" : "en";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.2em] opacity-60">{t("Site.tagline")}</p>
        <h1 className="mt-4 text-4xl font-bold">{t("Site.name")}</h1>
        <p className="mt-4 text-lg opacity-80">{t("Holding.comingSoon")}</p>
        <Link
          href="/"
          locale={other}
          lang={other}
          aria-label={t("Site.switchLanguageLabel")}
          className="mt-8 inline-block rounded-full border px-5 py-2 text-sm"
        >
          {t("Site.switchLanguage")}
        </Link>
      </div>
    </main>
  );
}
