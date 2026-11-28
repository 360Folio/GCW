import type { Metadata } from "next";
import Link from "next/link";
import { setMapEventApproved } from "@/app/admin/actions/map-events";
import { listMapEventsAdmin, mapEventCounts, type MapFilter } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { utcLabel } from "@/lib/editorial";
import { ActionForm } from "../../_ui/action-form";
import { KIND_LABEL } from "../../_ui/map-event-form";
import { Badge, btn, btnPrimary, Card, Empty, PageTitle, Tabs } from "../../_ui/ui";

export const metadata: Metadata = { title: "Map events" };

const FILTERS: { key: MapFilter; label: string }[] = [
  { key: "pending", label: "To approve" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
];

export default async function MapEventsPage({ searchParams }: PageProps<"/admin/map">) {
  await requireAdmin();
  const sp = await searchParams;
  const show = FILTERS.find((f) => f.key === sp.show)?.key ?? "all";
  const [rows, counts] = await Promise.all([listMapEventsAdmin(show), mapEventCounts()]);

  return (
    <>
      <PageTitle
        kicker="The front-page map shows approved events from the past 7 days."
        actions={
          <Link href="/admin/map/new" className={btnPrimary}>
            Add event
          </Link>
        }
      >
        Map events
      </PageTitle>
      <Tabs current={show} items={FILTERS.map((f) => ({ ...f, href: `/admin/map?show=${f.key}`, count: counts[f.key] }))} />
      <Card>
        {rows.length ? (
          <ul className="divide-y divide-neutral-100">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/map/${e.id}`} className="font-medium hover:underline">
                    {e.titleEn}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-neutral-500">
                    <Badge tone={e.severity >= 4 ? "red" : "grey"}>
                      {KIND_LABEL[e.kind]} · {e.severity}
                    </Badge>
                    {e.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Not approved</Badge>}
                    {e.approved && !e.onMapNow ? <Badge>Older than 7 days, not shown</Badge> : null}
                    {!e.titleUr ? <Badge>No Urdu</Badge> : null}
                    <span>
                      {utcLabel(e.occurredAt)}
                      {e.conflictName ? ` · ${e.conflictName}` : ""}
                    </span>
                  </div>
                  {e.storyId ? (
                    <Link href={`/admin/stories/${e.storyId}`} className="mt-1 block text-xs text-neutral-600 hover:underline">
                      Story: {e.storyTitle ?? "untitled"}
                    </Link>
                  ) : null}
                </div>
                <ActionForm action={setMapEventApproved.bind(null, e.id)}>
                  {e.approved ? (
                    <button name="intent" value="unapprove" className={btn}>
                      Take off map
                    </button>
                  ) : (
                    <button name="intent" value="approve" className={btnPrimary}>
                      Approve
                    </button>
                  )}
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{show === "pending" ? "Nothing waiting for approval." : "No map events yet."}</Empty>
        )}
      </Card>
    </>
  );
}
