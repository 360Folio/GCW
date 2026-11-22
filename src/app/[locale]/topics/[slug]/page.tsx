import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { LinesSkeleton, StoryRows } from "@/components/story-list";
import type { Locale } from "@/db/schema";
import { getTopicPage } from "@/lib/public-data";

// Section (category) page, such as Analysis or Fact check.
type Props = PageProps<"/[locale]/topics/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const page = await getTopicPage((await getLocale()) as Locale, slug);
  return page ? { title: page.name } : {};
}

export default function TopicRoute({ params }: Props) {
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <Suspense fallback={<div className="py-8"><LinesSkeleton rows={5} /></div>}>
        <Topic params={params} />
      </Suspense>
    </main>
  );
}

async function Topic({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  await connection();
  const page = await getTopicPage((await getLocale()) as Locale, slug);
  if (!page) notFound();
  const t = await getTranslations("Topic");

  return (
    <>
      <header className="rule-double py-8">
        <p className="kicker">{t("kicker")}</p>
        <h1 className="mt-1 text-[clamp(2.2rem,5vw,3.4rem)] leading-tight font-bold">{page.name}</h1>
      </header>
      {page.stories.length ? (
        <StoryRows stories={page.stories} now={(await getNow()).getTime()} />
      ) : (
        <p className="py-10 text-muted italic">{t("noStories")}</p>
      )}
    </>
  );
}
