import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Markdown, { type Components } from "react-markdown";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Kicker, LinesSkeleton } from "@/components/story-list";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatDate, readingMinutes } from "@/lib/format";
import { getStory } from "@/lib/public-data";

type Props = PageProps<"/[locale]/stories/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const locale = (await getLocale()) as Locale;
  const story = await getStory(locale, slug);
  if (!story) return {};
  const languages: Record<string, string> = { [locale]: `/${locale}/stories/${slug}` };
  if (story.otherLocale) languages[story.otherLocale] = `/${story.otherLocale}/stories/${slug}`;
  const description = story.seoDescription ?? story.summary ?? undefined;
  return {
    title: story.seoTitle ?? story.title,
    description,
    alternates: { canonical: `/${locale}/stories/${slug}`, languages },
    openGraph: { type: "article", title: story.title, description, publishedTime: story.publishedAt },
  };
}

export default function StoryRoute({ params }: Props) {
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <Suspense fallback={<div className="py-8"><LinesSkeleton rows={6} /></div>}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}

// Story text comes from the database as Markdown. Raw HTML is dropped and
// links to other sites open without passing on who sent the reader.
const markdown: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) => {
    const external = /^https?:\/\//i.test(href ?? "");
    return (
      <a href={href} {...(external ? { rel: "nofollow noopener noreferrer", target: "_blank" } : {})}>
        {children}
      </a>
    );
  },
};

async function Article({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  await connection();
  const locale = (await getLocale()) as Locale;
  const story = await getStory(locale, slug);
  if (!story) notFound();

  const t = await getTranslations("Story");
  const format = await getFormatter();
  const other = story.otherLocale;
  const updated = new Date(story.updatedAt).getTime() - new Date(story.publishedAt).getTime() > 3_600_000;

  return (
    <article className="grid gap-x-10 py-8 lg:grid-cols-[1fr_300px]">
      <header className="lg:col-span-2">
        <Kicker story={story} />
        <h1 className="mt-2 max-w-[22ch] text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.06] font-bold">{story.title}</h1>
        {story.summary && <p className="mt-4 max-w-[60ch] text-[1.3rem] leading-snug text-ink-2">{story.summary}</p>}
        <p className="meta mt-4 flex flex-wrap gap-x-2 border-b border-rule pb-4">
          <span>
            <b className="text-ink">{t("desk")}</b> · {t("reviewed")}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={story.publishedAt}>{formatDate(format, story.publishedAt)}</time>
          {updated && (
            <>
              <span aria-hidden>·</span>
              <span>{t("updated", { date: formatDate(format, story.updatedAt) })}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{t("minRead", { count: readingMinutes(story.body) })}</span>
          {other && (
            <>
              <span aria-hidden>·</span>
              <Link href={`/stories/${story.slug}`} locale={other} lang={other} className="!text-red">
                {t("readOther")}
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="story-body mt-6">
        <Markdown components={markdown} skipHtml>
          {story.body}
        </Markdown>
      </div>

      <aside className="mt-10 self-start border-t-[3px] border-ink pt-3 lg:sticky lg:top-6 lg:mt-6" aria-label={t("checkedTitle")}>
        <h2 className="section-label !border-b-0 !pb-0">{t("checkedTitle")}</h2>
        <p className="text-[0.98rem] text-ink-2">
          {story.checkedClaims > 0 ? t("checkedBody", { count: story.checkedClaims }) : t("checkedNone")}
        </p>
        <h2 className="section-label mt-6 !border-b-0 !pb-0">{t("sources")}</h2>
        {story.sources.length ? (
          <ol className="list-decimal ps-5 text-[0.95rem]">
            {story.sources.map((s) => (
              <li key={s.url} className="border-b border-dotted border-rule py-2">
                <a href={s.url} rel="nofollow noopener noreferrer" target="_blank" className="hover:text-red" lang="en">
                  {s.publisher ?? new URL(s.url).hostname}
                </a>
                {s.title && <span className="block text-muted italic" lang="en">{s.title}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted italic">{t("noSources")}</p>
        )}
        <p className="meta mt-5">
          {t.rich("correction", {
            link: (chunks) => (
              <Link href="/about#corrections" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </aside>
    </article>
  );
}
