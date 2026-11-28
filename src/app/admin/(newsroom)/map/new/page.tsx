import type { Metadata } from "next";
import Link from "next/link";
import { storyOptions, taxonomyOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { toUtcInput } from "@/lib/editorial";
import { MapEventForm } from "../../../_ui/map-event-form";
import { PageTitle } from "../../../_ui/ui";

export const metadata: Metadata = { title: "Add map event" };

export default async function NewMapEventPage({ searchParams }: PageProps<"/admin/map/new">) {
  await requireAdmin();
  const sp = await searchParams;
  const [tax, storiesList] = await Promise.all([taxonomyOptions(), storyOptions()]);
  const story = typeof sp.story === "string" && storiesList.some((s) => s.id === sp.story) ? sp.story : undefined;
  return (
    <div className="max-w-3xl">
      <PageTitle
        kicker={
          story ? (
            <Link href={`/admin/stories/${story}`} className="hover:underline">
              ← Back to the story
            </Link>
          ) : (
            <Link href="/admin/map" className="hover:underline">
              ← Map events
            </Link>
          )
        }
      >
        Add map event
      </PageTitle>
      <MapEventForm event={null} conflicts={tax.conflicts} storyOptions={storiesList} defaultStoryId={story} defaultTime={toUtcInput(new Date())} />
    </div>
  );
}
