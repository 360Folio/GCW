import type { Metadata } from "next";
import Link from "next/link";
import { listStories, storyCounts, type StoryFilter } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { StoryTable } from "../../_ui/story-table";
import { btn, btnPrimary, Card, input, PageTitle, Tabs } from "../../_ui/ui";

export const metadata: Metadata = { title: "Stories" };

const FILTERS: { key: StoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "in_review", label: "In review" },
  { key: "approved", label: "Ready" },
  { key: "published", label: "Published" },
  { key: "scheduled", label: "Scheduled" },
  { key: "urdu", label: "Urdu to approve" },
  { key: "rejected", label: "Rejected" },
];

export default async function StoriesPage({ searchParams }: PageProps<"/admin/stories">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (FILTERS.find((f) => f.key === sp.status)?.key ?? "all") as StoryFilter;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const [rows, counts] = await Promise.all([listStories(status, q), storyCounts()]);
  const href = (key: string) => `/admin/stories?${new URLSearchParams({ ...(key !== "all" ? { status: key } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageTitle
        actions={
          <Link href="/admin/stories/new" className={btnPrimary}>
            New story
          </Link>
        }
      >
        Stories
      </PageTitle>
      <form action="/admin/stories" className="mb-4 flex max-w-md gap-2" role="search">
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={q} placeholder="Find by headline or address" aria-label="Find a story" className={`${input} !mt-0`} />
        <button className={btn}>Find</button>
      </form>
      <Tabs current={status} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: href(f.key), count: counts[f.key] }))} />
      <Card>
        <StoryTable rows={rows} empty={q ? `No stories match “${q}”.` : "No stories here."} />
        {rows.length === 100 ? <p className="mt-3 text-xs text-neutral-500">Showing the 100 most recently changed. Use Find to narrow down.</p> : null}
      </Card>
    </>
  );
}
