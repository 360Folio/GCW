"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { claims, CLAIM_KIND, LOCALES, sources, stories, storyTranslations, type Locale } from "@/db/schema";
import {
  checked,
  done,
  fail,
  guard,
  isDuplicate,
  optional,
  refreshPublic,
  text,
  type ActionResult,
} from "@/lib/admin-guard";
import { isHttpUrl, parseUtcInput, publishBlockers, slugify, SLUG_PATTERN } from "@/lib/editorial";

/*
 * Everything the editor does to a story. Each action checks the login, writes
 * to the activity log against the story, and clears the public pages it
 * affects. Nothing reaches readers unless the story is published AND that
 * language's text is approved (see src/lib/public-data.ts).
 */

type StoryRow = typeof stories.$inferSelect;

async function loadStory(id: string): Promise<StoryRow | null> {
  const [row] = await getDb().select().from(stories).where(eq(stories.id, id)).limit(1);
  return row ?? null;
}

const isLive = (s: StoryRow) => s.status === "published";

async function publishFacts(storyId: string) {
  const db = getDb();
  const [[enRow], [flagged], [srcs]] = await Promise.all([
    db
      .select({ status: storyTranslations.status })
      .from(storyTranslations)
      .where(and(eq(storyTranslations.storyId, storyId), eq(storyTranslations.locale, "en"))),
    db.select({ n: count() }).from(claims).where(and(eq(claims.storyId, storyId), eq(claims.status, "flagged"))),
    db.select({ n: count() }).from(sources).where(eq(sources.storyId, storyId)),
  ]);
  return { englishApproved: enRow?.status === "approved", flaggedClaims: flagged.n, sourceCount: srcs.n };
}

/** A live story with a new flagged claim comes off the site until it's fixed. */
async function pullIfFlagged(story: StoryRow): Promise<boolean> {
  if (!isLive(story)) return false;
  const facts = await publishFacts(story.id);
  if (facts.flaggedClaims === 0) return false;
  await getDb().update(stories).set({ status: "in_review" }).where(eq(stories.id, story.id));
  return true;
}

function readSlug(fd: FormData, fallbackTitle: string): string | ActionResult {
  const slug = text(fd, "slug").toLowerCase() || slugify(fallbackTitle);
  if (!slug) return fail("Give the story a web address (letters, numbers and hyphens).");
  if (!SLUG_PATTERN.test(slug) || slug.length > 160)
    return fail("The web address can only use a–z, 0–9 and single hyphens.");
  return slug;
}

// ---------------------------------------------------------------------------
// Create and settings

export async function createStory(fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const title = text(fd, "title");
  const body = text(fd, "body");
  if (!title) return fail("Add a headline.");
  if (title.length > 300) return fail("The headline is too long (300 characters at most).");
  const slug = readSlug(fd, title);
  if (typeof slug !== "string") return slug;

  const id = randomUUID();
  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(stories).values({
        id,
        slug,
        status: "draft",
        origin: "editor",
        conflictId: optional(fd, "conflictId"),
        topicId: optional(fd, "topicId"),
      });
      await tx.insert(storyTranslations).values({
        storyId: id,
        locale: "en",
        title,
        summary: optional(fd, "summary"),
        body,
        status: "draft",
        source: "editor",
      });
    });
  } catch (error) {
    if (isDuplicate(error)) return fail(`Another story already uses the address “${slug}”.`);
    throw error;
  }
  await log({ action: "story.create", entityType: "story", entityId: id, details: { slug, by: session.user.email } });
  redirect(`/admin/stories/${id}`);
}

export async function updateStorySettings(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const story = await loadStory(id);
  if (!story) return fail("This story no longer exists.");
  const slug = readSlug(fd, "");
  if (typeof slug !== "string") return slug;
  const image = optional(fd, "featuredImageUrl");
  if (image && !isHttpUrl(image)) return fail("The image address must start with https://");

  try {
    await getDb()
      .update(stories)
      .set({
        slug,
        conflictId: optional(fd, "conflictId"),
        topicId: optional(fd, "topicId"),
        featuredImageUrl: image,
        featuredImageCredit: optional(fd, "featuredImageCredit"),
      })
      .where(eq(stories.id, id));
  } catch (error) {
    if (isDuplicate(error)) return fail(`Another story already uses the address “${slug}”.`);
    throw error;
  }
  await log({
    action: "story.update",
    entityType: "story",
    entityId: id,
    details: slug !== story.slug ? { slug, previousSlug: story.slug } : undefined,
  });
  refreshPublic({ slugs: [story.slug, slug], taxonomy: true });
  return done(slug !== story.slug && isLive(story) ? "Saved. The old address no longer works." : "Saved.");
}

// ---------------------------------------------------------------------------
// English and Urdu text

const asLocale = (v: string): Locale | null => ((LOCALES as readonly string[]).includes(v) ? (v as Locale) : null);

export async function saveTranslation(id: string, lang: string, fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const locale = asLocale(lang);
  if (!locale) return fail("Unknown language.");
  const story = await loadStory(id);
  if (!story) return fail("This story no longer exists.");

  const title = text(fd, "title");
  const body = text(fd, "body");
  if (!title) return fail("Add a headline.");
  if (!body) return fail("Add the story text.");
  if (title.length > 300) return fail("The headline is too long (300 characters at most).");
  const seoTitle = optional(fd, "seoTitle");
  const seoDescription = optional(fd, "seoDescription");
  if (seoTitle && seoTitle.length > 300) return fail("The search title is too long (300 characters at most).");
  if (seoDescription && seoDescription.length > 500) return fail("The search description is too long (500 characters at most).");

  const approve = fd.get("intent") === "approve";
  const values = {
    title,
    summary: optional(fd, "summary"),
    body,
    seoTitle,
    seoDescription,
    status: approve ? ("approved" as const) : ("draft" as const),
    approvedAt: approve ? new Date() : null,
    approvedBy: approve ? session.user.id : null,
  };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(storyTranslations)
    .where(and(eq(storyTranslations.storyId, id), eq(storyTranslations.locale, locale)))
    .limit(1);
  const changed = !existing || existing.title !== title || existing.body !== body || existing.summary !== values.summary;

  if (existing) {
    await db
      .update(storyTranslations)
      .set({ ...values, ...(changed ? { source: "editor" as const } : {}) })
      .where(and(eq(storyTranslations.storyId, id), eq(storyTranslations.locale, locale)));
  } else {
    await db.insert(storyTranslations).values({ storyId: id, locale, source: "editor", ...values });
  }
  // A brand-new story moves to review once its text has been worked on.
  if (story.status === "draft" && approve) await db.update(stories).set({ status: "in_review" }).where(eq(stories.id, id));

  await log({
    action: approve ? "story.translation.approve" : "story.translation.save",
    entityType: "story",
    entityId: id,
    details: { locale, edited: changed },
  });
  refreshPublic({ slugs: [story.slug] });

  const name = locale === "en" ? "English" : "Urdu";
  if (approve) return done(`${name} text saved and approved.`);
  if (isLive(story) && existing?.status === "approved")
    return done(`${name} text saved as a draft. It is off the site in ${name} until you approve it again.`);
  return done(`${name} text saved as a draft.`);
}

export async function setTranslationStatus(id: string, lang: string, fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const locale = asLocale(lang);
  if (!locale) return fail("Unknown language.");
  const story = await loadStory(id);
  if (!story) return fail("This story no longer exists.");
  const approve = fd.get("intent") === "approve";
  const db = getDb();
  const where = and(eq(storyTranslations.storyId, id), eq(storyTranslations.locale, locale));
  const [row] = await db.select({ status: storyTranslations.status }).from(storyTranslations).where(where).limit(1);
  if (!row) return fail("Write this language first.");

  await db
    .update(storyTranslations)
    .set(approve ? { status: "approved", approvedAt: new Date(), approvedBy: session.user.id } : { status: "draft", approvedAt: null, approvedBy: null })
    .where(where);
  await log({
    action: approve ? "story.translation.approve" : "story.translation.unapprove",
    entityType: "story",
    entityId: id,
    details: { locale },
  });
  refreshPublic({ slugs: [story.slug] });
  const name = locale === "en" ? "English" : "Urdu";
  return done(approve ? `${name} approved.` : `${name} moved back to draft${isLive(story) ? ` and taken off the site in ${name}` : ""}.`);
}

export async function deleteTranslation(id: string, lang: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  if (lang !== "ur") return fail("Only the Urdu text can be removed. Delete the story instead.");
  if (!checked(fd, "confirm")) return fail("Tick the box to confirm.");
  const story = await loadStory(id);
  if (!story) return fail("This story no longer exists.");
  await getDb()
    .delete(storyTranslations)
    .where(and(eq(storyTranslations.storyId, id), eq(storyTranslations.locale, "ur")));
  await log({ action: "story.translation.delete", entityType: "story", entityId: id, details: { locale: "ur" } });
  refreshPublic({ slugs: [story.slug] });
  redirect(`/admin/stories/${id}`);
}

// ---------------------------------------------------------------------------
// Workflow: review, publish, unpublish, reject

export async function changeStoryStatus(id: string, fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const story = await loadStory(id);
  if (!story) return fail("This story no longer exists.");
  const intent = String(fd.get("intent") ?? "");
  const db = getDb();

  if (intent === "publish") {
    const blockers = publishBlockers(await publishFacts(id));
    if (blockers.length) return fail(`Not published yet: ${blockers.join(" ")}`);
    const when = text(fd, "publishAt") ? parseUtcInput(text(fd, "publishAt")) : new Date();
    if (!when) return fail("Choose a valid publish time.");
    await db
      .update(stories)
      .set({ status: "published", publishedAt: when, approvedBy: session.user.id })
      .where(eq(stories.id, id));
    const scheduled = when.getTime() > Date.now() + 60_000;
    await log({
      action: scheduled ? "story.schedule" : "story.publish",
      entityType: "story",
      entityId: id,
      details: { slug: story.slug, publishedAt: when.toISOString() },
    });
    refreshPublic({ slugs: [story.slug], map: true });
    return done(scheduled ? "Scheduled. It goes live at the time you chose." : "Published. It is on the site now.");
  }

  const next = ({ submit: "in_review", unpublish: "approved", reject: "rejected", reopen: "in_review" } as const)[
    intent as "submit" | "unpublish" | "reject" | "reopen"
  ];
  if (!next) return fail("Unknown action.");
  await db.update(stories).set({ status: next }).where(eq(stories.id, id));
  await log({ action: `story.${intent}`, entityType: "story", entityId: id, details: { from: story.status } });
  if (isLive(story)) refreshPublic({ slugs: [story.slug], map: true });
  return done(
    {
      submit: "Moved to review.",
      unpublish: "Taken off the site. It stays ready to publish again.",
      reject: isLive(story) ? "Rejected and taken off the site." : "Rejected.",
      reopen: "Reopened for review.",
    }[intent as "submit" | "unpublish" | "reject" | "reopen"],
  );
}

export async function deleteStory(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  if (!checked(fd, "confirm")) return fail("Tick the box to confirm.");
  const story = await loadStory(id);
  if (!story) redirect("/admin/stories");
  await getDb().delete(stories).where(eq(stories.id, id)); // sources, claims and text go with it
  await log({ action: "story.delete", entityType: "story", entityId: id, details: { slug: story.slug, status: story.status } });
  refreshPublic({ slugs: [story.slug], map: true });
  redirect("/admin/stories");
}

// ---------------------------------------------------------------------------
// Sources

function readSource(fd: FormData) {
  const url = text(fd, "url");
  if (!isHttpUrl(url)) return fail("The source needs a web address starting with https://");
  if (url.length > 2048) return fail("That web address is too long.");
  const dateText = text(fd, "publishedAt");
  const publishedAt = dateText ? new Date(`${dateText}T00:00:00Z`) : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) return fail("Choose a valid date.");
  return {
    url,
    publisher: optional(fd, "publisher")?.slice(0, 200) ?? null,
    title: optional(fd, "title")?.slice(0, 500) ?? null,
    publishedAt,
    excerpt: optional(fd, "excerpt"),
  };
}

export async function addSource(storyId: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const story = await loadStory(storyId);
  if (!story) return fail("This story no longer exists.");
  const values = readSource(fd);
  if ("ok" in values) return values;
  const id = randomUUID();
  await getDb().insert(sources).values({ id, storyId, ...values });
  await log({ action: "source.add", entityType: "story", entityId: storyId, details: { sourceId: id, url: values.url } });
  refreshPublic({ slugs: [story.slug] });
  return done("Source added.");
}

export async function updateSource(storyId: string, sourceId: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const story = await loadStory(storyId);
  if (!story) return fail("This story no longer exists.");
  const db = getDb();
  const where = and(eq(sources.id, sourceId), eq(sources.storyId, storyId));

  if (fd.get("intent") === "delete") {
    await db.delete(sources).where(where); // claims that cited it keep their text
    await log({ action: "source.delete", entityType: "story", entityId: storyId, details: { sourceId } });
    refreshPublic({ slugs: [story.slug] });
    return done("Source removed.");
  }
  const values = readSource(fd);
  if ("ok" in values) return values;
  await db.update(sources).set(values).where(where);
  await log({ action: "source.update", entityType: "story", entityId: storyId, details: { sourceId } });
  refreshPublic({ slugs: [story.slug] });
  return done("Source saved.");
}

// ---------------------------------------------------------------------------
// Claims (the fact-check list)

export async function addClaim(storyId: string, fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const story = await loadStory(storyId);
  if (!story) return fail("This story no longer exists.");
  const claimText = text(fd, "text");
  if (!claimText) return fail("Write the fact to check.");
  const kind = text(fd, "kind");
  const sourceId = optional(fd, "sourceId");
  const status = sourceId ? "supported" : "flagged";
  const id = randomUUID();
  await getDb()
    .insert(claims)
    .values({
      id,
      storyId,
      text: claimText,
      kind: (CLAIM_KIND as readonly string[]).includes(kind) ? (kind as (typeof CLAIM_KIND)[number]) : "other",
      status,
      sourceId,
      ...(status === "supported" ? { resolvedBy: session.user.id, resolvedAt: new Date() } : {}),
    });
  await log({ action: "claim.add", entityType: "story", entityId: storyId, details: { claimId: id, status } });
  const pulled = await pullIfFlagged(story);
  refreshPublic({ slugs: [story.slug] });
  if (pulled) return done("Claim flagged. The story is off the site until every flag is resolved.");
  return done(status === "supported" ? "Claim added and marked as backed by the source." : "Claim added and flagged for checking.");
}

export async function updateClaim(storyId: string, claimId: string, fd: FormData): Promise<ActionResult> {
  const { session, log } = await guard();
  const story = await loadStory(storyId);
  if (!story) return fail("This story no longer exists.");
  const db = getDb();
  const where = and(eq(claims.id, claimId), eq(claims.storyId, storyId));
  const intent = String(fd.get("intent") ?? "");
  const sourceId = optional(fd, "sourceId");
  const note = optional(fd, "note");

  if (intent === "delete") {
    await db.delete(claims).where(where);
    await log({ action: "claim.delete", entityType: "story", entityId: storyId, details: { claimId } });
    refreshPublic({ slugs: [story.slug] });
    return done("Claim removed.");
  }
  if (intent === "supported") {
    if (!sourceId) return fail("Choose the source that backs this claim.");
    await db.update(claims).set({ status: "supported", sourceId, note, resolvedBy: session.user.id, resolvedAt: new Date() }).where(where);
  } else if (intent === "resolve") {
    if (!note) return fail("Write a short note on how you resolved it (for example: “removed from the text”).");
    await db.update(claims).set({ status: "resolved", sourceId, note, resolvedBy: session.user.id, resolvedAt: new Date() }).where(where);
  } else if (intent === "flag") {
    await db.update(claims).set({ status: "flagged", note, resolvedBy: null, resolvedAt: null }).where(where);
  } else {
    return fail("Unknown action.");
  }
  await log({ action: `claim.${intent}`, entityType: "story", entityId: storyId, details: { claimId } });
  const pulled = intent === "flag" && (await pullIfFlagged(story));
  refreshPublic({ slugs: [story.slug] });
  if (pulled) return done("Flagged. The story is off the site until every flag is resolved.");
  return done({ supported: "Marked as backed by the source.", resolve: "Marked as resolved.", flag: "Flagged for checking." }[intent]!);
}
