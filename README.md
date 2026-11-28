# Global Conflict Watch

Conflict and geopolitics news site in English and Urdu, built with Next.js 16.
See [PLAN.md](PLAN.md) for the full rebuild plan and
[docs/SETUP-HOSTING.md](docs/SETUP-HOSTING.md) for hosting setup.

## Develop

```powershell
npm install
copy .env.example .env.local      # fill in DATABASE_URL and AUTH_SECRET
.\scripts\setup-local-db.ps1      # creates the local MariaDB database and user
npm run db:migrate                # creates the tables
npm run admin:create -- --email you@example.com --name "Your Name"
npm run db:seed-sample            # optional: sample stories, conflicts, map events
npm run dev                       # http://localhost:3000  (admin: /admin)
```

On this PC the project's MariaDB 13 runs on port **3307** (127.0.0.1 only),
because another MariaDB (360Atlas) already uses 3306.

## Structure

- `src/app/[locale]/` - public site, `/en/...` and `/ur/...` (Urdu right-to-left):
  front page with the globe map, `stories/`, `conflicts/`, `topics/`, `search`, `about`
- `src/lib/public-data.ts` - every database read for the public site
- `src/components/world-map.tsx` - the globe (MapLibre + OpenFreeMap, no key needed)
- `src/app/globals.css` - the Broadsheet design tokens and type
- `src/app/admin/` - newsroom: login, two-factor setup, review inbox, story editor
  (text in both languages, sources, fact-check claims, publish), conflicts, sections,
  map events and the activity log. Actions are in `src/app/admin/actions/`.
- `src/lib/admin-data.ts` - newsroom reads; `src/lib/editorial.ts` - publish rules
- `src/db/schema.ts` - database tables; `npm run db:generate` after changes
- `src/lib/auth.ts` - login (Better Auth): single editor, two-factor required
- `messages/` - interface text in English and Urdu

## Check before deploying

```powershell
npm run lint
npm run test:unit   # publish rules, slugs, dates
npm run build
npm run test:e2e    # with the site running: routing, login flow, newsroom pages
                    # set GCW_TEST_SAMPLE_CONTENT=1 after db:seed-sample to test the public pages
```

## Test on GitHub

The site runs in GitHub Codespaces (the database is added in Phase 1). Every push runs the
CI checks. See [docs/TESTING-ON-GITHUB.md](docs/TESTING-ON-GITHUB.md).

## Deploy (Hostinger, after GitHub testing)

Hostinger Node.js app with build command `npm run build` and start command
`npm start`. Set environment variables in hPanel, never in committed files.
To upload by zip instead of GitHub: `.\scripts\package-release.ps1`.

Health check: `/api/health`.
