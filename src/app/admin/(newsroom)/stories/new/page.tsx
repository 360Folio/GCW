import type { Metadata } from "next";
import { createStory } from "@/app/admin/actions/stories";
import { taxonomyOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-session";
import { ActionForm } from "../../../_ui/action-form";
import { TaxonomySelects } from "../../../_ui/story-fields";
import { btnPrimary, Card, Field, input, PageTitle } from "../../../_ui/ui";

export const metadata: Metadata = { title: "New story" };

export default async function NewStoryPage() {
  await requireAdmin();
  const options = await taxonomyOptions();
  return (
    <>
      <PageTitle kicker="Stories">New story</PageTitle>
      <Card className="max-w-3xl">
        <p className="mb-4 text-sm text-neutral-600">
          Start in English. You can add sources, claims to check and the Urdu text on the next screen. Nothing is
          published until you approve it.
        </p>
        <ActionForm action={createStory} className="space-y-4">
          <Field label="Headline">
            <input name="title" required maxLength={300} className={input} />
          </Field>
          <Field label="Web address" hint="Leave empty to make one from the headline. Letters, numbers and hyphens only.">
            <input name="slug" maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="aid-convoys-reach-el-fasher" />
          </Field>
          <Field label="Summary" hint="One or two sentences shown on the front page and in search results.">
            <textarea name="summary" rows={2} className={input} />
          </Field>
          <Field label="Story text" hint="Markdown: ## for a subheading, > for a quotation, - for a list, [text](https://…) for a link.">
            <textarea name="body" rows={12} className={`${input} font-mono text-sm`} />
          </Field>
          <TaxonomySelects options={options} />
          <button className={btnPrimary}>Create draft</button>
        </ActionForm>
      </Card>
    </>
  );
}
