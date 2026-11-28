"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { MAP_EVENT_KIND, mapEvents, type MapEventKind } from "@/db/schema";
import { checked, done, fail, guard, number, optional, refreshPublic, text, type ActionResult } from "@/lib/admin-guard";
import { parseUtcInput } from "@/lib/editorial";

/* Events on the front-page map. Only approved events from the past 7 days show. */

export async function saveMapEvent(id: string | null, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const titleEn = text(fd, "titleEn");
  if (!titleEn) return fail("Add a short English description.");
  if (titleEn.length > 300 || text(fd, "titleUr").length > 300) return fail("Descriptions can be 300 characters at most.");
  const lat = number(fd, "lat");
  const lng = number(fd, "lng");
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return fail("Choose the place on the map, or type a latitude (-90 to 90) and longitude (-180 to 180).");
  const occurredAt = parseUtcInput(text(fd, "occurredAt"));
  if (!occurredAt) return fail("Choose when it happened (UTC).");
  const kind = text(fd, "kind");
  if (!(MAP_EVENT_KIND as readonly string[]).includes(kind)) return fail("Choose a kind of event.");
  const severity = number(fd, "severity");
  if (!severity || severity < 1 || severity > 5) return fail("Severity is 1 (low) to 5 (high).");

  const values = {
    titleEn,
    titleUr: optional(fd, "titleUr"),
    lat,
    lng,
    occurredAt,
    kind: kind as MapEventKind,
    severity: Math.round(severity),
    conflictId: optional(fd, "conflictId"),
    storyId: optional(fd, "storyId"),
    approved: checked(fd, "approved"),
  };
  const eventId = id ?? randomUUID();
  if (id) await getDb().update(mapEvents).set(values).where(eq(mapEvents.id, id));
  else await getDb().insert(mapEvents).values({ id: eventId, ...values });

  await log({
    action: id ? "map_event.update" : "map_event.create",
    entityType: "map_event",
    entityId: eventId,
    details: { approved: values.approved },
  });
  refreshPublic({ map: true });
  if (!id) redirect(fd.get("back") === "story" && values.storyId ? `/admin/stories/${values.storyId}#map-events` : "/admin/map");
  return done(values.approved ? "Saved. It is on the map." : "Saved. It is not on the map until you approve it.");
}

export async function setMapEventApproved(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  const approved = fd.get("intent") === "approve";
  await getDb().update(mapEvents).set({ approved }).where(eq(mapEvents.id, id));
  await log({ action: approved ? "map_event.approve" : "map_event.unapprove", entityType: "map_event", entityId: id });
  refreshPublic({ map: true });
  return done(approved ? "Approved." : "Taken off the map.");
}

export async function deleteMapEvent(id: string, fd: FormData): Promise<ActionResult> {
  const { log } = await guard();
  if (!checked(fd, "confirm")) return fail("Tick the box to confirm.");
  await getDb().delete(mapEvents).where(eq(mapEvents.id, id));
  await log({ action: "map_event.delete", entityType: "map_event", entityId: id });
  refreshPublic({ map: true });
  redirect("/admin/map");
}
