import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getFormatter, getLocale, getNow, getTranslations } from "next-intl/server";
import { LinesSkeleton, StoryRows } from "@/components/story-list";
import type { Locale } from "@/db/schema";
import { getConflictPage } from "@/lib/public-data";

// Conflict page: every story about one conflict. Phase 3 turns this into the
// full hub (explainer, timeline, key figures, local map).
type Props = PageProps<"/[locale]/conflicts/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const page = await getConflictPage((await getLocale()) as Locale, slug);
  return page ? { title: page.name, description: page.summary ?? undefined } : {};
}

export default function ConflictRoute({ params }: Props) {
  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <Suspense fallback={<div className="py-8"><LinesSkeleton rows={5} /></div>}>
        <Conflict params={params} />
      </Suspense>
    </main>
  );
}

async function Conflict({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  await connection();
  const page = await getConflictPage((await getLocale()) as Locale, slug);
  if (!page) notFound();
  const t = await getTranslations("Conflict");
  const format = await getFormatter();

  return (
    <>
      <header className="rule-double py-8">
        <p className="kicker">{t(`status.${page.status}`)}</p>
        <h1 className="mt-1 text-[clamp(2.2rem,5vw,3.4rem)] leading-tight font-bold">{page.name}</h1>
        {page.summary && <p className="mt-3 max-w-[60ch] text-[1.25rem] text-ink-2">{page.summary}</p>}
        <p className="meta mt-3">
          {[
            page.region,
            page.startedOn &&
              t("since", { date: format.dateTime(new Date(page.startedOn), { month: "long", year: "numeric" }) }),
            t("stories", { count: page.stories.length }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>
      {page.stories.length ? (
        <StoryRows stories={page.stories} now={(await getNow()).getTime()} />
      ) : (
        <p className="py-10 text-muted italic">{t("noStories")}</p>
      )}
    </>
  );
}
