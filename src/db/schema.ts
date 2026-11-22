/**
 * Database schema (MariaDB/MySQL). Property names are camelCase; the
 * database columns are snake_case (`casing: "snake_case"` in src/db/index.ts
 * and drizzle.config.ts). All times are stored as UTC.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  datetime,
  double,
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------------------------
// Shared helpers

const id = () => varchar({ length: 36 }).primaryKey();
const fk = () => varchar({ length: 36 });
const createdAt = () =>
  datetime({ mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const updatedAt = () =>
  datetime({ mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());

export const LOCALES = ["en", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
const locale = () => mysqlEnum(LOCALES).notNull();

// ---------------------------------------------------------------------------
// Login (Better Auth). Field names must match what Better Auth expects.

export const users = mysqlTable("users", {
  id: id(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  twoFactorEnabled: boolean().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = mysqlTable(
  "sessions",
  {
    id: id(),
    expiresAt: datetime({ mode: "date", fsp: 3 }).notNull(),
    token: varchar({ length: 255 }).notNull().unique(),
    ipAddress: varchar({ length: 64 }),
    userAgent: text(),
    userId: fk()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const accounts = mysqlTable(
  "accounts",
  {
    id: id(),
    accountId: varchar({ length: 255 }).notNull(),
    providerId: varchar({ length: 64 }).notNull(),
    userId: fk()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: datetime({ mode: "date", fsp: 3 }),
    refreshTokenExpiresAt: datetime({ mode: "date", fsp: 3 }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = mysqlTable(
  "verifications",
  {
    id: id(),
    identifier: varchar({ length: 255 }).notNull(),
    value: text().notNull(),
    expiresAt: datetime({ mode: "date", fsp: 3 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const twoFactors = mysqlTable(
  "two_factors",
  {
    id: id(),
    secret: varchar({ length: 255 }).notNull(),
    backupCodes: text().notNull(),
    userId: fk()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
    failedVerificationCount: int().default(0),
    lockedUntil: datetime({ mode: "date", fsp: 3 }),
  },
  (t) => [index("two_factors_user_idx").on(t.userId), index("two_factors_secret_idx").on(t.secret)],
);

export const rateLimits = mysqlTable("rate_limits", {
  id: id(),
  key: varchar({ length: 255 }).notNull().unique(),
  count: int().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Taxonomy: conflicts (with hub pages) and topics (sections like "Cyber")

export const CONFLICT_STATUS = ["active", "frozen", "resolved"] as const;

export const conflicts = mysqlTable("conflicts", {
  id: id(),
  slug: varchar({ length: 120 }).notNull().unique(),
  status: mysqlEnum(CONFLICT_STATUS).notNull().default("active"),
  region: varchar({ length: 120 }),
  // Map centre for the hub page and the live map
  lat: double(),
  lng: double(),
  startedOn: datetime({ mode: "date" }),
  sortOrder: int().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const conflictTranslations = mysqlTable(
  "conflict_translations",
  {
    conflictId: fk()
      .notNull()
      .references(() => conflicts.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar({ length: 200 }).notNull(),
    summary: text(),
    explainer: mediumtext(), // Markdown
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.conflictId, t.locale] })],
);

export const topics = mysqlTable("topics", {
  id: id(),
  slug: varchar({ length: 120 }).notNull().unique(),
  sortOrder: int().notNull().default(0),
  createdAt: createdAt(),
});

export const topicTranslations = mysqlTable(
  "topic_translations",
  {
    topicId: fk()
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar({ length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.locale] })],
);

// ---------------------------------------------------------------------------
// Stories. One story has an English and an Urdu translation; each must be
// approved by the editor before it can be published.

export const STORY_STATUS = ["draft", "in_review", "approved", "published", "rejected"] as const;
export const TRANSLATION_STATUS = ["draft", "approved"] as const;

export const stories = mysqlTable(
  "stories",
  {
    id: id(),
    slug: varchar({ length: 160 }).notNull().unique(),
    status: mysqlEnum(STORY_STATUS).notNull().default("draft"),
    conflictId: fk().references(() => conflicts.id, { onDelete: "set null" }),
    topicId: fk().references(() => topics.id, { onDelete: "set null" }),
    origin: mysqlEnum(["ai", "editor"]).notNull().default("ai"),
    featuredImageUrl: text(),
    featuredImageCredit: varchar({ length: 255 }),
    publishedAt: datetime({ mode: "date", fsp: 3 }),
    approvedBy: fk().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("stories_status_published_idx").on(t.status, t.publishedAt),
    index("stories_conflict_idx").on(t.conflictId),
    index("stories_topic_idx").on(t.topicId),
  ],
);

export const storyTranslations = mysqlTable(
  "story_translations",
  {
    storyId: fk()
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    locale: locale(),
    title: varchar({ length: 300 }).notNull(),
    summary: text(),
    body: mediumtext().notNull(), // Markdown
    seoTitle: varchar({ length: 300 }),
    seoDescription: varchar({ length: 500 }),
    status: mysqlEnum(TRANSLATION_STATUS).notNull().default("draft"),
    source: mysqlEnum(["ai", "editor"]).notNull().default("ai"),
    approvedAt: datetime({ mode: "date", fsp: 3 }),
    approvedBy: fk().references(() => users.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.locale] })],
);

/** Where a story's facts come from. Shown to readers as "Sources". */
export const sources = mysqlTable(
  "sources",
  {
    id: id(),
    storyId: fk()
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    url: varchar({ length: 2048 }).notNull(),
    publisher: varchar({ length: 200 }),
    title: varchar({ length: 500 }),
    publishedAt: datetime({ mode: "date", fsp: 3 }),
    excerpt: text(),
    createdAt: createdAt(),
  },
  (t) => [index("sources_story_idx").on(t.storyId)],
);

/**
 * Checkable facts pulled out of a draft (names, titles, dates, figures,
 * places). A story can't be published while any claim is "flagged".
 */
export const CLAIM_KIND = ["name", "title", "date", "figure", "place", "other"] as const;
export const CLAIM_STATUS = ["supported", "flagged", "resolved"] as const;

export const claims = mysqlTable(
  "claims",
  {
    id: id(),
    storyId: fk()
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    text: text().notNull(),
    kind: mysqlEnum(CLAIM_KIND).notNull().default("other"),
    status: mysqlEnum(CLAIM_STATUS).notNull().default("flagged"),
    sourceId: fk().references(() => sources.id, { onDelete: "set null" }),
    note: text(),
    resolvedBy: fk().references(() => users.id, { onDelete: "set null" }),
    resolvedAt: datetime({ mode: "date", fsp: 3 }),
    createdAt: createdAt(),
  },
  (t) => [index("claims_story_status_idx").on(t.storyId, t.status)],
);

// ---------------------------------------------------------------------------
// Live map

export const mapEvents = mysqlTable(
  "map_events",
  {
    id: id(),
    conflictId: fk().references(() => conflicts.id, { onDelete: "set null" }),
    storyId: fk().references(() => stories.id, { onDelete: "set null" }),
    kind: mysqlEnum(["clash", "strike", "protest", "diplomacy", "humanitarian", "other"])
      .notNull()
      .default("other"),
    severity: int().notNull().default(1), // 1 (low) to 5 (high)
    lat: double().notNull(),
    lng: double().notNull(),
    occurredAt: datetime({ mode: "date", fsp: 3 }).notNull(),
    titleEn: varchar({ length: 300 }).notNull(),
    titleUr: varchar({ length: 300 }),
    approved: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("map_events_time_idx").on(t.approved, t.occurredAt),
    index("map_events_conflict_idx").on(t.conflictId),
  ],
);

// ---------------------------------------------------------------------------
// Email alerts and digest (double opt-in)

export const subscribers = mysqlTable(
  "subscribers",
  {
    id: id(),
    email: varchar({ length: 255 }).notNull(),
    locale: locale().default("en"),
    status: mysqlEnum(["pending", "active", "unsubscribed"]).notNull().default("pending"),
    // Topics/conflicts followed, plus whether they want the weekly digest
    follows: json().$type<{ conflicts: string[]; topics: string[]; digest: boolean }>(),
    confirmTokenHash: varchar({ length: 128 }),
    confirmedAt: datetime({ mode: "date", fsp: 3 }),
    unsubscribeTokenHash: varchar({ length: 128 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("subscribers_email_uq").on(t.email)],
);

// ---------------------------------------------------------------------------
// Audit log: who did what, when. Written for every publish, approval,
// login and setting change.

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    actorId: fk().references(() => users.id, { onDelete: "set null" }),
    action: varchar({ length: 80 }).notNull(),
    entityType: varchar({ length: 40 }),
    entityId: varchar({ length: 36 }),
    details: json().$type<Record<string, unknown>>(),
    ipAddress: varchar({ length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_created_idx").on(t.createdAt),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
  ],
);
