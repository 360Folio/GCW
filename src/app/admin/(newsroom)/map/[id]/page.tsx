import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMapEvent } from "@/app/admin/actions/map-events";
import { getMapEventAdmin, storyOptions, taxonomyOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../../../_ui/action-form";
import { MapEventForm } from "../../../_ui/map-event-form";
import { Card, ConfirmDelete, PageTitle } from "../../../_ui/ui";

export const metadata: Metadata = { title: "Edit map event" };

export default async function EditMapEventPage({ params }: PageProps<"/admin/map/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [event, tax, storiesList] = await Promise.all([getMapEventAdmin(id), taxonomyOptions(), storyOptions()]);
  if (!event) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        kicker={
          <Link href="/admin/map" className="hover:underline">
            ← Map events
          </Link>
        }
      >
        {event.titleEn}
      </PageTitle>
      <MapEventForm event={event} conflicts={tax.conflicts} storyOptions={storiesList} defaultTime="" />
      <Card title="Delete event">
        <ActionForm action={deleteMapEvent.bind(null, id)}>
          <ConfirmDelete label="Delete event" what="this map event" />
        </ActionForm>
      </Card>
    </div>
  );
}
