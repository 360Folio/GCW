/**
 * Creates the editor account, or resets its password.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is asked for at a hidden prompt (or read from the
 * GCW_ADMIN_PASSWORD environment variable for automated setups).
 * Resetting the password also switches two-factor off, so you set it up
 * again on the next login.
 */
import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../src/db/schema";

config({ path: ".env.local", quiet: true });

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) return reject(new Error("No terminal: set GCW_ADMIN_PASSWORD instead"));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(130); // Ctrl+C
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim() || "Editor";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Your Name"');
  }

  let password = process.env.GCW_ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden("Password (12+ characters): ");
    const again = await askHidden("Repeat password: ");
    if (password !== again) throw new Error("Passwords don't match");
  }
  if (password.length < 12) throw new Error("Password must be at least 12 characters");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = mysql.createPool({ uri: url, timezone: "Z", charset: "utf8mb4" });
  const db = drizzle({ client: pool, schema, mode: "default", casing: "snake_case" });

  try {
    const hash = await hashPassword(password);
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));

    if (existing) {
      await db
        .update(schema.accounts)
        .set({ password: hash })
        .where(and(eq(schema.accounts.userId, existing.id), eq(schema.accounts.providerId, "credential")));
      await db.update(schema.users).set({ twoFactorEnabled: false }).where(eq(schema.users.id, existing.id));
      await db.delete(schema.twoFactors).where(eq(schema.twoFactors.userId, existing.id));
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
      await db.insert(schema.auditLog).values({ actorId: existing.id, action: "admin.password_reset" });
      console.log(`Password reset for ${email}. Set up two-factor again at the next login.`);
    } else {
      const userId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(schema.users).values({ id: userId, name, email, emailVerified: true });
        await tx.insert(schema.accounts).values({
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hash,
        });
        await tx.insert(schema.auditLog).values({ actorId: userId, action: "admin.created" });
      });
      console.log(`Created editor account ${email}. Sign in at /admin/login and set up two-factor.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
