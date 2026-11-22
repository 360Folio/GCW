import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-500">GCW Newsroom</p>
        <h1 className="mb-6 text-xl font-semibold">Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
