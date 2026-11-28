import Link from "next/link";
import { utcLabel } from "@/lib/editorial";
import { Empty } from "./ui";

type Row = {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
  actorName: string | null;
};

const LABELS: Record<string, string> = {
  "auth.sign_in": "Signed in",
  "story.create": "Created a story",
  "story.update": "Changed story settings",
  "story.translation.save": "Saved text as a draft",
  "story.translation.approve": "Approved text",
  "story.translation.unapprove": "Moved text back to draft",
  "story.translation.delete": "Removed the Urdu text",
  "story.submit": "Sent to review",
  "story.publish": "Published",
  "story.schedule": "Scheduled",
  "story.unpublish": "Took off the site",
  "story.reject": "Rejected",
  "story.reopen": "Reopened",
  "story.delete": "Deleted a story",
  "source.add": "Added a source",
  "source.update": "Edited a source",
  "source.delete": "Removed a source",
  "claim.add": "Added a claim",
  "claim.supported": "Marked a claim as backed",
  "claim.resolve": "Resolved a claim",
  "claim.flag": "Flagged a claim",
  "claim.delete": "Removed a claim",
  "conflict.create": "Added a conflict",
  "conflict.update": "Edited a conflict",
  "conflict.delete": "Deleted a conflict",
  "topic.create": "Added a section",
  "topic.update": "Edited a section",
  "topic.delete": "Deleted a section",
  "map_event.create": "Added a map event",
  "map_event.update": "Edited a map event",
  "map_event.approve": "Approved a map event",
  "map_event.unapprove": "Took a map event off the map",
  "map_event.delete": "Deleted a map event",
};

function entityLink(r: Row) {
  if (!r.entityId) return null;
  if (r.entityType === "story" && r.action !== "story.delete") return `/admin/stories/${r.entityId}`;
  if (r.entityType === "conflict" && r.action !== "conflict.delete") return `/admin/conflicts/${r.entityId}`;
  if (r.entityType === "map_event" && r.action !== "map_event.delete") return `/admin/map/${r.entityId}`;
  return null;
}

function detail(r: Row) {
  const d = r.details ?? {};
  const bits: string[] = [];
  if (typeof d.locale === "string") bits.push(d.locale === "ur" ? "Urdu" : "English");
  if (typeof d.slug === "string") bits.push(d.slug);
  if (typeof d.url === "string") bits.push(d.url);
  return bits.join(" · ");
}

export function ActivityList({ rows, showIp = false }: { rows: Row[]; showIp?: boolean }) {
  if (!rows.length) return <Empty>No activity yet.</Empty>;
  return (
    <ul className="divide-y divide-neutral-100 text-sm">
      {rows.map((r) => {
        const href = entityLink(r);
        const label = LABELS[r.action] ?? r.action;
        return (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
            <span className="min-w-0">
              {href ? (
                <Link href={href} className="hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
              {detail(r) ? <span className="ms-2 break-all text-neutral-500">{detail(r)}</span> : null}
            </span>
            <span className="text-xs whitespace-nowrap text-neutral-500">
              {r.actorName ?? "System"} · {utcLabel(r.createdAt)}
              {showIp && r.ipAddress ? ` · ${r.ipAddress}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
