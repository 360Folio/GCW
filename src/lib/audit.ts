import "server-only";
import { getDb, schema } from "@/db";

type AuditEntry = {
  actorId: string | null;
  action: string; // e.g. "auth.sign_in", "story.publish"
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/** Records who did what. Never throws: a logging failure mustn't block the action. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb().insert(schema.auditLog).values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {
    console.error("audit log write failed", error);
  }
}
