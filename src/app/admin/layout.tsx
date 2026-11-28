import type { Metadata } from "next";
import { Newsreader, Noto_Nastaliq_Urdu } from "next/font/google";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Newsroom", template: "%s · GCW Newsroom" },
  robots: { index: false, follow: false }, // keep the admin area out of search engines
};

// For Urdu fields and the story preview, so text looks as readers will see it.
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], variable: "--font-newsreader", display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-nastaliq", display: "swap" });

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`h-full antialiased ${newsreader.variable} ${nastaliq.variable}`}>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900">{children}</body>
    </html>
  );
}
