import type { createFormatter } from "next-intl";

type Formatter = ReturnType<typeof createFormatter>;

/** "3 hours ago" for the past day, then a date: "20 November 2026". */
export function formatWhen(format: Formatter, iso: string, now: number) {
  const date = new Date(iso);
  const age = now - date.getTime();
  if (age >= 0 && age < 24 * 3_600_000) return format.relativeTime(date, now);
  return format.dateTime(date, { day: "numeric", month: "long", year: "numeric" });
}

export const formatDate = (format: Formatter, iso: string) =>
  format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });

/** Rough reading time from Markdown text: about 220 words a minute. */
export const readingMinutes = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));
