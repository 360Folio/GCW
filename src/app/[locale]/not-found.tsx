import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 opacity-80">{t("body")}</p>
        <Link href="/" className="mt-6 inline-block underline">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
