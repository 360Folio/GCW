import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export type AdminSession = NonNullable<Awaited<ReturnType<typeof readSession>>>;

async function readSession() {
  // Read the request first: during the build this pauses here, so the
  // login library (which needs secrets and the database) is never created.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

/**
 * Use at the top of every admin page and admin action.
 * - Not signed in: go to the login page.
 * - Signed in but two-factor not switched on yet: go to security setup.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  if (!session.user.twoFactorEnabled) redirect("/admin/security");
  return session;
}

/** For the security setup page, which must work before two-factor is on. */
export async function requireSignedIn(): Promise<AdminSession> {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}
