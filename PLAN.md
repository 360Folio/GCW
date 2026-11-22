# Global Conflict Watch: rebuild plan

Status: draft for approval. Nothing has been built yet.

## Build spec

- **Goal:** Replace the stale WordPress site with a fast, distinctive, bilingual (English + Urdu) conflict-news site. AI does the legwork, and one editor approves every story in minutes a day.
- **Users:** Global readers in English and Urdu, mostly on phones and often on slow connections. One editor (you) uses the admin panel.
- **Must have (v1):**
  - Newsroom pipeline: trusted-source intake → AI draft with sources → fact-check flags → your approval → Urdu translation → your approval → publish
  - Live conflict map
  - Conflict hub pages (explainer, timeline, related stories)
  - Email alerts by topic, plus a weekly digest
  - "Ask GCW", an AI assistant that answers from published articles and cites them
  - English and Urdu throughout, with right-to-left layout for Urdu
  - Ads with a consent banner, plus donations
  - HTTPS, two-factor admin login, security headers, backups
- **Out of scope for v1:** a multi-user newsroom (roles beyond one admin), paid membership tiers, comments, native mobile apps, video, and migrating the old WordPress posts (you're starting fresh).
- **Constraints:** Hostinger hosting on a Node.js-capable plan, a single editor, and a daily workload of about 30 minutes or less.
- **Deal-breakers (acceptance tests):**
  1. It must not look like a template.
  2. It must be fast on mobile: under 2 s to show the main content on 4G, and under 150 KB of JavaScript on article pages.
  3. Your daily review must take 30 minutes or less.
  4. No unreviewed AI claim can reach readers.
- **Assumptions (correct me):**
  - You can read Urdu well enough to approve translations.
  - Hostinger's Node.js plan comes with MySQL/MariaDB, not PostgreSQL.
  - The domain's DNS can move to Cloudflare's free plan.
  - The AI provider is chosen at launch (the code supports swapping providers).

## Architecture

| Part | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript**, one app for both the public site and the admin | One thing to deploy on Hostinger. No separate Express server. |
| Styling | Tailwind CSS plus a custom design system (not a theme) | Distinct look and small CSS |
| Languages | `next-intl`, with `/en/...` and `/ur/...` routes, right-to-left layout, and an Urdu Nastaliq web font | Proper bilingual SEO through `hreflang` |
| Database | **MySQL/MariaDB + Drizzle ORM** | Comes with Hostinger. Typed queries and migrations. |
| AI | Provider-agnostic layer (Vercel AI SDK), with schema-validated structured outputs | Works with Claude, OpenAI or others. No fragile `JSON.parse`. |
| Background jobs | Hostinger cron calls signed `/api/jobs/*` endpoints with locking | No separate worker process, and jobs can't run twice at once |
| Map | MapLibre GL + free vector tiles. Events come from editor-approved stories and optional GDELT feeds. | No Google Maps bill. Licensing to check before using ACLED data. |
| Email | Brevo or Resend (free tier), double opt-in | Alerts and digest |
| Search / Ask GCW | Database full-text search + AI answer that cites articles; refuses when the articles have no answer | Can only use published content |
| Edge | Cloudflare (DNS, HTTPS, firewall, bot protection, caching) | Security and speed for free |
| Auth | Auth.js: a single admin with password + TOTP two-factor login, login rate limit | |

## How the daily newsroom works

1. **Intake (automatic, hourly):** RSS feeds and APIs from a source list you approve (wire services, major outlets, official statements). Reports about the same event are grouped together.
2. **Draft (automatic):** The AI writes an English draft from the grouped sources only. Every factual sentence links to the source it came from.
3. **Fact-check (automatic):** Names, dates, titles, numbers and places are pulled out and checked against the source texts and a "current facts" sheet you maintain (for example, who holds which office). Anything unsupported is highlighted in red.
4. **Your review (the 30-minute budget):** An inbox of drafts. Each shows the draft and its sources side by side, with red flags at the top. Publishing is blocked until every flag is resolved. You approve, edit or reject.
5. **Urdu (automatic, then you):** Approved stories are translated, and you approve the Urdu version in the same screen.
6. **Publish (automatic):** The story updates the site, its conflict hub, the map and the sitemaps, and goes to email alerts and social posts.

## Phases

Each phase ends with something working that you can see.

**Phase 0: Setup (about 1 day)**
- Confirm the Hostinger plan supports Node.js apps and check its MySQL version.
- Move DNS to Cloudflare and switch on HTTPS.
- Create a git repository, environment settings and a deploy script.
- Back up and harden the old WordPress site, which stays up until launch. Redirects from its old links to the new home page are already built into the new app.
- Testing happens on GitHub first: a private repository, GitHub Codespaces to run the site (the test database is added in Phase 1), and GitHub Actions checks on every push ([docs/TESTING-ON-GITHUB.md](docs/TESTING-ON-GITHUB.md)).
- After GitHub testing, do a test deploy to a Hostinger subdomain (`new.globalconflictwatch.com`).
- Account steps are listed in [docs/SETUP-HOSTING.md](docs/SETUP-HOSTING.md).

**Phase 1: Foundations**
- Database schema: stories, sources, claims, translations, conflicts, map events, subscribers, audit log.
- Admin login with two-factor.
- Design direction: 2–3 visual concepts for you to choose from **before** any pages are built (deal-breaker 1). **Chosen: Broadsheet**, with a zoomable globe map (MapLibre + OpenFreeMap, as in 360Atlas) on the front page.
- Public pages in English and Urdu: home (with the map), story, conflict, section (category), about, search.

**Phase 2: Newsroom pipeline**
- Source intake and grouping, AI drafts, the fact-check engine and the review inbox.
- Translation workflow and an audit log of who approved what and when.

**Phase 3: Interactive**
- Conflict hub pages, with an explainer, a timeline and key figures.
- The live map, linked to the hubs and stories.

**Phase 4: Audience**
- Topic follows, email alerts and the weekly digest.
- Ask GCW, with rate limits and abuse protection.
- Automatic social posting.

**Phase 5: Revenue and launch**
- AdSense with a Google-certified consent banner, and ad slots that don't cause layout shifts.
- Donation button.
- SEO: Open Graph previews, Google News structured data, news sitemap, `hreflang`.
- Monitoring: uptime alerts, error tracking and daily off-site backups.
- A security review and a check against the four deal-breakers before launch.

## Open decisions (needed by the phase shown)

- **AI provider** (Phase 2): Claude, another model, or a router. The code supports any of them.
- **Donation processor** (Phase 5): Stripe isn't available to businesses registered in Pakistan. Depending on where you're registered, the options include Patreon, Buy Me a Coffee, Paddle or Lemon Squeezy.
- **Map data source** (Phase 3): your own stories plus GDELT is free. ACLED's licence needs checking for an ad-supported site.
- **Source list** (Phase 2): which outlets and feeds you trust.
