"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { CONFLICT_STATUS, conflicts, conflictTranslations, topics, topicTranslations } from "@/db/schema";
import { checked, done, fail, guard, isDuplicate, number, optional, refreshPublic, text, type ActionResult } from "@/lib/admin-guard";
import { slugify, SLUG_PATTERN } from "@/lib/editorial";

/* Conflicts (with hub pages) and sections (topics). */

function readSlug(fd: FormData, fallback: string): string | ActionResult {
  const slug = text(fd, "slug").toLowerCase() || slugify(fallback, 120);
  if (!slug || !SLUG_PATTERN.test(slug) || slug.length > 120)
    return fail("The web address can only use a–z, 0–9 and single hyphens.");
  return slug;
}

function readCoords(fd: FormData): { lat: number | null; lng: number | null } | ActionResult {
  const lat = number(fd, "lat");
  const lng = number(fd, "lng");
  if ((lat === null) !== (lng === null)) return fail("Give both latitude and longitude, or neither.");
  if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) return fail("Latitude must be between -90 and 90.");
  if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) return fail("Longitude must be between -180 and 180.");
  return { lat, lng };
}

// ---------------------------------------------------------------------------
// Conflicts

export async function saveConflict(id: string | null, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const nameEn = text(fd, "nameEn");
  if (!nameEn) return fail("Add the English name.");
  const slug = readSlug(fd, nameEn);
  if (typeof slug !== "string") return slug;
  const coords = readCoords(fd);
  if ("ok" in coords) return coords;
  const status = text(fd, "status");
  if (!(CONFLICT_STATUS as readonly string[]).includes(status)) return fail("Choose a status.");
  const started = text(fd, "startedOn");
  const startedOn = started ? new Date(`${started}T00:00:00Z`) : null;
  if (startedOn && Number.isNaN(startedOn.getTime())) return fail("Choose a valid start date.");
  const sortOrder = number(fd, "sortOrder") ?? 0;
  if (Number.isNaN(sortOrder)) return fail("The order must be a number.");

  const nameUr = text(fd, "nameUr");
  const summaryUr = optional(fd, "summaryUr");
  const explainerUr = optional(fd, "explainerUr");
  if (!nameUr && (summaryUr || explainerUr)) return fail("Add the Urdu name, or clear the other Urdu fields.");

  const conflictId = id ?? randomUUID();
  const base = {
    slug,
    status: status as (typeof CONFLICT_STATUS)[number],
    region: optional(fd, "region"),
    ...coords,
    startedOn,
    sortOrder: Math.round(sortOrder),
  };
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      if (id) await tx.update(conflicts).set(base).where(eq(conflicts.id, id));
      else await tx.insert(conflicts).values({ id: conflictId, ...base });

      const en = { name: nameEn, summary: optional(fd, "summaryEn"), explainer: optional(fd, "explainerEn") };
      await tx
        .insert(conflictTranslations)
        .values({ conflictId, locale: "en", ...en })
        .onDuplicateKeyUpdate({ set: en });
      if (nameUr) {
        const ur = { name: nameUr, summary: summaryUr, explainer: explainerUr };
        await tx
          .insert(conflictTranslations)
          .values({ conflictId, locale: "ur", ...ur })
          .onDuplicateKeyUpdate({ set: ur });
      } else {
        await tx
          .delete(conflictTranslations)
          .where(and(eq(conflictTranslations.conflictId, conflictId), eq(conflictTranslations.locale, "ur")));
      }
    });
  } catch (error) {
    if (isDuplicate(error)) return fail(`Another conflict already uses the address “${slug}”.`);
    throw error;
  }
  await log({ action: id ? "conflict.update" : "conflict.create", entityType: "conflict", entityId: conflictId, details: { slug } });
  refreshPublic({ taxonomy: true, map: true });
  if (!id) redirect(`/admin/conflicts/${conflictId}`);
  return done("Saved.");
}

export async function deleteConflict(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  if (!checked(fd, "confirm")) return fail("Tick the box to confirm.");
  const [row] = await getDb().select({ slug: conflicts.slug }).from(conflicts).where(eq(conflicts.id, id)).limit(1);
  if (row) {
    // Its stories and map events stay, without a conflict.
    await getDb().delete(conflicts).where(eq(conflicts.id, id));
    await log({ action: "conflict.delete", entityType: "conflict", entityId: id, details: { slug: row.slug } });
    refreshPublic({ taxonomy: true, map: true });
  }
  redirect("/admin/conflicts");
}

// ---------------------------------------------------------------------------
// Sections (topics)

export async function saveTopic(id: string | null, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const nameEn = text(fd, "nameEn");
  if (!nameEn) return fail("Add the English name.");
  if (nameEn.length > 120) return fail("The name is too long.");
  const slug = readSlug(fd, nameEn);
  if (typeof slug !== "string") return slug;
  const sortOrder = number(fd, "sortOrder") ?? 0;
  if (Number.isNaN(sortOrder)) return fail("The order must be a number.");
  const nameUr = text(fd, "nameUr");

  const topicId = id ?? randomUUID();
  try {
    await getDb().transaction(async (tx) => {
      if (id) await tx.update(topics).set({ slug, sortOrder: Math.round(sortOrder) }).where(eq(topics.id, id));
      else await tx.insert(topics).values({ id: topicId, slug, sortOrder: Math.round(sortOrder) });
      await tx.insert(topicTranslations).values({ topicId, locale: "en", name: nameEn }).onDuplicateKeyUpdate({ set: { name: nameEn } });
      if (nameUr) {
        await tx.insert(topicTranslations).values({ topicId, locale: "ur", name: nameUr }).onDuplicateKeyUpdate({ set: { name: nameUr } });
      } else {
        await tx.delete(topicTranslations).where(and(eq(topicTranslations.topicId, topicId), eq(topicTranslations.locale, "ur")));
      }
    });
  } catch (error) {
    if (isDuplicate(error)) return fail(`Another section already uses the address “${slug}”.`);
    throw error;
  }
  await log({ action: id ? "topic.update" : "topic.create", entityType: "topic", entityId: topicId, details: { slug } });
  refreshPublic({ taxonomy: true });
  return done(id ? "Saved." : `Section “${nameEn}” added.`);
}

export async function deleteTopic(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  if (!checked(fd, "confirm")) return fail("Tick the box to confirm.");
  const [row] = await getDb().select({ slug: topics.slug }).from(topics).where(eq(topics.id, id)).limit(1);
  if (!row) return done("Already deleted.");
  await getDb().delete(topics).where(eq(topics.id, id));
  await log({ action: "topic.delete", entityType: "topic", entityId: id, details: { slug: row.slug } });
  refreshPublic({ taxonomy: true });
  return done("Section deleted. Its stories stay, without a section.");
}
