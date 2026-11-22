/**
 * Loads SAMPLE content for testing the public pages: conflicts, topics,
 * stories in English and Urdu, sources, checked claims and map events.
 * Every item is marked as a sample and its address starts with "sample-".
 *
 *   npm run db:seed-sample             replace the sample content
 *   npm run db:seed-sample -- --remove remove it again
 *
 * Running it again replaces the old sample content, with fresh dates.
 * It refuses to run against the live site.
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../src/db/schema";

config({ path: ".env.local", quiet: true });

const { values } = parseArgs({ options: { remove: { type: "boolean", default: false } } });

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

const SAMPLE_EN = "This is sample text used to test the layout. It is not real reporting.";
const SAMPLE_UR = "یہ نمونے کی تحریر ہے جو صفحے کی ترتیب جانچنے کے لیے استعمال ہو رہی ہے۔ یہ اصل خبر نہیں ہے۔";

const bodyEn = (topic: string) => `${SAMPLE_EN} The finished story about ${topic} will appear here, written from the sources listed beside it and approved by the editor.

Each paragraph that states a fact is tied to one of those sources. Names, dates, figures and places are checked before the story can be published, and anything that cannot be traced is removed.

## What happens next

A short section like this explains what to watch for in the coming days, with links to earlier coverage of the same conflict.

> A quotation from an official statement would be set like this, with its source named in the text.

- A list of key points can be used
- when a story covers several separate developments`;

const bodyUr = `${SAMPLE_UR} مکمل خبر یہاں شائع ہوگی، جو ساتھ دیے گئے ذرائع کی بنیاد پر لکھی جائے گی اور مدیر کی منظوری کے بعد شائع ہوگی۔

ہر وہ پیراگراف جس میں کوئی حقیقت بیان کی گئی ہو، انہی ذرائع میں سے کسی ایک سے منسلک ہوتا ہے۔ نام، تاریخیں، اعداد و شمار اور مقامات اشاعت سے پہلے جانچے جاتے ہیں، اور جس بات کا ماخذ نہ ملے اسے نکال دیا جاتا ہے۔

## آگے کیا ہوگا

اس طرح کا ایک مختصر حصہ بتاتا ہے کہ آنے والے دنوں میں کن باتوں پر نظر رکھنی ہے۔

> کسی سرکاری بیان کا اقتباس اس طرح دکھایا جائے گا، اور اس کا ماخذ متن میں بتایا جائے گا۔`;

const CONFLICTS = [
  { slug: "sample-sudan", lat: 15.6, lng: 32.5, region: "East Africa", started: "2023-04-15", en: ["Sudan", "Sample summary: the war between the army and the Rapid Support Forces."], ur: ["سوڈان", "نمونہ خلاصہ: فوج اور ریپڈ سپورٹ فورسز کے درمیان جنگ۔"] },
  { slug: "sample-russia-ukraine", lat: 49, lng: 32, region: "Europe", started: "2022-02-24", en: ["Russia–Ukraine", "Sample summary: the full-scale war and the talks around it."], ur: ["روس–یوکرین", "نمونہ خلاصہ: مکمل جنگ اور اس سے جڑے مذاکرات۔"] },
  { slug: "sample-israel-gaza", lat: 31.4, lng: 34.4, region: "Middle East", started: "2023-10-07", en: ["Israel–Gaza", "Sample summary: the war in Gaza and the ceasefire negotiations."], ur: ["اسرائیل–غزہ", "نمونہ خلاصہ: غزہ کی جنگ اور جنگ بندی کے مذاکرات۔"] },
  { slug: "sample-myanmar", lat: 21.9, lng: 96.1, region: "South-East Asia", started: "2021-02-01", en: ["Myanmar", "Sample summary: the civil war since the 2021 coup."], ur: ["میانمار", "نمونہ خلاصہ: 2021 کی فوجی بغاوت کے بعد سے جاری خانہ جنگی۔"] },
  { slug: "sample-sahel", lat: 14.5, lng: -4.2, region: "West Africa", started: "2012-01-17", en: ["The Sahel", "Sample summary: insurgencies across Mali, Burkina Faso and Niger."], ur: ["ساحل کا خطہ", "نمونہ خلاصہ: مالی، برکینا فاسو اور نائجر میں شورشیں۔"] },
  { slug: "sample-dr-congo", lat: -1.7, lng: 29.2, region: "Central Africa", started: "2022-03-01", en: ["DR Congo", "Sample summary: fighting in the eastern provinces."], ur: ["کانگو", "نمونہ خلاصہ: مشرقی صوبوں میں لڑائی۔"] },
  { slug: "sample-yemen-red-sea", lat: 14.8, lng: 42.95, region: "Middle East", started: "2014-09-16", en: ["Yemen and the Red Sea", "Sample summary: the war in Yemen and attacks on shipping."], ur: ["یمن اور بحیرۂ احمر", "نمونہ خلاصہ: یمن کی جنگ اور بحری جہازوں پر حملے۔"] },
] as const;

const TOPICS = [
  { slug: "sample-analysis", en: "Analysis", ur: "تجزیہ" },
  { slug: "sample-fact-check", en: "Fact check", ur: "حقائق کی جانچ" },
  { slug: "sample-diplomacy", en: "Diplomacy", ur: "سفارت کاری" },
  { slug: "sample-humanitarian", en: "Humanitarian", ur: "انسانی صورتحال" },
] as const;

type C = (typeof CONFLICTS)[number]["slug"];
type T = (typeof TOPICS)[number]["slug"];

const STORIES: {
  slug: string; conflict: C; topic: T | null; hours: number; urdu: boolean;
  en: [string, string]; ur: [string, string]; about: string;
}[] = [
  { slug: "sample-sudan-aid-convoys", conflict: "sample-sudan", topic: "sample-humanitarian", hours: 2, urdu: true, about: "aid convoys in Sudan",
    en: ["Sample: Aid convoys reach a besieged city as talks enter a second week", "Placeholder summary. Two sentences here tell the reader the point of the story before the first paragraph."],
    ur: ["نمونہ: مذاکرات کے دوسرے ہفتے میں امدادی قافلے محصور شہر پہنچ گئے", "نمونہ خلاصہ۔ یہاں دو جملے قاری کو پہلے پیراگراف سے پہلے خبر کا نچوڑ بتاتے ہیں۔"] },
  { slug: "sample-black-sea-shipping", conflict: "sample-russia-ukraine", topic: "sample-diplomacy", hours: 5, urdu: true, about: "Black Sea shipping",
    en: ["Sample: Black Sea shipping lane reopens after overnight closure", "Placeholder summary of what changed and why it matters."],
    ur: ["نمونہ: رات بھر بندش کے بعد بحیرۂ اسود کا بحری راستہ دوبارہ کھل گیا", "نمونہ خلاصہ: کیا بدلا اور یہ کیوں اہم ہے۔"] },
  { slug: "sample-congo-displacement", conflict: "sample-dr-congo", topic: "sample-humanitarian", hours: 9, urdu: true, about: "displacement in eastern Congo",
    en: ["Sample: UN agency revises displacement figures for eastern Congo", "Placeholder summary of the new figures and where they come from."],
    ur: ["نمونہ: اقوام متحدہ کے ادارے نے مشرقی کانگو میں بے گھر افراد کے اعداد و شمار پر نظرثانی کر دی", "نمونہ خلاصہ: نئے اعداد و شمار اور ان کا ماخذ۔"] },
  { slug: "sample-sahel-security-pact", conflict: "sample-sahel", topic: "sample-analysis", hours: 20, urdu: true, about: "the Sahel security pact",
    en: ["Sample: What the new Sahel security pact does and does not change", "Placeholder summary of an analysis piece."],
    ur: ["نمونہ: ساحل کا نیا سکیورٹی معاہدہ کیا بدلتا ہے اور کیا نہیں", "نمونہ خلاصہ: ایک تجزیاتی تحریر۔"] },
  { slug: "sample-gaza-video-fact-check", conflict: "sample-israel-gaza", topic: "sample-fact-check", hours: 26, urdu: true, about: "a viral video",
    en: ["Fact check (sample): a viral video said to show Gaza was filmed years earlier", "Placeholder summary of what was claimed and what we found."],
    ur: ["حقائق کی جانچ (نمونہ): غزہ کی بتائی جانے والی وائرل ویڈیو برسوں پرانی نکلی", "نمونہ خلاصہ: کیا دعویٰ کیا گیا اور ہمیں کیا ملا۔"] },
  { slug: "sample-myanmar-air-strikes", conflict: "sample-myanmar", topic: null, hours: 30, urdu: true, about: "air strikes in Myanmar",
    en: ["Sample: Air strikes reported in villages north of Mandalay", "Placeholder summary of the reports and how they were checked."],
    ur: ["نمونہ: منڈالے کے شمال میں دیہات پر فضائی حملوں کی اطلاعات", "نمونہ خلاصہ: اطلاعات اور ان کی جانچ کیسے ہوئی۔"] },
  { slug: "sample-hodeidah-port", conflict: "sample-yemen-red-sea", topic: null, hours: 44, urdu: true, about: "the port of Hodeidah",
    en: ["Sample: Port operations paused at Hodeidah after an incident at sea", "Placeholder summary of the incident and its effect on shipping."],
    ur: ["نمونہ: سمندر میں واقعے کے بعد حدیدہ بندرگاہ پر کام روک دیا گیا", "نمونہ خلاصہ: واقعہ اور بحری آمد و رفت پر اس کا اثر۔"] },
  // English only: the Urdu translation is still a draft, so /ur must not show it.
  { slug: "sample-front-lines-analysis", conflict: "sample-russia-ukraine", topic: "sample-analysis", hours: 60, urdu: false, about: "the front lines",
    en: ["Sample: Why the front lines keep moving", "Placeholder summary. This sample has no approved Urdu translation, so it appears only in English."],
    ur: ["نمونہ: محاذ کی لکیریں کیوں بدلتی رہتی ہیں", "ترجمہ ابھی منظور نہیں ہوا۔"] },
];

const EVENTS: { conflict: C; story?: string; lat: number; lng: number; kind: schema.MapEventKind; sev: number; hours: number; en: string; ur: string }[] = [
  { conflict: "sample-sudan", story: "sample-sudan-aid-convoys", lat: 15.6, lng: 32.5, kind: "clash", sev: 5, hours: 2, en: "Sample: fighting reported on two fronts around Khartoum", ur: "نمونہ: خرطوم کے گرد دو محاذوں پر لڑائی کی اطلاعات" },
  { conflict: "sample-russia-ukraine", lat: 50.0, lng: 36.2, kind: "strike", sev: 4, hours: 4, en: "Sample: overnight drone strikes on energy sites near Kharkiv", ur: "نمونہ: خارکیف کے قریب توانائی کے مراکز پر رات کو ڈرون حملے" },
  { conflict: "sample-israel-gaza", lat: 31.5, lng: 34.45, kind: "diplomacy", sev: 2, hours: 5, en: "Sample: negotiators meet for a third round", ur: "نمونہ: مذاکرات کار تیسرے دور کے لیے ملے" },
  { conflict: "sample-yemen-red-sea", story: "sample-hodeidah-port", lat: 14.8, lng: 42.95, kind: "other", sev: 3, hours: 7, en: "Sample: port operations paused at Hodeidah", ur: "نمونہ: حدیدہ بندرگاہ پر کام روک دیا گیا" },
  { conflict: "sample-dr-congo", story: "sample-congo-displacement", lat: -1.7, lng: 29.2, kind: "humanitarian", sev: 4, hours: 9, en: "Sample: new displacement camps north of Goma", ur: "نمونہ: گوما کے شمال میں بے گھر افراد کے نئے کیمپ" },
  { conflict: "sample-myanmar", story: "sample-myanmar-air-strikes", lat: 22.4, lng: 96.0, kind: "strike", sev: 3, hours: 12, en: "Sample: air strikes on villages north of Mandalay", ur: "نمونہ: منڈالے کے شمال میں دیہات پر فضائی حملے" },
  { conflict: "sample-sahel", lat: 14.5, lng: -4.2, kind: "clash", sev: 3, hours: 26, en: "Sample: attack on a checkpoint near Mopti", ur: "نمونہ: موپتی کے قریب چوکی پر حملہ" },
  { conflict: "sample-sahel", lat: 12.37, lng: -1.53, kind: "protest", sev: 1, hours: 50, en: "Sample: protest in Ouagadougou", ur: "نمونہ: اواگادوگو میں احتجاج" },
  { conflict: "sample-russia-ukraine", story: "sample-black-sea-shipping", lat: 46.5, lng: 30.7, kind: "diplomacy", sev: 2, hours: 5, en: "Sample: Black Sea shipping lane reopens near Odesa", ur: "نمونہ: اوڈیسا کے قریب بحری راستہ دوبارہ کھل گیا" },
  // Older than seven days: must NOT appear on the map.
  { conflict: "sample-sudan", lat: 13.6, lng: 25.3, kind: "clash", sev: 2, hours: 24 * 10, en: "Sample: old event (should be hidden)", ur: "نمونہ: پرانا واقعہ" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (/globalconflictwatch\.com/i.test(process.env.SITE_URL ?? "")) {
    throw new Error("Refusing to load sample content on the live site.");
  }

  const pool = mysql.createPool({ uri: url, timezone: "Z", charset: "utf8mb4" });
  const db = drizzle({ client: pool, schema, mode: "default", casing: "snake_case" });
  const { conflicts, conflictTranslations, topics, topicTranslations, stories, storyTranslations, sources, claims, mapEvents } = schema;

  try {
    await db.transaction(async (tx) => {
      // Remove earlier sample content (translations, sources and claims go with it).
      const oldConflicts = await tx.select({ id: conflicts.id }).from(conflicts).where(like(conflicts.slug, "sample-%"));
      if (oldConflicts.length) {
        await tx.delete(mapEvents).where(inArray(mapEvents.conflictId, oldConflicts.map((c) => c.id)));
      }
      await tx.delete(stories).where(like(stories.slug, "sample-%"));
      await tx.delete(conflicts).where(like(conflicts.slug, "sample-%"));
      await tx.delete(topics).where(like(topics.slug, "sample-%"));
      if (values.remove) return;

      const conflictId = new Map<string, string>();
      for (const [i, c] of CONFLICTS.entries()) {
        const id = randomUUID();
        conflictId.set(c.slug, id);
        await tx.insert(conflicts).values({ id, slug: c.slug, status: "active", region: c.region, lat: c.lat, lng: c.lng, startedOn: new Date(c.started), sortOrder: i });
        await tx.insert(conflictTranslations).values([
          { conflictId: id, locale: "en", name: c.en[0], summary: c.en[1] },
          { conflictId: id, locale: "ur", name: c.ur[0], summary: c.ur[1] },
        ]);
      }

      const topicId = new Map<string, string>();
      for (const [i, t] of TOPICS.entries()) {
        const id = randomUUID();
        topicId.set(t.slug, id);
        await tx.insert(topics).values({ id, slug: t.slug, sortOrder: i });
        await tx.insert(topicTranslations).values([
          { topicId: id, locale: "en", name: t.en },
          { topicId: id, locale: "ur", name: t.ur },
        ]);
      }

      const storyId = new Map<string, string>();
      for (const s of STORIES) {
        const id = randomUUID();
        storyId.set(s.slug, id);
        const published = hoursAgo(s.hours);
        await tx.insert(stories).values({
          id, slug: s.slug, status: "published", origin: "editor",
          conflictId: conflictId.get(s.conflict), topicId: s.topic ? topicId.get(s.topic) : null,
          publishedAt: published,
        });
        await tx.insert(storyTranslations).values([
          { storyId: id, locale: "en", title: s.en[0], summary: s.en[1], body: bodyEn(s.about), status: "approved", source: "editor", approvedAt: published },
          { storyId: id, locale: "ur", title: s.ur[0], summary: s.ur[1], body: bodyUr, status: s.urdu ? "approved" : "draft", source: "ai", approvedAt: s.urdu ? published : null },
        ]);
        const sourceIds = [randomUUID(), randomUUID(), randomUUID()];
        await tx.insert(sources).values([
          { id: sourceIds[0], storyId: id, url: "https://example.org/sample-un-report", publisher: "Sample source: UN agency", title: "Placeholder report title" },
          { id: sourceIds[1], storyId: id, url: "https://example.org/sample-wire-dispatch", publisher: "Sample source: wire agency", title: "Placeholder dispatch title" },
          { id: sourceIds[2], storyId: id, url: "https://example.org/sample-statement", publisher: "Sample source: official statement", title: "Placeholder statement" },
        ]);
        await tx.insert(claims).values([
          { id: randomUUID(), storyId: id, text: "Sample date claim", kind: "date", status: "supported", sourceId: sourceIds[0] },
          { id: randomUUID(), storyId: id, text: "Sample figure claim", kind: "figure", status: "supported", sourceId: sourceIds[0] },
          { id: randomUUID(), storyId: id, text: "Sample place claim", kind: "place", status: "supported", sourceId: sourceIds[1] },
          { id: randomUUID(), storyId: id, text: "Sample name claim", kind: "name", status: "resolved", sourceId: sourceIds[2], note: "Spelling corrected" },
        ]);
      }

      await tx.insert(mapEvents).values(
        EVENTS.map((e) => ({
          id: randomUUID(),
          conflictId: conflictId.get(e.conflict),
          storyId: e.story ? storyId.get(e.story) : null,
          kind: e.kind, severity: e.sev, lat: e.lat, lng: e.lng,
          occurredAt: hoursAgo(e.hours), titleEn: e.en, titleUr: e.ur, approved: true,
        })),
      );
    });
    console.log(values.remove ? "Sample content removed." : `Sample content loaded: ${CONFLICTS.length} conflicts, ${STORIES.length} stories, ${EVENTS.length} map events.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
