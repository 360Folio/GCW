import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * One connection pool per server process, created on first use so that
 * builds and pages that don't touch the database never need DATABASE_URL.
 */
const globalForDb = globalThis as unknown as { gcwDb?: MySql2Database<typeof schema> };

export function getDb(): MySql2Database<typeof schema> {
  if (globalForDb.gcwDb) return globalForDb.gcwDb;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = mysql.createPool({
    uri: url,
    connectionLimit: 10,
    timezone: "Z", // store and read all times as UTC
    charset: "utf8mb4", // Urdu and emoji need full UTF-8
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });

  globalForDb.gcwDb = drizzle({ client: pool, schema, mode: "default", casing: "snake_case" });
  return globalForDb.gcwDb;
}

export { schema };
