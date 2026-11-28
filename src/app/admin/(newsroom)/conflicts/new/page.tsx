import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { ConflictForm } from "../../../_ui/conflict-form";
import { PageTitle } from "../../../_ui/ui";

export const metadata: Metadata = { title: "Add conflict" };

export default async function NewConflictPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <PageTitle
        kicker={
          <Link href="/admin/conflicts" className="hover:underline">
            ← Conflicts
          </Link>
        }
      >
        Add conflict
      </PageTitle>
      <ConflictForm data={null} />
    </div>
  );
}
