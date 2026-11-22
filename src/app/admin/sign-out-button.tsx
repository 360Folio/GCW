"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/admin/login");
      }}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-100"
    >
      Sign out
    </button>
  );
}
