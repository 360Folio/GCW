import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTranslation, saveTranslation } from "@/app/admin/actions/stories";
import { getStoryForEditor } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../../../../../_ui/action-form";
import { Badge, btn, btnPrimary, Card, ConfirmDelete, Field, input, PageTitle } from "../../../../../_ui/ui";

export const metadata: Metadata = { title: "Edit text" };

export default async function TextEditorPage({ params }: PageProps<"/admin/stories/[id]/text/[lang]">) {
  await requireAdmin();
  const { id, lang } = await params;
  if (lang !== "en" && lang !== "ur") notFound();
  const data = await getStoryForEditor(id);
  if (!data) notFound();

  const t = lang === "en" ? data.en : data.ur;
  const other = lang === "en" ? data.ur : data.en;
  const name = lang === "en" ? "English" : "Urdu";
  const rtl = lang === "ur";
  const live = data.story.status === "published" && t?.status === "approved";
  const dirProps = { dir: rtl ? "rtl" : "ltr", lang } as const;
  const fieldCls = `${input} ${rtl ? "font-urdu leading-loose" : ""}`;

  return (
    <>
      <PageTitle
        kicker={
          <Link href={`/admin/stories/${id}`} className="hover:underline">
            ← {data.en?.title ?? data.story.slug}
          </Link>
        }
        actions={
          t ? (
            <Link href={`/admin/stories/${id}/preview/${lang}`} className={btn}>
              Preview
            </Link>
          ) : null
        }
      >
        {t ? `Edit ${name} text` : `Write ${name} text`}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          {live ? (
            <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              This text is live. “Save draft” takes the story off the site in {name} until you approve it again. Use “Save and
              approve” to update the live story.
            </p>
          ) : null}
          {t?.source === "ai" ? (
            <p className="mb-4 text-sm">
              <Badge tone="blue">AI text</Badge> <span className="text-neutral-600">Read it against the sources before approving.</span>
            </p>
          ) : null}
          <ActionForm action={saveTranslation.bind(null, id, lang)} className="space-y-4">
            <Field label="Headline">
              <input name="title" required maxLength={300} defaultValue={t?.title ?? ""} className={fieldCls} {...dirProps} />
            </Field>
            <Field label="Summary" hint="One or two sentences for the front page and search results.">
              <textarea name="summary" rows={3} defaultValue={t?.summary ?? ""} className={fieldCls} {...dirProps} />
            </Field>
            <Field label="Story text" hint="Markdown: ## subheading, > quotation, - list item, [text](https://…) link.">
              <textarea
                name="body"
                rows={22}
                required
                defaultValue={t?.body ?? ""}
                className={`${fieldCls} ${rtl ? "" : "font-mono text-sm"}`}
                {...dirProps}
              />
            </Field>
            <details>
              <summary className="cursor-pointer text-sm font-medium select-none">Search engine text (optional)</summary>
              <div className="mt-3 space-y-4">
                <Field label="Search title" hint="If empty, the headline is used.">
                  <input name="seoTitle" maxLength={300} defaultValue={t?.seoTitle ?? ""} className={fieldCls} {...dirProps} />
                </Field>
                <Field label="Search description" hint="If empty, the summary is used. About 150 characters.">
                  <textarea name="seoDescription" rows={2} maxLength={500} defaultValue={t?.seoDescription ?? ""} className={fieldCls} {...dirProps} />
                </Field>
              </div>
            </details>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
              <button name="intent" value="draft" className={btn}>
                Save draft
              </button>
              <button name="intent" value="approve" className={btnPrimary}>
                Save and approve
              </button>
            </div>
          </ActionForm>

          {lang === "ur" && t ? (
            <div className="mt-8 border-t border-neutral-200 pt-4">
              <h2 className="mb-2 text-sm font-semibold">Remove the Urdu text</h2>
              <ActionForm action={deleteTranslation.bind(null, id, "ur")}>
                <ConfirmDelete label="Remove Urdu" what="the Urdu text" />
              </ActionForm>
            </div>
          ) : null}
        </Card>

        <aside className="space-y-6">
          {other ? (
            <Card title={lang === "ur" ? "English, for reference" : "Urdu version"}>
              <div dir={lang === "ur" ? "ltr" : "rtl"} lang={lang === "ur" ? "en" : "ur"} className={`max-h-[32rem] overflow-y-auto text-sm whitespace-pre-line ${lang === "en" ? "font-urdu leading-loose" : ""}`}>
                <p className="font-semibold">{other.title}</p>
                {other.summary ? <p className="mt-2 text-neutral-700">{other.summary}</p> : null}
                <p className="mt-3 text-neutral-800">{other.body}</p>
              </div>
            </Card>
          ) : null}
          <Card title="Sources">
            {data.sources.length ? (
              <ol className="space-y-3 text-sm">
                {data.sources.map((s, i) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                      {i + 1}. {s.publisher ?? s.url}
                    </a>
                    {s.title ? <div className="text-neutral-700">{s.title}</div> : null}
                    {s.excerpt ? <blockquote className="mt-1 border-s-2 border-neutral-300 ps-2 whitespace-pre-line text-neutral-600">{s.excerpt}</blockquote> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-neutral-500">
                No sources yet. <Link href={`/admin/stories/${id}#sources`} className="underline">Add them on the story page.</Link>
              </p>
            )}
          </Card>
          <Card title="Claims">
            {data.claims.length ? (
              <ul className="space-y-2 text-sm">
                {data.claims.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span aria-hidden className={c.status === "flagged" ? "text-red-700" : "text-green-700"}>
                      {c.status === "flagged" ? "✗" : "✓"}
                    </span>
                    <span>
                      {c.text}
                      <span className="sr-only">{c.status === "flagged" ? " (flagged)" : " (checked)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No claims yet.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
