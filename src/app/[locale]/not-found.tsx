import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4 py-20 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-2 text-[2.4rem] leading-tight font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted italic">{t("body")}</p>
      <p className="mt-6 flex flex-wrap justify-center gap-x-6">
        <Link href="/" className="underline hover:text-red">
          {t("home")}
        </Link>
        <Link href="/search" className="underline hover:text-red">
          {t("search")}
        </Link>
      </p>
    </main>
  );
}
