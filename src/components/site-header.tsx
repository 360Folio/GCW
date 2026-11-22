import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { Today } from "./today";

export async function SiteHeader() {
  const t = await getTranslations();
  const locale = await getLocale();

  const nav = [
    { href: "/", label: t("Nav.home") },
    { href: "/#conflicts", label: t("Nav.conflicts") },
    { href: "/#map", label: t("Nav.map") },
    { href: "/search", label: t("Nav.search") },
    { href: "/about", label: t("Nav.about") },
  ];

  return (
    <header className="mx-auto w-full max-w-[1180px] px-4">
      <a
        href="#main"
        className="meta sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:bg-paper focus:px-3 focus:py-2"
      >
        {t("Nav.skip")}
      </a>
      <div className="meta flex items-center justify-between gap-3 py-3 font-semibold uppercase tracking-[0.12em]">
        <Today locale={locale} />
        {/* The current address isn't known while a page shell is prerendered. */}
        <Suspense fallback={<span />}>
          <LanguageSwitch />
        </Suspense>
      </div>
      <div className="rule-double border-t border-ink py-4 text-center">
        <Link href="/" className="inline-block no-underline">
          <span className="block text-[clamp(2.1rem,6.5vw,4.5rem)] leading-none font-bold tracking-[-0.01em]">
            {t("Site.name")}
          </span>
        </Link>
        <p className="mt-2 text-[0.95rem] text-muted italic">{t("Site.tagline")}</p>
      </div>
      <nav
        aria-label={t("Nav.label")}
        className="kicker flex flex-wrap justify-center gap-x-6 gap-y-1 border-b border-rule py-2.5 !text-ink"
      >
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="py-1 no-underline hover:text-red">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
