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
npm run dev                       # http://localhost:3000  (admin: /admin)
```

On this PC the project's MariaDB 13 runs on port **3307** (127.0.0.1 only),
because another MariaDB (360Atlas) already uses 3306.

## Structure

- `src/app/[locale]/` - public site, `/en/...` and `/ur/...` (Urdu right-to-left)
- `src/app/admin/` - newsroom: login, two-factor setup, dashboard
- `src/db/schema.ts` - database tables; `npm run db:generate` after changes
- `src/lib/auth.ts` - login (Better Auth): single editor, two-factor required
- `messages/` - interface text in English and Urdu

## Check before deploying

```powershell
npm run lint
npm run build
npm run test:e2e    # with the site running: routing + full login flow
```

## Test on GitHub

The site runs in GitHub Codespaces (the database is added in Phase 1). Every push runs the
CI checks. See [docs/TESTING-ON-GITHUB.md](docs/TESTING-ON-GITHUB.md).

## Deploy (Hostinger, after GitHub testing)

Hostinger Node.js app with build command `npm run build` and start command
`npm start`. Set environment variables in hPanel, never in committed files.
To upload by zip instead of GitHub: `.\scripts\package-release.ps1`.

Health check: `/api/health`.
