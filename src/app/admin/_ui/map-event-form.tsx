import { saveMapEvent } from "@/app/admin/actions/map-events";
import { MAP_EVENT_KIND, type mapEvents } from "@/db/schema";
import { toUtcInput } from "@/lib/editorial";
import { ActionForm } from "./action-form";
import { LocationPicker } from "./location-picker";
import { btnPrimary, Card, Field, input } from "./ui";

type Option = { id: string; label: string };

export const KIND_LABEL: Record<string, string> = {
  clash: "Fighting",
  strike: "Air or missile strike",
  protest: "Protest or unrest",
  diplomacy: "Talks or diplomacy",
  humanitarian: "Humanitarian",
  other: "Other",
};

export function MapEventForm({
  event,
  conflicts,
  storyOptions,
  defaultStoryId,
  defaultTime,
}: {
  event: typeof mapEvents.$inferSelect | null;
  conflicts: Option[];
  storyOptions: Option[];
  defaultStoryId?: string;
  defaultTime: string;
}) {
  return (
    <ActionForm action={saveMapEvent.bind(null, event?.id ?? null)} className="space-y-6">
      {defaultStoryId ? <input type="hidden" name="back" value="story" /> : null}
      <Card title="What happened">
        <div className="space-y-4">
          <Field label="Short description in English" hint="Shown on the map, e.g. “Shelling reported in northern Kharkiv”.">
            <input name="titleEn" required maxLength={300} defaultValue={event?.titleEn ?? ""} className={input} />
          </Field>
          <Field label="Short description in Urdu" hint="Optional. Urdu readers see the English text if this is empty.">
            <input name="titleUr" maxLength={300} defaultValue={event?.titleUr ?? ""} dir="rtl" lang="ur" className={`${input} font-urdu leading-loose`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kind">
              <select name="kind" defaultValue={event?.kind ?? "clash"} className={input}>
                {MAP_EVENT_KIND.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity" hint="4 and 5 show in red.">
              <select name="severity" defaultValue={String(event?.severity ?? 2)} className={input}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "(low)" : n === 5 ? "(high)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="When (UTC)">
              <input name="occurredAt" type="datetime-local" required defaultValue={event ? toUtcInput(event.occurredAt) : defaultTime} className={input} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Conflict">
              <select name="conflictId" defaultValue={event?.conflictId ?? ""} className={input}>
                <option value="">None</option>
                {conflicts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked story" hint="Readers can open it from the map once it is published.">
              <select name="storyId" defaultValue={event?.storyId ?? defaultStoryId ?? ""} className={input}>
                <option value="">None</option>
                {storyOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label.slice(0, 90)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Where">
        <LocationPicker lat={event?.lat ?? null} lng={event?.lng ?? null} />
      </Card>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="approved" defaultChecked={event?.approved ?? false} className="size-4" />
          Approved: show it on the map
        </label>
        <button className={btnPrimary}>{event ? "Save event" : "Add event"}</button>
      </div>
    </ActionForm>
  );
}
