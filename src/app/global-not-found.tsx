import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found · Global Conflict Watch",
};

// Shown for addresses that match no route at all (outside /en, /ur, /admin).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center px-4 text-center">
        <main>
          <h1 className="text-3xl font-bold">Page not found</h1>
          <p className="mt-3 opacity-80">We couldn&apos;t find that page.</p>
          <Link href="/en" className="mt-6 inline-block underline">
            Go to the home page
          </Link>
        </main>
      </body>
    </html>
  );
}
