import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addClaim,
  addSource,
  changeStoryStatus,
  deleteStory,
  setTranslationStatus,
  updateClaim,
  updateSource,
  updateStorySettings,
} from "@/app/admin/actions/stories";
import { CLAIM_KIND } from "@/db/schema";
import { getStoryForEditor, taxonomyOptions, type StoryEditorData } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { hostOf, publishBlockers, toUtcInput, utcLabel, wordCount } from "@/lib/editorial";
import { ActionForm } from "../../../_ui/action-form";
import { ActivityList } from "../../../_ui/activity-list";
import { TaxonomySelects } from "../../../_ui/story-fields";
import { Badge, btn, btnDanger, btnPrimary, Card, ConfirmDelete, Empty, Field, input, PageTitle, StoryStatus } from "../../../_ui/ui";

export const metadata: Metadata = { title: "Edit story" };

export default async function StoryEditorPage({ params }: PageProps<"/admin/stories/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [data, options] = await Promise.all([getStoryForEditor(id), taxonomyOptions()]);
  if (!data) notFound();
  const { story, en, ur } = data;
  const liveEn = story.status === "published" && !story.scheduled && en?.status === "approved";
  const liveUr = story.status === "published" && !story.scheduled && ur?.status === "approved";

  return (
    <>
      <PageTitle
        kicker={
          <Link href="/admin/stories" className="hover:underline">
            ← Stories
          </Link>
        }
        actions={
          <>
            {liveEn ? (
              <a href={`/en/stories/${story.slug}`} target="_blank" rel="noopener" className={btn}>
                View live
              </a>
            ) : null}
            {liveUr ? (
              <a href={`/ur/stories/${story.slug}`} target="_blank" rel="noopener" className={btn}>
                View live in Urdu
              </a>
            ) : null}
          </>
        }
      >
        {en?.title ?? ur?.title ?? story.slug}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Publishing data={data} />
          <Texts data={data} />
          <Claims data={data} />
          <Sources data={data} />
        </div>

        <aside className="space-y-6">
          <Card title="Settings">
            <ActionForm action={updateStorySettings.bind(null, story.id)} className="space-y-4">
              <Field label="Web address" hint={`/en/stories/${story.slug}`}>
                <input name="slug" defaultValue={story.slug} required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
              </Field>
              <TaxonomySelects options={options} conflictId={story.conflictId} topicId={story.topicId} />
              <Field label="Image address" hint="Optional. A licensed image (https://…).">
                <input name="featuredImageUrl" type="url" defaultValue={story.featuredImageUrl ?? ""} className={input} />
              </Field>
              <Field label="Image credit">
                <input name="featuredImageCredit" defaultValue={story.featuredImageCredit ?? ""} maxLength={255} className={input} />
              </Field>
              <button className={btn}>Save settings</button>
            </ActionForm>
            <dl className="mt-4 space-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              <div>Started by: {story.origin === "ai" ? "AI draft" : "Editor"}</div>
              <div>Created: {utcLabel(story.createdAt)}</div>
              {story.approvedByName ? <div>Published by: {story.approvedByName}</div> : null}
            </dl>
          </Card>

          <Card
            id="map-events"
            title="Map events"
            actions={
              <Link href={`/admin/map/new?story=${story.id}`} className="text-sm underline">
                Add
              </Link>
            }
          >
            {data.events.length ? (
              <ul className="space-y-2 text-sm">
                {data.events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/map/${e.id}`} className="hover:underline">
                      {e.titleEn}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      {utcLabel(e.occurredAt)} · {e.approved ? "on the map" : "not approved"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No map events linked to this story.</p>
            )}
          </Card>

          <Card title="History">
            <ActivityList rows={data.history} />
          </Card>

          <Card title="Delete story">
            <p className="mb-3 text-sm text-neutral-600">
              Removes the story, both texts, its sources and claims. This can’t be undone. To take it off the site but keep
              it, use Unpublish instead.
            </p>
            <ActionForm action={deleteStory.bind(null, story.id)}>
              <ConfirmDelete label="Delete story" what="this story" />
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Check({ ok, children, optional = false }: { ok: boolean; children: React.ReactNode; optional?: boolean }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className={ok ? "text-green-700" : optional ? "text-neutral-400" : "text-red-700"}>
        {ok ? "✓" : optional ? "○" : "✗"}
      </span>
      <span className={ok ? "" : optional ? "text-neutral-600" : "text-red-800"}>{children}</span>
      <span className="sr-only">{ok ? "(done)" : optional ? "(optional)" : "(not done)"}</span>
    </li>
  );
}

function Publishing({ data }: { data: StoryEditorData }) {
  const { story, en, ur } = data;
  const flagged = data.claims.filter((c) => c.status === "flagged").length;
  const blockers = publishBlockers({ englishApproved: en?.status === "approved", flaggedClaims: flagged, sourceCount: data.sources.length });
  const action = changeStoryStatus.bind(null, story.id);
  const live = story.status === "published";

  return (
    <Card id="publish" title={<span className="flex items-center gap-2">Publishing <StoryStatus status={story.status} scheduled={story.scheduled} /></span>}>
      <ul className="mb-4 space-y-1 text-sm">
        <Check ok={en?.status === "approved"}>English text approved</Check>
        <Check ok={flagged === 0}>
          {flagged ? (
            <a href="#claims" className="underline">
              {flagged} flagged claim{flagged === 1 ? "" : "s"} to resolve
            </a>
          ) : (
            "No flagged claims"
          )}
        </Check>
        <Check ok={data.sources.length > 0}>
          {data.sources.length ? `${data.sources.length} source${data.sources.length === 1 ? "" : "s"}` : <a href="#sources" className="underline">Add at least one source</a>}
        </Check>
        <Check ok={ur?.status === "approved"} optional>
          Urdu text approved {ur?.status === "approved" ? "" : "(optional: the story shows in Urdu once it is)"}
        </Check>
      </ul>

      {live ? (
        <p className="mb-3 text-sm">
          {story.scheduled ? "Scheduled for " : "Live since "}
          <strong>{utcLabel(story.publishedAt)}</strong>.
        </p>
      ) : null}

      <ActionForm action={action} className="space-y-3">
        {story.status === "rejected" ? (
          <button name="intent" value="reopen" className={btn}>
            Reopen for review
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={live ? "Change publish time (UTC)" : "Publish time (UTC)"} hint="Leave empty to publish now. A future time schedules it.">
                <input type="datetime-local" name="publishAt" defaultValue={live ? toUtcInput(story.publishedAt) : ""} className={`${input} w-auto`} />
              </Field>
              <button name="intent" value="publish" disabled={blockers.length > 0} className={`${btnPrimary} mb-5`}>
                {live ? "Update" : "Publish"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              {story.status === "draft" ? (
                <button name="intent" value="submit" className={btn}>
                  Send to review
                </button>
              ) : null}
              {live ? (
                <button name="intent" value="unpublish" className={btn}>
                  Unpublish
                </button>
              ) : null}
              <button name="intent" value="reject" className={btnDanger}>
                Reject
              </button>
            </div>
          </>
        )}
      </ActionForm>
    </Card>
  );
}

function Texts({ data }: { data: StoryEditorData }) {
  const { story } = data;
  const rows = [
    { lang: "en", name: "English", t: data.en },
    { lang: "ur", name: "Urdu", t: data.ur },
  ] as const;
  return (
    <Card title="Text">
      <ul className="divide-y divide-neutral-100">
        {rows.map(({ lang, name, t }) => (
          <li key={lang} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{name}</span>
                {t ? (
                  t.status === "approved" ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Draft</Badge>
                ) : (
                  <Badge>Not written</Badge>
                )}
                {t?.source === "ai" ? <Badge tone="blue">AI text</Badge> : null}
              </div>
              {t ? (
                <>
                  <p dir={lang === "ur" ? "rtl" : "ltr"} lang={lang} className="mt-1 break-words text-neutral-800">
                    {t.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {wordCount(t.body)} words · updated {utcLabel(t.updatedAt)}
                    {t.approvedAt ? ` · approved ${utcLabel(t.approvedAt)}` : ""}
                  </p>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/stories/${story.id}/text/${lang}`} className={t ? btn : btnPrimary}>
                {t ? "Edit" : `Write ${name}`}
              </Link>
              {t ? (
                <>
                  <Link href={`/admin/stories/${story.id}/preview/${lang}`} className={btn}>
                    Preview
                  </Link>
                  <ActionForm action={setTranslationStatus.bind(null, story.id, lang)}>
                    {t.status === "approved" ? (
                      <button name="intent" value="draft" className={btn}>
                        Back to draft
                      </button>
                    ) : (
                      <button name="intent" value="approve" className={btnPrimary}>
                        Approve {name}
                      </button>
                    )}
                  </ActionForm>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const KIND_LABEL: Record<string, string> = { name: "Name", title: "Title or role", date: "Date", figure: "Figure", place: "Place", other: "Other" };
const CLAIM_BADGE = {
  flagged: <Badge tone="red">Flagged</Badge>,
  supported: <Badge tone="green">Backed by source</Badge>,
  resolved: <Badge tone="blue">Resolved</Badge>,
};

function SourceSelect({ sources, value, label = "Source" }: { sources: StoryEditorData["sources"]; value?: string | null; label?: string }) {
  return (
    <Field label={label}>
      <select name="sourceId" defaultValue={value ?? ""} className={input}>
        <option value="">None</option>
        {sources.map((s, i) => (
          <option key={s.id} value={s.id}>
            {i + 1}. {s.publisher ?? hostOf(s.url)} {s.title ? `– ${s.title.slice(0, 60)}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Claims({ data }: { data: StoryEditorData }) {
  const { story } = data;
  const sourceIndex = new Map(data.sources.map((s, i) => [s.id, i + 1]));
  return (
    <Card id="claims" title="Fact-check: claims">
      <p className="mb-4 text-sm text-neutral-600">
        Names, titles, dates, figures and places in the story. Each needs a source behind it, or a note on how you fixed it.
        The story can’t be published while any claim is flagged.
      </p>
      {data.claims.length ? (
        <ul className="mb-6 space-y-3">
          {data.claims.map((c) => (
            <li key={c.id} className={`rounded-md border p-3 ${c.status === "flagged" ? "border-red-300 bg-red-50/40" : "border-neutral-200"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {CLAIM_BADGE[c.status]}
                <span className="text-neutral-500">{KIND_LABEL[c.kind]}</span>
                {c.sourceId && sourceIndex.has(c.sourceId) ? <span className="text-neutral-500">· source {sourceIndex.get(c.sourceId)}</span> : null}
                {c.resolvedByName ? <span className="text-neutral-500">· checked by {c.resolvedByName}</span> : null}
              </div>
              <p className="mt-1 break-words">{c.text}</p>
              {c.note ? <p className="mt-1 text-sm text-neutral-600">Note: {c.note}</p> : null}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-neutral-700 select-none">Check this claim</summary>
                <ActionForm action={updateClaim.bind(null, story.id, c.id)} className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SourceSelect sources={data.sources} value={c.sourceId} label="Backed by" />
                    <Field label="Note">
                      <input name="note" defaultValue={c.note ?? ""} className={input} placeholder="e.g. figure corrected to 1,200" />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button name="intent" value="supported" className={btnPrimary}>
                      Backed by source
                    </button>
                    <button name="intent" value="resolve" className={btn}>
                      Resolved (see note)
                    </button>
                    {c.status !== "flagged" ? (
                      <button name="intent" value="flag" className={btnDanger}>
                        Flag again
                      </button>
                    ) : null}
                    <button name="intent" value="delete" className={`${btn} ms-auto`}>
                      Remove
                    </button>
                  </div>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No claims yet. Add the facts that need checking.</Empty>
      )}

      <h3 className="mb-2 text-sm font-semibold">Add a claim</h3>
      <ActionForm action={addClaim.bind(null, story.id)} resetOnSuccess className="space-y-3">
        <Field label="The fact, as written in the story">
          <textarea name="text" rows={2} required className={input} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <select name="kind" defaultValue="other" className={input}>
              {CLAIM_KIND.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <SourceSelect sources={data.sources} label="Backed by (leave empty to flag it)" />
        </div>
        <button className={btn}>Add claim</button>
      </ActionForm>
    </Card>
  );
}

function SourceFields({ s }: { s?: StoryEditorData["sources"][number] }) {
  return (
    <>
      <Field label="Web address">
        <input name="url" type="url" required defaultValue={s?.url ?? ""} maxLength={2048} className={input} placeholder="https://" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Publisher">
          <input name="publisher" defaultValue={s?.publisher ?? ""} maxLength={200} className={input} placeholder="Reuters" />
        </Field>
        <Field label="Title" className="sm:col-span-2">
          <input name="title" defaultValue={s?.title ?? ""} maxLength={500} className={input} />
        </Field>
      </div>
      <Field label="Published on">
        <input name="publishedAt" type="date" defaultValue={s?.publishedAt?.toISOString().slice(0, 10) ?? ""} className={`${input} w-auto`} />
      </Field>
      <Field label="Key passage" hint="The part of the source the story relies on. Shown to you only, not to readers.">
        <textarea name="excerpt" rows={3} defaultValue={s?.excerpt ?? ""} className={input} />
      </Field>
    </>
  );
}

function Sources({ data }: { data: StoryEditorData }) {
  const { story } = data;
  return (
    <Card id="sources" title="Sources">
      <p className="mb-4 text-sm text-neutral-600">Readers see the publisher, title and link of each source under the story.</p>
      {data.sources.length ? (
        <ol className="mb-6 space-y-3">
          {data.sources.map((s, i) => (
            <li key={s.id} className="rounded-md border border-neutral-200 p-3">
              <div className="flex gap-2">
                <span className="text-neutral-500">{i + 1}.</span>
                <div className="min-w-0">
                  <div className="font-medium">
                    {s.publisher ?? hostOf(s.url)}
                    {s.title ? <span className="font-normal"> – {s.title}</span> : null}
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-blue-800 underline">
                    {s.url}
                  </a>
                  {s.excerpt ? <blockquote className="mt-2 border-s-2 border-neutral-300 ps-3 text-sm whitespace-pre-line text-neutral-700">{s.excerpt}</blockquote> : null}
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-neutral-700 select-none">Edit</summary>
                <ActionForm action={updateSource.bind(null, story.id, s.id)} className="mt-3 space-y-3">
                  <SourceFields s={s} />
                  <div className="flex flex-wrap gap-2">
                    <button name="intent" value="save" className={btn}>
                      Save source
                    </button>
                    <button name="intent" value="delete" formNoValidate className={`${btnDanger} ms-auto`}>
                      Remove source
                    </button>
                  </div>
                </ActionForm>
              </details>
            </li>
          ))}
        </ol>
      ) : (
        <Empty>No sources yet.</Empty>
      )}
      <h3 className="mb-2 text-sm font-semibold">Add a source</h3>
      <ActionForm action={addSource.bind(null, story.id)} resetOnSuccess className="space-y-3">
        <SourceFields />
        <button className={btn}>Add source</button>
      </ActionForm>
    </Card>
  );
}
