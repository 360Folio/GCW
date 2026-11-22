"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// Today's date in the reader's own time zone. Rendered in the browser so the
// page itself can stay cached; the server sends nothing for it.
export function Today({ locale }: { locale: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    () => "",
  );
  return <span className="min-h-[1em]">{text}</span>;
}
