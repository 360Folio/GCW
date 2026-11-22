import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local development reads .env.local; Codespaces, CI and Hostinger
// provide DATABASE_URL as a real environment variable.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
