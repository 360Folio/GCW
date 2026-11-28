import Link from "next/link";
import type { ReactNode } from "react";

/* Small building blocks for the newsroom screens. */

export const input =
  "mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-300";
export const btn =
  "inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

export function Card({ title, children, actions, className = "", id }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-lg border border-neutral-200 bg-white p-5 ${className}`}>
      {title || actions ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="font-semibold">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageTitle({ children, kicker, actions }: { children: ReactNode; kicker?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-sm text-neutral-500">{kicker}</p> : null}
        <h1 className="text-2xl font-semibold break-words">{children}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  grey: "bg-neutral-100 text-neutral-700 ring-neutral-300",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-green-50 text-green-800 ring-green-200",
  red: "bg-red-50 text-red-800 ring-red-200",
} as const;

export function Badge({ tone = "grey", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const STORY_STATUS: Record<string, [string, keyof typeof TONES]> = {
  draft: ["Draft", "grey"],
  in_review: ["In review", "amber"],
  approved: ["Ready, not live", "blue"],
  published: ["Published", "green"],
  rejected: ["Rejected", "red"],
};

/** `scheduled`: published with a time still in the future. */
export function StoryStatus({ status, scheduled }: { status: string; scheduled?: boolean }) {
  if (status === "published" && scheduled) {
    return <Badge tone="blue">Scheduled</Badge>;
  }
  const [label, tone] = STORY_STATUS[status] ?? [status, "grey"];
  return <Badge tone={tone}>{label}</Badge>;
}

export function TranslationStatus({ status, lang }: { status: string | null | undefined; lang: string }) {
  if (!status) return <Badge>{lang}: none</Badge>;
  return status === "approved" ? <Badge tone="green">{lang}: approved</Badge> : <Badge tone="amber">{lang}: draft</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-neutral-500">{children}</p>;
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string; count?: number }[]; current: string }) {
  return (
    <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === current ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${it.key === current ? "border-neutral-900 font-medium" : "border-transparent text-neutral-600 hover:text-neutral-900"}`}
        >
          {it.label}
          {typeof it.count === "number" ? <span className="ms-1 text-neutral-400">{it.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** A delete button that only works once the box is ticked (no pop-ups). */
export function ConfirmDelete({ label, what }: { label: string; what: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required className="size-4" />
        Yes, permanently delete {what}
      </label>
      <button type="submit" className={btnDanger}>
        {label}
      </button>
    </div>
  );
}
