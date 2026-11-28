import type { Metadata } from "next";
import Link from "next/link";
import { getInbox } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActivityList } from "../_ui/activity-list";
import { StoryTable } from "../_ui/story-table";
import { btnPrimary, Card, PageTitle } from "../_ui/ui";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const session = await requireAdmin();
  const inbox = await getInbox();
  const c = inbox.counts;

  const tiles = [
    { label: "Waiting for review", n: c.draft + c.in_review, href: "/admin/stories?status=in_review" },
    { label: "Ready, not live", n: c.approved, href: "/admin/stories?status=approved" },
    { label: "Scheduled", n: c.scheduled, href: "/admin/stories?status=scheduled" },
    { label: "Urdu to approve", n: c.urdu, href: "/admin/stories?status=urdu" },
    { label: "Map events to approve", n: inbox.pendingEvents, href: "/admin/map?show=pending" },
  ];

  return (
    <>
      <PageTitle
        kicker={`Welcome, ${session.user.name}`}
        actions={
          <Link href="/admin/stories/new" className={btnPrimary}>
            New story
          </Link>
        }
      >
        Review inbox
      </PageTitle>

      <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400">
              <span className="block text-2xl font-semibold tabular-nums">{t.n}</span>
              <span className="text-sm text-neutral-600">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="space-y-6">
        <Card title="Waiting for review">
          <StoryTable rows={inbox.review} empty="Nothing to review. New drafts will appear here." />
        </Card>
        {inbox.ready.length ? (
          <Card title="Ready to publish">
            <StoryTable rows={inbox.ready} empty="" />
          </Card>
        ) : null}
        {inbox.urdu.length ? (
          <Card title="Live in English, Urdu still to approve">
            <StoryTable rows={inbox.urdu} empty="" />
          </Card>
        ) : null}
        <Card
          title="Recent activity"
          actions={
            <Link href="/admin/activity" className="text-sm underline">
              All activity
            </Link>
          }
        >
          <ActivityList rows={inbox.recent} />
        </Card>
      </div>
    </>
  );
}
