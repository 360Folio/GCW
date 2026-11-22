# Testing the site on GitHub

The full site, including its database, runs in **GitHub Codespaces**: a
private cloud computer started from your repository and opened in the
browser. Every push is also checked automatically by **GitHub Actions**
(lint, type check, build). Moving to Hostinger comes later and uses the same
setup (Node.js + MariaDB/MySQL).

## One-time setup

1. **Create the repository:** go to https://github.com/new
   - Name: `global-conflict-watch`
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
   packages and starts the database.
2. In the Codespace terminal, run one of these:
   - `npm run dev` to try changes as you make them
   - `npm run preview` to test the real production build
     (the same as Hostinger will run)
3. Wait until the terminal shows **`✓ Ready`**. `npm run preview` builds
   first, which takes about a minute. Opening the site before that gives
   an **HTTP ERROR 502**; just reload once it's ready.
4. Open the **GCW site** link from the pop-up or the **Ports** panel
   (port 3000). Its address looks like
   `https://<name>-3000.app.github.dev`, and it's **private to your
   GitHub account** unless you change the port's visibility in the
   **Ports** panel.
5. Check `/api/health`. It should show `"status":"ok"`.

## After the Codespace setup changes

When files in `.devcontainer/` change, an existing Codespace keeps the old
setup until it's rebuilt:

1. In the Codespace terminal, run `git pull`.
2. Press **Ctrl+Shift+P**, then choose **Codespaces: Rebuild Container**.
   This takes a few minutes. Your code is kept, but the test database
   starts empty.

## If the site gives HTTP 502

- Make sure a terminal is still running `npm run preview` and shows
  `✓ Ready`. If the Codespace slept, start it again.
- In a second terminal, run `curl -s localhost:3000/api/health`.
  If that prints `"status":"ok"` but the browser still shows 502, the
  forwarding is the problem. In the **Ports** tab, right-click port 3000 >
  **Stop Forwarding Port**, then **Add Port** > `3000`.

## Costs and limits

- Personal GitHub accounts get a free monthly Codespaces allowance (enough
  for roughly 60 hours a month on the smallest machine). Usage shows at
  *GitHub > Settings > Billing*.
- **Stop the Codespace when you're done** (*Code > Codespaces > ⋯ > Stop*).
  An idle Codespace stops by itself after 30 minutes.
- Unused Codespaces are deleted after 30 days, along with their test
  database. The code in the repository is never affected.

## Automatic checks

Each push to `main` runs the **CI** workflow (*Actions* tab). A red ✗ means
the code wouldn't build, so it must be fixed before anything is deployed.
