import type { Metadata } from "next";
import { deleteTopic, saveTopic } from "@/app/admin/actions/taxonomy";
import { listTopicsAdmin } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../../_ui/action-form";
import { btn, btnPrimary, Card, ConfirmDelete, Empty, Field, input, PageTitle } from "../../_ui/ui";

export const metadata: Metadata = { title: "Sections" };

type Topic = Awaited<ReturnType<typeof listTopicsAdmin>>[number];

function TopicFields({ t }: { t?: Topic }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_90px]">
      <Field label="Name in English">
        <input name="nameEn" required maxLength={120} defaultValue={t?.nameEn ?? ""} className={input} />
      </Field>
      <Field label="Name in Urdu">
        <input name="nameUr" maxLength={120} defaultValue={t?.nameUr ?? ""} dir="rtl" lang="ur" className={`${input} font-urdu`} />
      </Field>
      <Field label="Web address" hint={t ? undefined : "Leave empty to make one from the name."}>
        <input name="slug" maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={t?.slug ?? ""} className={input} />
      </Field>
      <Field label="Order">
        <input name="sortOrder" type="number" step={1} defaultValue={t?.sortOrder ?? 0} className={input} />
      </Field>
    </div>
  );
}

export default async function TopicsPage() {
  await requireAdmin();
  const rows = await listTopicsAdmin();
  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle kicker="Sections such as Analysis, Diplomacy or Cyber">Sections</PageTitle>
      <Card>
        {rows.length ? (
          <ul className="divide-y divide-neutral-100">
            {rows.map((t) => (
              <li key={t.id} className="py-4 first:pt-0">
                <ActionForm action={saveTopic.bind(null, t.id)} className="space-y-2">
                  <TopicFields t={t} />
                  <div className="flex flex-wrap items-center gap-3">
                    <button className={btn}>Save</button>
                    <span className="text-xs text-neutral-500">
                      {t.storyCount} stor{t.storyCount === 1 ? "y" : "ies"}
                    </span>
                  </div>
                </ActionForm>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-neutral-600 select-none">Delete</summary>
                  <ActionForm action={deleteTopic.bind(null, t.id)} className="mt-2">
                    <ConfirmDelete label="Delete section" what="this section" />
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No sections yet.</Empty>
        )}
      </Card>
      <Card title="Add a section">
        <ActionForm action={saveTopic.bind(null, null)} resetOnSuccess className="space-y-3">
          <TopicFields />
          <button className={btnPrimary}>Add section</button>
        </ActionForm>
      </Card>
    </div>
  );
}
