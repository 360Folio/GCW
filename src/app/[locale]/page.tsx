import { connection } from "next/server";
import { Suspense } from "react";
import { getFormatter, getLocale, getNow, getTranslations } from "next-intl/server";
import { LatestList, LeadStory, LinesSkeleton, StoryGrid } from "@/components/story-list";
import { WorldMap } from "@/components/world-map";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getConflicts, getLatestStories, getMapEvents } from "@/lib/public-data";

/*
 * Front page. The frame (headings, map box) is prerendered; stories, map
 * events and conflicts stream in per request from the database.
 */
export default async function HomePage() {
  const t = await getTranslations("Home");
  const tm = await getTranslations("Map");

  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4">
      <h1 className="sr-only">{t("heading")}</h1>

      <Suspense fallback={<FrontSkeleton />}>
        <Front />
      </Suspense>

      <section id="map" aria-labelledby="map-title" className="scroll-mt-4 border-b border-rule py-7">
        <p className="kicker">{tm("kicker")}</p>
        <h2 id="map-title" className="mt-1 text-[2rem] leading-tight font-bold">
          {tm("title")}
        </h2>
        <p className="mt-1 mb-4 text-muted italic">{tm("intro")}</p>
        <Suspense fallback={<div className="h-[clamp(320px,62vh,560px)] border border-ink bg-paper-2" />}>
          <MapBlock />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <MoreStories />
      </Suspense>

      <section id="conflicts" aria-labelledby="conflicts-title" className="scroll-mt-4 py-7">
        <h2 id="conflicts-title" className="section-label">
          {t("conflicts")}
        </h2>
        <Suspense fallback={<LinesSkeleton rows={2} />}>
          <ConflictRow />
        </Suspense>
      </section>
    </main>
  );
}

async function Front() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Home");
  const stories = await getLatestStories(locale);
  const now = (await getNow()).getTime();

  if (!stories.length) {
    return (
      <section className="border-b border-rule py-16 text-center">
        <p className="text-2xl font-bold">{t("emptyTitle")}</p>
        <p className="mt-2 text-muted italic">{t("emptyBody")}</p>
      </section>
    );
  }

  const [lead, ...rest] = stories;
  return (
    <section className="grid border-b border-rule py-6 lg:grid-cols-[2fr_1fr]">
      <div className="border-rule pb-6 lg:border-e lg:pe-8 lg:pb-0">
        <LeadStory story={lead} now={now} />
      </div>
      <div className="pt-2 lg:ps-6 lg:pt-0">
        <h2 className="section-label">{t("latest")}</h2>
        <LatestList stories={rest.slice(0, 5)} now={now} />
      </div>
    </section>
  );
}

function FrontSkeleton() {
  return (
    <div className="grid gap-8 border-b border-rule py-6 lg:grid-cols-[2fr_1fr]">
      <LinesSkeleton rows={2} />
      <LinesSkeleton rows={4} />
    </div>
  );
}

async function MapBlock() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const events = await getMapEvents(locale);
  return <WorldMap events={events} />;
}

async function MoreStories() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Home");
  const more = (await getLatestStories(locale)).slice(6);
  if (!more.length) return null;
  return (
    <section aria-labelledby="more-title" className="border-b border-rule py-7">
      <h2 id="more-title" className="section-label">
        {t("more")}
      </h2>
      <StoryGrid stories={more} now={(await getNow()).getTime()} />
    </section>
  );
}

async function ConflictRow() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Conflict");
  const format = await getFormatter();
  const list = await getConflicts(locale);
  if (!list.length) return <p className="text-muted italic">{t("none")}</p>;

  return (
    <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((c) => (
        <article key={c.slug} className="border-b border-rule py-4">
          <p className="kicker">{t(`status.${c.status}`)}</p>
          <h3 className="mt-1 text-[1.35rem] leading-tight font-bold">
            <Link href={`/conflicts/${c.slug}`} className="headline-link">
              {c.name}
            </Link>
          </h3>
          {c.summary && <p className="mt-1.5 text-[0.98rem] text-ink-2">{c.summary}</p>}
          <p className="meta mt-2">
            {c.startedOn && t("since", { date: format.dateTime(new Date(c.startedOn), { month: "long", year: "numeric" }) })}
            {c.startedOn && " · "}
            {t("stories", { count: c.storyCount })}
          </p>
        </article>
      ))}
    </div>
  );
}
