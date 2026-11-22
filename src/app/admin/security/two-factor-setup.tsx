"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";

const input = "mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-400";
const button = "rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50";

type Pending = { qr: string; secret: string; backupCodes: string[] };

export function TwoFactorSetup() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(form: FormData) {
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password: String(form.get("password") ?? "") });
    setBusy(false);
    if (error || !data) {
      setError("Password is incorrect.");
      return;
    }
    if (data.method !== "totp") {
      setError("Unexpected two-factor method. Please try again.");
      return;
    }
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 });
    setPending({ qr, secret, backupCodes: data.backupCodes });
  }

  async function confirm(form: FormData) {
    setBusy(true);
    setError(null);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) {
      setError("That code didn't work. Check the phone's clock and try the newest code.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  if (!pending) {
    return (
      <form action={start} className="mt-6 space-y-4 rounded-lg border bg-white p-5">
        <label className="block text-sm">
          Confirm your password to start
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={button}>Set up two-factor</button>
      </form>
    );
  }

  return (
    <div className="mt-6 space-y-6 rounded-lg border bg-white p-5">
      <div>
        <h2 className="font-medium">1. Scan this with your authenticator app</h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        <img src={pending.qr} alt="QR code for your authenticator app" width={220} height={220} className="mt-3" />
        <p className="mt-2 text-sm text-neutral-600">
          Can&apos;t scan? Enter this key instead: <code className="break-all font-mono">{pending.secret}</code>
        </p>
      </div>

      <div>
        <h2 className="font-medium">2. Save these backup codes somewhere safe</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Each one works once if you lose your phone. They won&apos;t be shown again.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
          {pending.backupCodes.map((code) => (
            <li key={code} className="rounded bg-neutral-100 px-2 py-1">{code}</li>
          ))}
        </ul>
      </div>

      <form action={confirm} className="space-y-3">
        <h2 className="font-medium">3. Enter the 6-digit code the app shows</h2>
        <input name="code" required inputMode="numeric" autoComplete="one-time-code" className={input} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={button}>Turn on two-factor</button>
      </form>
    </div>
  );
}
