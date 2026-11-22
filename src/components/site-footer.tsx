import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="mx-auto mt-12 w-full max-w-[1180px] px-4">
      <div className="border-t-[3px] border-double border-ink py-6 text-center">
        <p className="text-lg font-bold">{t("Site.name")}</p>
        <p className="mt-1 text-sm text-muted italic">{t("Footer.promise")}</p>
        <nav aria-label={t("Footer.label")} className="meta mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/about" className="hover:text-red">{t("Nav.about")}</Link>
          <Link href="/about#corrections" className="hover:text-red">{t("Footer.corrections")}</Link>
          <Link href="/search" className="hover:text-red">{t("Nav.search")}</Link>
        </nav>
      </div>
    </footer>
  );
}
