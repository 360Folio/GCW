import Link from "next/link";
import type { StoryRow } from "@/lib/admin-data";
import { utcLabel } from "@/lib/editorial";
import { Badge, Empty, StoryStatus, TranslationStatus } from "./ui";

export function StoryTable({ rows, empty }: { rows: StoryRow[]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-5 py-2 font-medium">Story</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Checks</th>
            <th className="px-5 py-2 font-medium whitespace-nowrap">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((r) => (
            <tr key={r.id} className="align-top hover:bg-neutral-50">
              <td className="px-5 py-3">
                <Link href={`/admin/stories/${r.id}`} className="font-medium hover:underline">
                  {r.titleEn ?? r.titleUr ?? r.slug}
                </Link>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {r.conflictName ? `${r.conflictName} · ` : ""}
                  {r.origin === "ai" ? "AI draft" : "Written by editor"}
                </div>
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  <StoryStatus status={r.status} scheduled={r.scheduled} />
                  <TranslationStatus status={r.enStatus} lang="EN" />
                  <TranslationStatus status={r.urStatus} lang="UR" />
                </div>
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-wrap gap-1">
                  {r.flagged ? <Badge tone="red">{r.flagged} flagged</Badge> : <Badge tone="green">No flags</Badge>}
                  <Badge tone={r.sourceCount ? "grey" : "red"}>
                    {r.sourceCount} source{r.sourceCount === 1 ? "" : "s"}
                  </Badge>
                </div>
              </td>
              <td className="px-5 py-3 text-xs whitespace-nowrap text-neutral-500">
                {utcLabel(r.updatedAt)}
                {r.status === "published" && r.publishedAt ? <div>Live: {utcLabel(r.publishedAt)}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
