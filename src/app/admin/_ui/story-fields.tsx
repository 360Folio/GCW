import { Field, input } from "./ui";

type Options = { conflicts: { id: string; label: string }[]; topics: { id: string; label: string }[] };

export function TaxonomySelects({
  options,
  conflictId,
  topicId,
}: {
  options: Options;
  conflictId?: string | null;
  topicId?: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Conflict">
        <select name="conflictId" defaultValue={conflictId ?? ""} className={input}>
          <option value="">None</option>
          {options.conflicts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Section">
        <select name="topicId" defaultValue={topicId ?? ""} className={input}>
          <option value="">None</option>
          {options.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
