import type { Metadata } from "next";
import Link from "next/link";
import { requireSignedIn } from "@/lib/admin-session";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const session = await requireSignedIn();
  const enabled = Boolean(session.user.twoFactorEnabled);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm text-neutral-500">GCW Newsroom</p>
      <h1 className="text-2xl font-semibold">Two-factor sign-in</h1>
      {enabled ? (
        <div className="mt-6 rounded-lg border bg-white p-5">
          <p>Two-factor sign-in is on. You&apos;ll need your authenticator app each time you sign in.</p>
          <Link href="/admin" className="mt-4 inline-block underline">Back to the newsroom</Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-neutral-600">
            The newsroom requires a code from an authenticator app (Google Authenticator,
            Microsoft Authenticator, 1Password or similar) as well as your password.
          </p>
          <TwoFactorSetup />
        </>
      )}
    </main>
  );
}
