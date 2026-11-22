import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { getDb, schema } from "@/db";
import { writeAudit } from "@/lib/audit";

function createAuth() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }

  return betterAuth({
    appName: "Global Conflict Watch",
    secret,
    baseURL: process.env.SITE_URL,
    database: drizzleAdapter(getDb(), {
      provider: "mysql",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        twoFactor: schema.twoFactors,
        rateLimit: schema.rateLimits,
      },
    }),

    // A single editor account, created with `npm run admin:create`.
    // Nobody can sign up from the website.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },

    session: {
      expiresIn: 60 * 60 * 12, // 12 hours
      updateAge: 60 * 60, // refreshed at most hourly while in use
    },

    // Brute-force protection, kept in the database so it survives restarts.
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 300, max: 5 },
        "/two-factor/verify-totp": { window: 300, max: 5 },
        "/two-factor/verify-backup-code": { window: 300, max: 5 },
        "/two-factor/enable": { window: 300, max: 5 },
      },
    },

    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      cookiePrefix: "gcw",
    },

    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await writeAudit({
              actorId: session.userId,
              action: "auth.sign_in",
              entityType: "session",
              entityId: session.id,
              ipAddress: session.ipAddress ?? null,
            });
          },
        },
      },
    },

    plugins: [
      twoFactor({ issuer: "Global Conflict Watch" }),
      nextCookies(), // must stay last
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { gcwAuth?: Auth };

/** Created on first use, so builds never need the database or secrets. */
export function getAuth(): Auth {
  globalForAuth.gcwAuth ??= createAuth();
  return globalForAuth.gcwAuth;
}
