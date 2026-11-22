# Global Conflict Watch

Conflict and geopolitics news site in English and Urdu, built with Next.js 16.
See [PLAN.md](PLAN.md) for the full rebuild plan and
[docs/SETUP-HOSTING.md](docs/SETUP-HOSTING.md) for hosting setup.

## Develop

```powershell
npm install
copy .env.example .env.local   # then fill in values as phases need them
npm run dev                    # http://localhost:3000
```

## Check before deploying

```powershell
npm run lint
npm run build
```

## Test on GitHub

The full site runs in GitHub Codespaces (app + MariaDB). Every push runs the
CI checks. See [docs/TESTING-ON-GITHUB.md](docs/TESTING-ON-GITHUB.md).

## Deploy (Hostinger, after GitHub testing)

Hostinger Node.js app with build command `npm run build` and start command
`npm start`. Set environment variables in hPanel, never in committed files.
To upload by zip instead of GitHub: `.\scripts\package-release.ps1`.

Health check: `/api/health`.
