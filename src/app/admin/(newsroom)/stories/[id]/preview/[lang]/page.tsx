import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryMarkdown } from "@/components/story-markdown";
import { getStoryForEditor } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { btn, PageTitle } from "../../../../../_ui/ui";

export const metadata: Metadata = { title: "Preview" };

/** The story as readers will see it, before it is approved or published. */
export default async function PreviewPage({ params }: PageProps<"/admin/stories/[id]/preview/[lang]">) {
  await requireAdmin();
  const { id, lang } = await params;
  if (lang !== "en" && lang !== "ur") notFound();
  const data = await getStoryForEditor(id);
  const t = lang === "en" ? data?.en : data?.ur;
  if (!data || !t) notFound();

  return (
    <>
      <PageTitle
        kicker={
          <Link href={`/admin/stories/${id}`} className="hover:underline">
            ← Back to the story
          </Link>
        }
        actions={
          <Link href={`/admin/stories/${id}/text/${lang}`} className={btn}>
            Edit text
          </Link>
        }
      >
        Preview{t.status === "approved" ? "" : " (draft)"}
      </PageTitle>
      <article lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className="rounded-lg border border-rule bg-paper px-5 py-8 text-ink sm:px-10">
        <div className="mx-auto max-w-[680px]">
          <h1 className="font-serif text-4xl leading-tight font-semibold">{t.title}</h1>
          {t.summary ? <p className="mt-3 font-serif text-xl text-ink-2">{t.summary}</p> : null}
          <div className="story-body mt-6">
            <StoryMarkdown>{t.body}</StoryMarkdown>
          </div>
          {data.sources.length ? (
            <div className="mt-10 border-t-[3px] border-ink pt-3">
              <h2 className="section-label !border-b-0 !pb-0">{lang === "ur" ? "ذرائع" : "Sources"}</h2>
              <ol className="list-decimal ps-5 text-[0.95rem]">
                {data.sources.map((s) => (
                  <li key={s.id} className="border-b border-dotted border-rule py-2">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.publisher ?? s.url}
                    </a>
                    {s.title ? ` – ${s.title}` : ""}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </article>
    </>
  );
}
