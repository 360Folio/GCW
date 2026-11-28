import { saveConflict } from "@/app/admin/actions/taxonomy";
import { CONFLICT_STATUS } from "@/db/schema";
import type { getConflictAdmin } from "@/lib/admin-data";
import { ActionForm } from "./action-form";
import { LocationPicker } from "./location-picker";
import { btnPrimary, Card, Field, input } from "./ui";

type Data = NonNullable<Awaited<ReturnType<typeof getConflictAdmin>>> | null;

const STATUS_LABEL = { active: "Active", frozen: "Frozen (ceasefire or stalemate)", resolved: "Resolved" };
const urdu = `${input} font-urdu leading-loose`;

export function ConflictForm({ data }: { data: Data }) {
  const c = data?.conflict;
  return (
    <ActionForm action={saveConflict.bind(null, c?.id ?? null)} className="space-y-6">
      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name in English">
            <input name="nameEn" required maxLength={200} defaultValue={data?.en?.name ?? ""} className={input} />
          </Field>
          <Field label="Web address" hint="Leave empty to make one from the name.">
            <input name="slug" maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={c?.slug ?? ""} className={input} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={c?.status ?? "active"} className={input}>
              {CONFLICT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <input name="region" maxLength={120} defaultValue={c?.region ?? ""} className={input} placeholder="East Africa" />
          </Field>
          <Field label="Started on">
            <input name="startedOn" type="date" defaultValue={c?.startedOn?.toISOString().slice(0, 10) ?? ""} className={input} />
          </Field>
          <Field label="Order" hint="Lower numbers are listed first.">
            <input name="sortOrder" type="number" step={1} defaultValue={c?.sortOrder ?? 0} className={input} />
          </Field>
        </div>
        <div className="mt-4">
          <span className="text-sm font-medium">Map centre</span>
          <LocationPicker lat={c?.lat ?? null} lng={c?.lng ?? null} optional />
        </div>
      </Card>

      <Card title="English">
        <div className="space-y-4">
          <Field label="Summary" hint="One or two sentences for the conflict list.">
            <textarea name="summaryEn" rows={2} defaultValue={data?.en?.summary ?? ""} className={input} />
          </Field>
          <Field label="Explainer" hint="Markdown. Background for the conflict page.">
            <textarea name="explainerEn" rows={8} defaultValue={data?.en?.explainer ?? ""} className={`${input} font-mono text-sm`} />
          </Field>
        </div>
      </Card>

      <Card title="Urdu">
        <div className="space-y-4" dir="rtl" lang="ur">
          <Field label="نام" hint="Leave empty if there is no Urdu version yet.">
            <input name="nameUr" maxLength={200} defaultValue={data?.ur?.name ?? ""} className={urdu} />
          </Field>
          <Field label="خلاصہ">
            <textarea name="summaryUr" rows={2} defaultValue={data?.ur?.summary ?? ""} className={urdu} />
          </Field>
          <Field label="وضاحت">
            <textarea name="explainerUr" rows={8} defaultValue={data?.ur?.explainer ?? ""} className={urdu} />
          </Field>
        </div>
      </Card>

      <button className={btnPrimary}>{c ? "Save conflict" : "Add conflict"}</button>
    </ActionForm>
  );
}
