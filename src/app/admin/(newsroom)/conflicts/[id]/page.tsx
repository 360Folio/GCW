import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteConflict } from "@/app/admin/actions/taxonomy";
import { getConflictAdmin } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../../../_ui/action-form";
import { ConflictForm } from "../../../_ui/conflict-form";
import { btn, Card, ConfirmDelete, PageTitle } from "../../../_ui/ui";

export const metadata: Metadata = { title: "Edit conflict" };

export default async function EditConflictPage({ params }: PageProps<"/admin/conflicts/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const data = await getConflictAdmin(id);
  if (!data) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        kicker={
          <Link href="/admin/conflicts" className="hover:underline">
            ← Conflicts
          </Link>
        }
        actions={
          <a href={`/en/conflicts/${data.conflict.slug}`} target="_blank" rel="noopener" className={btn}>
            View page
          </a>
        }
      >
        {data.en?.name ?? data.conflict.slug}
      </PageTitle>
      <ConflictForm data={data} />
      <Card title="Delete conflict">
        <p className="mb-3 text-sm text-neutral-600">Its stories and map events stay, without a conflict. This can’t be undone.</p>
        <ActionForm action={deleteConflict.bind(null, id)}>
          <ConfirmDelete label="Delete conflict" what="this conflict" />
        </ActionForm>
      </Card>
    </div>
  );
}
