import "server-only";
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { getDb } from "@/db";
import {
  auditLog,
  claims,
  conflicts,
  conflictTranslations,
  mapEvents,
  sources,
  stories,
  storyTranslations,
  topics,
  topicTranslations,
  users,
  STORY_STATUS,
} from "@/db/schema";

/*
 * What the newsroom screens read. Never cached: the editor always sees the
 * current state. Only called from pages behind requireAdmin().
 */

export type StoryStatusValue = (typeof STORY_STATUS)[number];

const flag = (v: unknown) => Number(v) === 1;
const en = alias(storyTranslations, "t_en");
const ur = alias(storyTranslations, "t_ur");
const conflictEn = alias(conflictTranslations, "c_en");

function storyRows() {
  return getDb()
    .select({
      id: stories.id,
      slug: stories.slug,
      status: stories.status,
      origin: stories.origin,
      publishedAt: stories.publishedAt,
      updatedAt: stories.updatedAt,
      createdAt: stories.createdAt,
      scheduled: sql`(${stories.publishedAt} > UTC_TIMESTAMP(3))`.mapWith(flag),
      titleEn: en.title,
      enStatus: en.status,
      titleUr: ur.title,
      urStatus: ur.status,
      conflictName: conflictEn.name,
      flagged: sql`(select count(*) from ${claims} where ${claims.storyId} = ${stories.id} and ${claims.status} = ${"flagged"})`.mapWith(Number),
      sourceCount: sql`(select count(*) from ${sources} where ${sources.storyId} = ${stories.id})`.mapWith(Number),
    })
    .from(stories)
    .leftJoin(en, and(eq(en.storyId, stories.id), eq(en.locale, "en")))
    .leftJoin(ur, and(eq(ur.storyId, stories.id), eq(ur.locale, "ur")))
    .leftJoin(conflictEn, and(eq(conflictEn.conflictId, stories.conflictId), eq(conflictEn.locale, "en")))
    .$dynamic();
}

export type StoryRow = Awaited<ReturnType<ReturnType<typeof storyRows>["execute"]>>[number];

export type StoryFilter = StoryStatusValue | "all" | "scheduled" | "urdu";

function filterWhere(filter: StoryFilter): SQL | undefined {
  switch (filter) {
    case "all":
      return undefined;
    case "scheduled":
      return and(eq(stories.status, "published"), sql`${stories.publishedAt} > UTC_TIMESTAMP(3)`);
    case "urdu":
      // Live in English, Urdu missing or not approved yet
      return and(
        eq(stories.status, "published"),
        eq(en.status, "approved"),
        or(sql`${ur.storyId} is null`, eq(ur.status, "draft")),
      );
    default:
      return eq(stories.status, filter);
  }
}

export async function listStories(filter: StoryFilter = "all", query = "", limit = 100) {
  const q = query.trim();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return storyRows()
    .where(and(filterWhere(filter), q ? or(like(en.title, pattern), like(ur.title, pattern), like(stories.slug, pattern)) : undefined))
    .orderBy(desc(stories.updatedAt))
    .limit(limit);
}

export async function storyCounts(): Promise<Record<StoryFilter, number>> {
  const db = getDb();
  const [byStatus, [scheduled], [urdu]] = await Promise.all([
    db.select({ status: stories.status, n: count() }).from(stories).groupBy(stories.status),
    db
      .select({ n: count() })
      .from(stories)
      .where(filterWhere("scheduled")),
    db
      .select({ n: count() })
      .from(stories)
      .leftJoin(en, and(eq(en.storyId, stories.id), eq(en.locale, "en")))
      .leftJoin(ur, and(eq(ur.storyId, stories.id), eq(ur.locale, "ur")))
      .where(filterWhere("urdu")),
  ]);
  const out = { all: 0, scheduled: scheduled.n, urdu: urdu.n } as Record<StoryFilter, number>;
  for (const s of STORY_STATUS) out[s] = 0;
  for (const row of byStatus) {
    out[row.status] = row.n;
    out.all += row.n;
  }
  return out;
}

export async function getInbox() {
  const db = getDb();
  const [review, ready, urdu, counts, [pendingEvents], recent] = await Promise.all([
    storyRows()
      .where(inArray(stories.status, ["draft", "in_review"]))
      .orderBy(desc(stories.updatedAt))
      .limit(50),
    storyRows().where(eq(stories.status, "approved")).orderBy(desc(stories.updatedAt)).limit(20),
    storyRows().where(filterWhere("urdu")).orderBy(desc(stories.publishedAt)).limit(20),
    storyCounts(),
    db.select({ n: count() }).from(mapEvents).where(eq(mapEvents.approved, false)),
    listActivity({ limit: 8 }),
  ]);
  return { review, ready, urdu, counts, pendingEvents: pendingEvents.n, recent: recent.rows };
}

// ---------------------------------------------------------------------------
// One story, for the editor

export async function getStoryForEditor(id: string) {
  const db = getDb();
  const [story] = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      status: stories.status,
      origin: stories.origin,
      conflictId: stories.conflictId,
      topicId: stories.topicId,
      featuredImageUrl: stories.featuredImageUrl,
      featuredImageCredit: stories.featuredImageCredit,
      publishedAt: stories.publishedAt,
      createdAt: stories.createdAt,
      updatedAt: stories.updatedAt,
      scheduled: sql`(${stories.publishedAt} > UTC_TIMESTAMP(3))`.mapWith(flag),
      approvedByName: users.name,
    })
    .from(stories)
    .leftJoin(users, eq(users.id, stories.approvedBy))
    .where(eq(stories.id, id))
    .limit(1);
  if (!story) return null;

  const [translations, sourceRows, claimRows, events, history] = await Promise.all([
    db.select().from(storyTranslations).where(eq(storyTranslations.storyId, id)),
    db.select().from(sources).where(eq(sources.storyId, id)).orderBy(asc(sources.createdAt)),
    db
      .select({
        id: claims.id,
        text: claims.text,
        kind: claims.kind,
        status: claims.status,
        sourceId: claims.sourceId,
        note: claims.note,
        resolvedAt: claims.resolvedAt,
        resolvedByName: users.name,
      })
      .from(claims)
      .leftJoin(users, eq(users.id, claims.resolvedBy))
      .where(eq(claims.storyId, id))
      // Flagged first, so they're the first thing you see
      .orderBy(sql`field(${claims.status}, 'flagged', 'resolved', 'supported')`, asc(claims.createdAt)),
    db
      .select({
        id: mapEvents.id,
        titleEn: mapEvents.titleEn,
        kind: mapEvents.kind,
        occurredAt: mapEvents.occurredAt,
        approved: mapEvents.approved,
      })
      .from(mapEvents)
      .where(eq(mapEvents.storyId, id))
      .orderBy(desc(mapEvents.occurredAt)),
    listActivity({ entityType: "story", entityId: id, limit: 15 }),
  ]);

  return {
    story,
    en: translations.find((t) => t.locale === "en") ?? null,
    ur: translations.find((t) => t.locale === "ur") ?? null,
    sources: sourceRows,
    claims: claimRows,
    events,
    history: history.rows,
  };
}

export type StoryEditorData = NonNullable<Awaited<ReturnType<typeof getStoryForEditor>>>;

// ---------------------------------------------------------------------------
// Conflicts, sections (topics) and the choices for story forms

export async function listConflictsAdmin() {
  const cUr = alias(conflictTranslations, "c_ur");
  return getDb()
    .select({
      id: conflicts.id,
      slug: conflicts.slug,
      status: conflicts.status,
      region: conflicts.region,
      sortOrder: conflicts.sortOrder,
      nameEn: conflictEn.name,
      nameUr: cUr.name,
      storyCount: sql`(select count(*) from ${stories} where ${stories.conflictId} = ${conflicts.id})`.mapWith(Number),
    })
    .from(conflicts)
    .leftJoin(conflictEn, and(eq(conflictEn.conflictId, conflicts.id), eq(conflictEn.locale, "en")))
    .leftJoin(cUr, and(eq(cUr.conflictId, conflicts.id), eq(cUr.locale, "ur")))
    .orderBy(asc(conflicts.sortOrder), asc(conflictEn.name));
}

export async function getConflictAdmin(id: string) {
  const db = getDb();
  const [conflict] = await db.select().from(conflicts).where(eq(conflicts.id, id)).limit(1);
  if (!conflict) return null;
  const tr = await db.select().from(conflictTranslations).where(eq(conflictTranslations.conflictId, id));
  return { conflict, en: tr.find((t) => t.locale === "en") ?? null, ur: tr.find((t) => t.locale === "ur") ?? null };
}

export async function listTopicsAdmin() {
  const tEn = alias(topicTranslations, "tp_en");
  const tUr = alias(topicTranslations, "tp_ur");
  return getDb()
    .select({
      id: topics.id,
      slug: topics.slug,
      sortOrder: topics.sortOrder,
      nameEn: tEn.name,
      nameUr: tUr.name,
      storyCount: sql`(select count(*) from ${stories} where ${stories.topicId} = ${topics.id})`.mapWith(Number),
    })
    .from(topics)
    .leftJoin(tEn, and(eq(tEn.topicId, topics.id), eq(tEn.locale, "en")))
    .leftJoin(tUr, and(eq(tUr.topicId, topics.id), eq(tUr.locale, "ur")))
    .orderBy(asc(topics.sortOrder), asc(tEn.name));
}

export async function taxonomyOptions() {
  const [c, t] = await Promise.all([listConflictsAdmin(), listTopicsAdmin()]);
  return {
    conflicts: c.map((x) => ({ id: x.id, label: x.nameEn ?? x.slug })),
    topics: t.map((x) => ({ id: x.id, label: x.nameEn ?? x.slug })),
  };
}

/** Recent stories, for the "linked story" choice on map events. */
export async function storyOptions(limit = 300) {
  const rows = await getDb()
    .select({ id: stories.id, slug: stories.slug, title: en.title })
    .from(stories)
    .leftJoin(en, and(eq(en.storyId, stories.id), eq(en.locale, "en")))
    .orderBy(desc(stories.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, label: r.title ?? r.slug }));
}

// ---------------------------------------------------------------------------
// Map events

export type MapFilter = "pending" | "approved" | "all";

export async function listMapEventsAdmin(filter: MapFilter = "all", limit = 200) {
  return getDb()
    .select({
      id: mapEvents.id,
      titleEn: mapEvents.titleEn,
      titleUr: mapEvents.titleUr,
      kind: mapEvents.kind,
      severity: mapEvents.severity,
      lat: mapEvents.lat,
      lng: mapEvents.lng,
      occurredAt: mapEvents.occurredAt,
      approved: mapEvents.approved,
      storyId: mapEvents.storyId,
      storyTitle: en.title,
      conflictName: conflictEn.name,
      onMapNow: sql`(${mapEvents.occurredAt} >= UTC_TIMESTAMP(3) - INTERVAL 7 DAY and ${mapEvents.occurredAt} <= UTC_TIMESTAMP(3))`.mapWith(flag),
    })
    .from(mapEvents)
    .leftJoin(en, and(eq(en.storyId, mapEvents.storyId), eq(en.locale, "en")))
    .leftJoin(conflictEn, and(eq(conflictEn.conflictId, mapEvents.conflictId), eq(conflictEn.locale, "en")))
    .where(filter === "all" ? undefined : eq(mapEvents.approved, filter === "approved"))
    .orderBy(desc(mapEvents.occurredAt))
    .limit(limit);
}

export async function mapEventCounts(): Promise<Record<MapFilter, number>> {
  const rows = await getDb().select({ approved: mapEvents.approved, n: count() }).from(mapEvents).groupBy(mapEvents.approved);
  const approved = rows.find((r) => r.approved)?.n ?? 0;
  const pending = rows.find((r) => !r.approved)?.n ?? 0;
  return { approved, pending, all: approved + pending };
}

export async function getMapEventAdmin(id: string) {
  const [row] = await getDb().select().from(mapEvents).where(eq(mapEvents.id, id)).limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Activity (audit log)

export async function listActivity({
  limit = 50,
  offset = 0,
  entityType,
  entityId,
}: { limit?: number; offset?: number; entityType?: string; entityId?: string } = {}) {
  const where = and(
    entityType ? eq(auditLog.entityType, entityType) : undefined,
    entityId ? eq(auditLog.entityId, entityId) : undefined,
  );
  const rows = await getDb()
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      details: auditLog.details,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      actorName: users.name,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(where)
    .orderBy(desc(auditLog.id))
    .limit(limit + 1)
    .offset(offset);
  return { rows: rows.slice(0, limit), more: rows.length > limit };
}
