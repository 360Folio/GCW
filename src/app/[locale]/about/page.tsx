import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return { title: t("title"), description: t("intro") };
}

const SECTIONS = ["mission", "method", "checks", "languages", "corrections", "independence"] as const;

export default async function AboutPage() {
  const t = await getTranslations("About");
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <header className="rule-double py-8">
        <p className="kicker">{t("kicker")}</p>
        <h1 className="mt-1 text-[clamp(2.2rem,5vw,3.4rem)] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-3 max-w-[60ch] text-[1.3rem] leading-snug text-ink-2">{t("intro")}</p>
      </header>
      <div className="grid gap-x-10 py-6 lg:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s} id={s} className="scroll-mt-4 border-b border-rule py-5">
            <h2 className="text-[1.5rem] leading-tight font-bold">{t(`${s}.title`)}</h2>
            <p className="mt-2 text-ink-2">{t(`${s}.body`)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
