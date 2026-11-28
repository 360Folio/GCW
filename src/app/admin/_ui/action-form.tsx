"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/admin-guard";

/**
 * A form that runs a newsroom action and shows its result next to the
 * buttons. What you typed stays in the fields if the action reports a
 * problem. Several submit buttons can share one form: each sends its own
 * `name="intent"` value.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (fd: FormData) => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(form, submitter);
        setResult(null);
        startTransition(async () => {
          const r = await action(data);
          if (!r) return;
          setResult(r);
          if (r.ok && resetOnSuccess) form.reset();
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <p
        role="status"
        aria-live="polite"
        className={`text-sm empty:hidden ${result?.ok ? "text-green-700" : "text-red-700"}`}
      >
        {pending ? <span className="text-neutral-500">Saving…</span> : result?.message}
      </p>
    </form>
  );
}
