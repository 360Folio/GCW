import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Newsroom", template: "%s · GCW Newsroom" },
  robots: { index: false, follow: false }, // keep the admin area out of search engines
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
