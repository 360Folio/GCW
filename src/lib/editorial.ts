/*
 * Newsroom rules that don't touch the database, so they can be unit-tested
 * (npm run test:unit).
 */

export type PublishFacts = {
  englishApproved: boolean;
  flaggedClaims: number;
  sourceCount: number;
};

/**
 * Reasons a story can't be published yet. Empty means it can go live.
 * Urdu is optional: the story appears in Urdu once that translation is approved.
 */
export function publishBlockers(f: PublishFacts): string[] {
  const out: string[] = [];
  if (!f.englishApproved) out.push("Approve the English text.");
  if (f.flaggedClaims > 0)
    out.push(`Resolve ${f.flaggedClaims} flagged claim${f.flaggedClaims === 1 ? "" : "s"}.`);
  if (f.sourceCount < 1) out.push("Add at least one source.");
  return out;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Web address part for a story, conflict or topic, from an English title. */
export function slugify(text: string, maxLength = 90): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, maxLength).replace(/-+$/, "");
}

export const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/** Reads a `datetime-local` value ("2026-11-28T09:30") as UTC. */
export function parseUtcInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const d = new Date(`${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formats a date for a `datetime-local` input, in UTC. */
export const toUtcInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16) : "");

/** "2026-11-28 09:30 UTC" */
export const utcLabel = (d: Date | null | undefined) =>
  d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "–";

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** "reuters.com" from a source address, or the address itself if it can't be read. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
