import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ur"],
  defaultLocale: "en",
  localePrefix: "always", // /en/... and /ur/... (clear URLs for search engines)
});

export type AppLocale = (typeof routing.locales)[number];

export const localeDirection: Record<AppLocale, "ltr" | "rtl"> = {
  en: "ltr",
  ur: "rtl",
};
