import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { LinesSkeleton, StoryRows } from "@/components/story-list";
import type { Locale } from "@/db/schema";
import { searchStories } from "@/lib/public-data";

type Props = PageProps<"/[locale]/search">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Search");
  return { title: t("title"), robots: { index: false } };
}

const readQuery = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";

export default async function SearchRoute({ searchParams }: Props) {
  const t = await getTranslations("Search");
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <header className="rule-double py-8">
        <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] leading-tight font-bold">{t("title")}</h1>
        <form role="search" action="" method="get" className="mt-5 flex max-w-2xl border border-ink">
          <label htmlFor="q" className="sr-only">
            {t("label")}
          </label>
          <Suspense fallback={<SearchInput placeholder={t("placeholder")} />}>
            <CurrentQueryInput searchParams={searchParams} placeholder={t("placeholder")} />
          </Suspense>
          <button className="kicker cursor-pointer bg-ink px-5 !text-paper hover:bg-red">{t("button")}</button>
        </form>
      </header>
      <Suspense fallback={<div className="py-4"><LinesSkeleton rows={3} /></div>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function SearchInput({ placeholder, value }: { placeholder: string; value?: string }) {
  return (
    <input
      id="q"
      name="q"
      type="search"
      defaultValue={value}
      placeholder={placeholder}
      maxLength={100}
      className="min-w-0 flex-1 bg-[#fffdf8] px-4 py-3 text-[1.1rem] outline-none"
    />
  );
}

async function CurrentQueryInput({ searchParams, placeholder }: Pick<Props, "searchParams"> & { placeholder: string }) {
  const q = readQuery((await searchParams).q);
  return <SearchInput placeholder={placeholder} value={q} key={q} />;
}

async function Results({ searchParams }: Pick<Props, "searchParams">) {
  const q = readQuery((await searchParams).q);
  const t = await getTranslations("Search");
  if (!q) return <p className="py-6 text-muted italic">{t("intro")}</p>;
  if (q.length < 2) return <p className="py-6 text-muted italic">{t("tooShort")}</p>;

  await connection();
  const results = await searchStories((await getLocale()) as Locale, q);
  return (
    <section aria-live="polite" className="py-4">
      <p className="meta mb-2">{t("results", { count: results.length, query: q })}</p>
      {results.length ? <StoryRows stories={results} now={(await getNow()).getTime()} /> : <p className="py-6 text-muted italic">{t("none")}</p>}
    </section>
  );
}
