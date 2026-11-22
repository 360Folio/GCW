"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const input = "mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-400";
const button = "w-full rounded-md bg-neutral-900 px-3 py-2 text-white disabled:opacity-50";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPassword(form: FormData) {
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      // Same message for a wrong email or password, so accounts can't be probed.
      setError(error.status === 429 ? "Too many attempts. Wait a few minutes." : "Email or password is incorrect.");
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setStep("code");
      return;
    }
    router.replace("/admin"); // two-factor not set up yet: the dashboard sends you to setup
  }

  async function onCode(form: FormData) {
    setBusy(true);
    setError(null);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a few minutes." : "That code didn't work. Try the newest one.");
      return;
    }
    router.replace("/admin");
  }

  if (step === "code") {
    return (
      <form action={onCode} className="space-y-4">
        <label className="block text-sm">
          {useBackup ? "Backup code" : "6-digit code from your authenticator app"}
          <input
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            className={input}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={button}>Verify</button>
        <button type="button" onClick={() => setUseBackup(!useBackup)} className="w-full text-sm underline">
          {useBackup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
      </form>
    );
  }

  return (
    <form action={onPassword} className="space-y-4">
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="username" className={input} />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className={button}>Continue</button>
    </form>
  );
}
