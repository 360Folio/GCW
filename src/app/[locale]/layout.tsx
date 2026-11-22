import type { Metadata } from "next";
import { Inter, Newsreader, Noto_Nastaliq_Urdu } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localeDirection, routing } from "@/i18n/routing";
import "../globals.css";

// Broadsheet type: a newspaper serif for reading, a plain sans for labels,
// and Nastaliq for Urdu.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Site");
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("description"),
    alternates: { languages: { en: "/en", ur: "/ur" } },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  // Only the text used by browser-side components is sent to the browser.
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`${newsreader.variable} ${inter.variable} ${nastaliq.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={{ Site: messages.Site, Map: messages.Map }}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
