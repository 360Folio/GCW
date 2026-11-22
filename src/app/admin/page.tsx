import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const recent = await getDb()
    .select({
      action: schema.auditLog.action,
      createdAt: schema.auditLog.createdAt,
      ipAddress: schema.auditLog.ipAddress,
    })
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.id))
    .limit(10);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">GCW Newsroom</p>
          <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="mt-8 rounded-lg border bg-white p-5">
        <h2 className="font-medium">Review inbox</h2>
        <p className="mt-1 text-sm text-neutral-600">
          AI drafts waiting for your approval will appear here (Phase 2).
        </p>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="font-medium">Recent account activity</h2>
        <ul className="mt-3 divide-y text-sm">
          {recent.map((entry, i) => (
            <li key={i} className="flex justify-between gap-4 py-2">
              <span>{entry.action}</span>
              <span className="text-neutral-500">
                {entry.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
