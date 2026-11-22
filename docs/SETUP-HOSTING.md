# Phase 0: hosting and domain setup

These steps happen in your own Hostinger and Cloudflare accounts. Work
through them in order and tick them off. Hostinger's menu labels change
from time to time, so look for the closest match if a name differs.

## 1. Confirm the Hostinger plan runs Node.js

- [ ] In hPanel, open **Websites** and check whether you can add a
      **Node.js app** (sometimes listed as "Node.js Web App" or offered
      under "Add website"). Business and Cloud plans include it; the
      cheapest shared plans do not, and a VPS can always run it.
- [ ] Note the Node.js versions it offers. This project needs **20.9 or
      newer**, and **22 or 24** is preferred.
- [ ] Open **Databases > MySQL** and note whether it's MySQL or MariaDB,
      and its version. Phase 1 uses it.

If the plan can't add a Node.js app, tell me which plan you have before
upgrading. A Hostinger VPS (KVM 1 or 2) is the alternative.

## 2. Back up the old WordPress site

The old posts aren't moving to the new site, but keep a copy anyway.

- [ ] In hPanel, open **Files > Backups**, or the WordPress section, and
      download a full backup (files + database). Store it off the server.

## 3. Move DNS to Cloudflare (free plan)

- [ ] Create a free Cloudflare account and add `globalconflictwatch.com`.
- [ ] Cloudflare imports your existing DNS records. Check that the `A`
      record for `@` and the `www` record point to your Hostinger IP,
      and keep any email (`MX`) records unchanged.
- [ ] In Hostinger (**Domains > DNS / Nameservers**), replace the
      nameservers with the two Cloudflare gives you. This can take a few
      hours to take effect.

## 4. Turn on HTTPS

- [ ] In hPanel, install the free SSL certificate for
      `globalconflictwatch.com` **and** `www.globalconflictwatch.com`.
      Today's certificate doesn't cover the domain, which is why
      `https://` fails.
- [ ] In Cloudflare, under **SSL/TLS**, set the mode to **Full (strict)**.
      Don't use "Flexible", which leaves the Hostinger leg unencrypted.
- [ ] Turn on **Always Use HTTPS** in Cloudflare.
- [ ] Check that `https://globalconflictwatch.com` loads with a padlock.

## 5. Lock down the old site until launch

The WordPress site stays up until the new one replaces it. Until then:

- [ ] Change the WordPress admin passwords and turn on two-factor login.
- [ ] Delete the `readme.html` file from the site's root folder.
- [ ] In Cloudflare **Security > WAF**, add a rule that blocks
      `/wp-json/wp/v2/users` (it currently lists your admin usernames).

## 6. First test deploy of the new app

Use a subdomain so the live site isn't affected, for example
`new.globalconflictwatch.com`.

- [ ] Put the code in a **private** GitHub repository (I can do this when
      you say so), or create a zip with:
      `.\scripts\package-release.ps1`
- [ ] In hPanel, create a Node.js app on the subdomain from the GitHub
      repository or the zip. Settings:
      - Node.js version: 22 or 24
      - Build command: `npm run build`
      - Start command: `npm start`
- [ ] Open `https://new.globalconflictwatch.com/api/health`. It should
      show `"status":"ok"`.

Send me the results of steps 1 and 6, including any errors, and Phase 1
can start.
