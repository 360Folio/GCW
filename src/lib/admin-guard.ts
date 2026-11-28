import "server-only";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { requireAdmin, type AdminSession } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { TAGS } from "@/lib/public-data";

/** What every newsroom form gets back. */
export type ActionResult = { ok: boolean; message: string };
export const done = (message: string): ActionResult => ({ ok: true, message });
export const fail = (message: string): ActionResult => ({ ok: false, message });

/**
 * Start of every newsroom action: actions can be called by a direct POST,
 * so each one checks the login (and two-factor) itself.
 */
export async function guard(): Promise<{ session: AdminSession; log: (entry: LogEntry) => Promise<void> }> {
  const session = await requireAdmin();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return {
    session,
    log: (entry) =>
      writeAudit({
        actorId: session.user.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details ?? null,
        ipAddress: ip,
      }),
  };
}

type LogEntry = {
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
};

/** Clears the public site's cached pages so readers see a change at once. */
export function refreshPublic(opts: { stories?: boolean; slugs?: (string | null | undefined)[]; map?: boolean; taxonomy?: boolean }) {
  if (opts.stories || opts.slugs?.length) updateTag(TAGS.stories);
  for (const slug of new Set(opts.slugs ?? [])) if (slug) updateTag(`story:${slug}`);
  if (opts.map) updateTag(TAGS.map);
  if (opts.taxonomy) {
    updateTag(TAGS.taxonomy);
    updateTag(TAGS.stories); // story cards show conflict and topic names
  }
}

// ---------------------------------------------------------------------------
// Reading form fields

export const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
export const optional = (fd: FormData, name: string) => text(fd, name) || null;
export const checked = (fd: FormData, name: string) => fd.get(name) === "on" || fd.get(name) === "true";

export function number(fd: FormData, name: string): number | null {
  const v = text(fd, name);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** True for MariaDB's "duplicate key" error (e.g. a slug already in use). */
export const isDuplicate = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
};
