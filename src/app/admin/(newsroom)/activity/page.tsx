import type { Metadata } from "next";
import Link from "next/link";
import { listActivity } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActivityList } from "../../_ui/activity-list";
import { btn, Card, PageTitle } from "../../_ui/ui";

export const metadata: Metadata = { title: "Activity" };

const PER_PAGE = 50;

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const { rows, more } = await listActivity({ limit: PER_PAGE, offset: (page - 1) * PER_PAGE });
  return (
    <>
      <PageTitle kicker="Every sign-in, edit, approval and publish, newest first. Times are UTC.">Activity</PageTitle>
      <Card>
        <ActivityList rows={rows} showIp />
        <div className="mt-4 flex gap-2">
          {page > 1 ? (
            <Link href={`/admin/activity?page=${page - 1}`} className={btn}>
              Newer
            </Link>
          ) : null}
          {more ? (
            <Link href={`/admin/activity?page=${page + 1}`} className={btn}>
              Older
            </Link>
          ) : null}
        </div>
      </Card>
    </>
  );
}
