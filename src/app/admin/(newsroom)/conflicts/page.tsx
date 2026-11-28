import type { Metadata } from "next";
import Link from "next/link";
import { listConflictsAdmin } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { Badge, btnPrimary, Card, Empty, PageTitle } from "../../_ui/ui";

export const metadata: Metadata = { title: "Conflicts" };

const STATUS = { active: ["Active", "red"], frozen: ["Frozen", "blue"], resolved: ["Resolved", "grey"] } as const;

export default async function ConflictsPage() {
  await requireAdmin();
  const rows = await listConflictsAdmin();
  return (
    <>
      <PageTitle
        actions={
          <Link href="/admin/conflicts/new" className={btnPrimary}>
            Add conflict
          </Link>
        }
      >
        Conflicts
      </PageTitle>
      <Card>
        {rows.length ? (
          <ul className="divide-y divide-neutral-100">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/conflicts/${c.id}`} className="font-medium hover:underline">
                    {c.nameEn ?? c.slug}
                  </Link>
                  {c.nameUr ? (
                    <span lang="ur" dir="rtl" className="ms-3 font-urdu text-neutral-600">
                      {c.nameUr}
                    </span>
                  ) : (
                    <span className="ms-3 text-xs text-amber-700">No Urdu name</span>
                  )}
                  <div className="text-xs text-neutral-500">
                    {c.region ? `${c.region} · ` : ""}
                    {c.storyCount} stor{c.storyCount === 1 ? "y" : "ies"} · /{c.slug}
                  </div>
                </div>
                <Badge tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No conflicts yet.</Empty>
        )}
      </Card>
    </>
  );
}
