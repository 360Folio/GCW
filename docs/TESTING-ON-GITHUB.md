# Testing the site on GitHub

The site runs in **GitHub Codespaces**: a private cloud computer started
from your repository and opened in the browser. Every push is also checked
automatically by **GitHub Actions** (lint, type check, build). Moving to
Hostinger comes later and uses the same Node.js + MariaDB setup. MariaDB
runs inside the Codespace and is set up automatically each time it starts.

## One-time setup

1. **Create the repository:** go to https://github.com/new
   - Name: `GCW` (already created: https://github.com/360Folio/GCW)
   - Visibility: **Private**
   - Don't add a README, .gitignore or licence (the project has them).
2. Send me the repository URL. I'll connect this folder and push. The first
   push opens a GitHub sign-in window. Sign in there yourself.
3. **Secrets (from Phase 2 on):** at
   *GitHub > Settings > Codespaces > Secrets*, add `AI_API_KEY`,
   `AUTH_SECRET` and similar, and give them access to this repository.
   They arrive in the Codespace as environment variables. Never put them
   in files.

## Running a test

1. On the repository page, click **Code > Codespaces > Create codespace on
   main**. The first start takes a few minutes, because it installs
   packages.
2. In the Codespace terminal, run one of these:
   - `npm run dev` to try changes as you make them
   - `npm run preview` to test the real production build
     (the same as Hostinger will run)
3. Wait until the terminal shows **`✓ Ready`**. `npm run preview` builds
   first, which takes about a minute. Opening the site before that gives
   an **HTTP ERROR 502**; just reload once it's ready.
4. The first time, create your editor account in a second terminal:
   `npm run admin:create -- --email you@example.com --name "Your Name"`
   (you'll be asked for a password, 12+ characters).
5. Open the **GCW site** link from the pop-up or the **Ports** panel
   (port 3000). Its address looks like
   `https://<name>-3000.app.github.dev`, and it's **private to your
   GitHub account** unless you change the port's visibility in the
   **Ports** panel.
6. Check `/api/health`, then sign in at `/admin/login`. It should show `"status":"ok"`.

## After the Codespace setup changes

When files in `.devcontainer/` change, an existing Codespace keeps the old
setup. The simplest way to pick up the new one:

1. At https://github.com/codespaces, delete the old Codespace
   (**⋯ > Delete**). Your code is safe on GitHub.
2. Create a new one: **Code > Codespaces > Create codespace on main**.

(**Codespaces: Rebuild Container** from **Ctrl+Shift+P** also works, when
the editor offers it.)

## If the site gives HTTP 502

- Make sure a terminal is still running `npm run preview` and shows
  `✓ Ready`. If the Codespace slept, start it again.
- In a second terminal, run `curl -s localhost:3000/api/health`.
  If that prints `"status":"ok"` but the browser still shows 502, the
  forwarding is the problem. In the **Ports** tab, right-click port 3000 >
  **Stop Forwarding Port**, then **Add Port** > `3000`.
- Only open the address from the **Ports** tab. The `localhost` and
  `Network` links printed in the terminal point inside the Codespace and
  don't work from your PC.

## Costs and limits

- Personal GitHub accounts get a free monthly Codespaces allowance (enough
  for roughly 60 hours a month on the smallest machine). Usage shows at
  *GitHub > Settings > Billing*.
- **Stop the Codespace when you're done** (*Code > Codespaces > ⋯ > Stop*).
  An idle Codespace stops by itself after 30 minutes.
- Unused Codespaces are deleted after 30 days. The code in the repository is never affected.

## Automatic checks

Each push to `main` runs the **CI** workflow (*Actions* tab). A red ✗ means
the code wouldn't build, so it must be fixed before anything is deployed.
