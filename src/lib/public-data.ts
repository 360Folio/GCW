import "server-only";
import { and, count, desc, eq, gte, isNotNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import {
  claims,
  conflicts,
  conflictTranslations,
  mapEvents,
  sources,
  stories,
  storyTranslations,
  topics,
  topicTranslations,
  type Locale,
  type MapEventKind,
} from "@/db/schema";

/*
 * Everything the public site reads. A story is public in a language only when
 * the story is published, its publish time has passed and that language's
 * translation is approved by the editor.
 *
 * Results are cached for a few minutes. When Phase 2 publishes or edits a
 * story it clears the "stories" tag so readers see the change at once.
 *
 * Callers must `await connection()` first, so these run per request and
 * never during the build (the build has no database).
 */

export const TAGS = { stories: "stories", map: "map", taxonomy: "taxonomy" } as const;

const nowUtc = sql`UTC_TIMESTAMP(3)`;

const isPublic = (locale: Locale) =>
  and(
    eq(stories.status, "published"),
    lte(stories.publishedAt, nowUtc),
    eq(storyTranslations.locale, locale),
    eq(storyTranslations.status, "approved"),
  );

export type StoryCard = {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  conflict: { slug: string; name: string } | null;
  topic: { slug: string; name: string } | null;
};

function cardQuery(locale: Locale) {
  return getDb()
    .select({
      slug: stories.slug,
      publishedAt: stories.publishedAt,
      title: storyTranslations.title,
      summary: storyTranslations.summary,
      conflictSlug: conflicts.slug,
      conflictName: conflictTranslations.name,
      topicSlug: topics.slug,
      topicName: topicTranslations.name,
    })
    .from(stories)
    .innerJoin(storyTranslations, eq(storyTranslations.storyId, stories.id))
    .leftJoin(conflicts, eq(conflicts.id, stories.conflictId))
    .leftJoin(
      conflictTranslations,
      and(eq(conflictTranslations.conflictId, conflicts.id), eq(conflictTranslations.locale, locale)),
    )
    .leftJoin(topics, eq(topics.id, stories.topicId))
    .leftJoin(
      topicTranslations,
      and(eq(topicTranslations.topicId, topics.id), eq(topicTranslations.locale, locale)),
    )
    .$dynamic();
}

type CardRow = Awaited<ReturnType<ReturnType<typeof cardQuery>["execute"]>>[number];

const toCard = (r: CardRow): StoryCard => ({
  slug: r.slug,
  title: r.title,
  summary: r.summary,
  publishedAt: (r.publishedAt ?? new Date(0)).toISOString(),
  conflict: r.conflictSlug && r.conflictName ? { slug: r.conflictSlug, name: r.conflictName } : null,
  topic: r.topicSlug && r.topicName ? { slug: r.topicSlug, name: r.topicName } : null,
});

async function listCards(locale: Locale, extra: SQL | undefined, limit: number, offset = 0) {
  const rows = await cardQuery(locale)
    .where(and(isPublic(locale), extra))
    .orderBy(desc(stories.publishedAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

// ---------------------------------------------------------------------------

export async function getLatestStories(locale: Locale, limit = 14): Promise<StoryCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.stories);
  return listCards(locale, undefined, limit);
}

export type ConflictSummary = {
  slug: string;
  name: string;
  summary: string | null;
  status: "active" | "frozen" | "resolved";
  startedOn: string | null;
  storyCount: number;
};

export async function getConflicts(locale: Locale): Promise<ConflictSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.taxonomy, TAGS.stories);
  const db = getDb();
  const rows = await db
    .select({
      id: conflicts.id,
      slug: conflicts.slug,
      status: conflicts.status,
      startedOn: conflicts.startedOn,
      name: conflictTranslations.name,
      summary: conflictTranslations.summary,
    })
    .from(conflicts)
    .innerJoin(
      conflictTranslations,
      and(eq(conflictTranslations.conflictId, conflicts.id), eq(conflictTranslations.locale, locale)),
    )
    .orderBy(conflicts.sortOrder, conflictTranslations.name);

  const counts = await db
    .select({ conflictId: stories.conflictId, n: count() })
    .from(stories)
    .innerJoin(storyTranslations, eq(storyTranslations.storyId, stories.id))
    .where(and(isPublic(locale), isNotNull(stories.conflictId)))
    .groupBy(stories.conflictId);
  const byId = new Map(counts.map((c) => [c.conflictId, c.n]));

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    status: r.status,
    startedOn: r.startedOn ? r.startedOn.toISOString() : null,
    storyCount: byId.get(r.id) ?? 0,
  }));
}

export async function getConflictPage(locale: Locale, slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.taxonomy, TAGS.stories);
  const [conflict] = await getDb()
    .select({
      id: conflicts.id,
      slug: conflicts.slug,
      status: conflicts.status,
      region: conflicts.region,
      startedOn: conflicts.startedOn,
      name: conflictTranslations.name,
      summary: conflictTranslations.summary,
    })
    .from(conflicts)
    .innerJoin(
      conflictTranslations,
      and(eq(conflictTranslations.conflictId, conflicts.id), eq(conflictTranslations.locale, locale)),
    )
    .where(eq(conflicts.slug, slug))
    .limit(1);
  if (!conflict) return null;
  const list = await listCards(locale, eq(stories.conflictId, conflict.id), 60);
  return {
    name: conflict.name,
    summary: conflict.summary,
    status: conflict.status,
    region: conflict.region,
    startedOn: conflict.startedOn ? conflict.startedOn.toISOString() : null,
    stories: list,
  };
}

export async function getTopicPage(locale: Locale, slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.taxonomy, TAGS.stories);
  const [topic] = await getDb()
    .select({ id: topics.id, name: topicTranslations.name })
    .from(topics)
    .innerJoin(
      topicTranslations,
      and(eq(topicTranslations.topicId, topics.id), eq(topicTranslations.locale, locale)),
    )
    .where(eq(topics.slug, slug))
    .limit(1);
  if (!topic) return null;
  return { name: topic.name, stories: await listCards(locale, eq(stories.topicId, topic.id), 60) };
}

export type StoryPage = StoryCard & {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  sources: { url: string; publisher: string | null; title: string | null }[];
  checkedClaims: number;
  otherLocale: Locale | null;
};

export async function getStory(locale: Locale, slug: string): Promise<StoryPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.stories, `story:${slug}`);
  const db = getDb();
  const [row] = await cardQuery(locale)
    .where(and(isPublic(locale), eq(stories.slug, slug)))
    .limit(1);
  if (!row) return null;

  const [full] = await db
    .select({
      id: stories.id,
      body: storyTranslations.body,
      seoTitle: storyTranslations.seoTitle,
      seoDescription: storyTranslations.seoDescription,
      updatedAt: storyTranslations.updatedAt,
    })
    .from(stories)
    .innerJoin(storyTranslations, eq(storyTranslations.storyId, stories.id))
    .where(and(eq(stories.slug, slug), eq(storyTranslations.locale, locale)))
    .limit(1);

  const other: Locale = locale === "en" ? "ur" : "en";
  const [otherRow, sourceRows, [claimCount]] = await Promise.all([
    db
      .select({ ok: storyTranslations.storyId })
      .from(storyTranslations)
      .where(
        and(
          eq(storyTranslations.storyId, full.id),
          eq(storyTranslations.locale, other),
          eq(storyTranslations.status, "approved"),
        ),
      )
      .limit(1),
    db
      .select({ url: sources.url, publisher: sources.publisher, title: sources.title })
      .from(sources)
      .where(eq(sources.storyId, full.id))
      .orderBy(sources.createdAt),
    db
      .select({ n: count() })
      .from(claims)
      .where(and(eq(claims.storyId, full.id), or(eq(claims.status, "supported"), eq(claims.status, "resolved")))),
  ]);

  return {
    ...toCard(row),
    body: full.body,
    seoTitle: full.seoTitle,
    seoDescription: full.seoDescription,
    updatedAt: full.updatedAt.toISOString(),
    // Only http(s) links are shown to readers.
    sources: sourceRows.filter((s) => /^https?:\/\//i.test(s.url)),
    checkedClaims: claimCount?.n ?? 0,
    otherLocale: otherRow.length ? other : null,
  };
}

export type MapEvent = {
  id: string;
  lat: number;
  lng: number;
  kind: MapEventKind;
  severity: number;
  title: string;
  occurredAt: string;
  conflictName: string | null;
  storySlug: string | null;
};

/** Editor-approved map events from the past `days` days, newest first. */
export async function getMapEvents(locale: Locale, days = 7): Promise<MapEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.map, TAGS.stories);
  const rows = await getDb()
    .select({
      id: mapEvents.id,
      lat: mapEvents.lat,
      lng: mapEvents.lng,
      kind: mapEvents.kind,
      severity: mapEvents.severity,
      titleEn: mapEvents.titleEn,
      titleUr: mapEvents.titleUr,
      occurredAt: mapEvents.occurredAt,
      conflictName: conflictTranslations.name,
      storySlug: stories.slug,
    })
    .from(mapEvents)
    .leftJoin(
      conflictTranslations,
      and(eq(conflictTranslations.conflictId, mapEvents.conflictId), eq(conflictTranslations.locale, locale)),
    )
    // Link to the story only if it is public in this language.
    .leftJoin(storyTranslations, and(eq(storyTranslations.storyId, mapEvents.storyId), eq(storyTranslations.locale, locale), eq(storyTranslations.status, "approved")))
    .leftJoin(
      stories,
      and(eq(stories.id, storyTranslations.storyId), eq(stories.status, "published"), lte(stories.publishedAt, nowUtc)),
    )
    .where(
      and(
        eq(mapEvents.approved, true),
        gte(mapEvents.occurredAt, sql`UTC_TIMESTAMP(3) - INTERVAL ${days} DAY`),
        lte(mapEvents.occurredAt, nowUtc),
      ),
    )
    .orderBy(desc(mapEvents.occurredAt))
    .limit(60);

  return rows.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    kind: r.kind,
    severity: r.severity,
    title: (locale === "ur" && r.titleUr) || r.titleEn,
    occurredAt: r.occurredAt.toISOString(),
    conflictName: r.conflictName,
    storySlug: r.storySlug,
  }));
}

/** Plain text search over titles, summaries and story text in one language. */
export async function searchStories(locale: Locale, query: string): Promise<StoryCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.stories);
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return listCards(
    locale,
    or(
      like(storyTranslations.title, pattern),
      like(storyTranslations.summary, pattern),
      like(storyTranslations.body, pattern),
    ),
    30,
  );
}
