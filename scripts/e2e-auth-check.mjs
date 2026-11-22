// End-to-end check of routing, the public pages and the admin login flow
// against a running server (npm run preview). Uses the account in
// GCW_TEST_ADMIN_EMAIL / GCW_TEST_ADMIN_PASSWORD. The public page checks run
// when GCW_TEST_SAMPLE_CONTENT=1 (load it with npm run db:seed-sample).
// Usage: node scripts/e2e-auth-check.mjs
import { createHmac } from "node:crypto";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";
const EMAIL = process.env.GCW_TEST_ADMIN_EMAIL;
const PASSWORD = process.env.GCW_TEST_ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("Set GCW_TEST_ADMIN_EMAIL and GCW_TEST_ADMIN_PASSWORD");

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
  if (!ok) failures++;
};

// Minimal cookie jar
const jar = new Map();
async function req(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", BASE);
  if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i);
    const value = pair.slice(i + 1);
    if (/max-age=0/i.test(c) || value === "") jar.delete(name);
    else jar.set(name, value);
  }
  return res;
}
const post = (path, body) =>
  req(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

function totp(secretBase32, offset = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretBase32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30) + offset));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

// --- Public routing -------------------------------------------------------
let r = await fetch(BASE + "/", { redirect: "manual", headers: { "accept-language": "en" } });
check("/ redirects to /en", r.status >= 300 && r.status < 400 && /\/en$/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
r = await fetch(BASE + "/", { redirect: "manual", headers: { "accept-language": "ur-PK,ur;q=0.9" } });
check("/ redirects Urdu browsers to /ur", /\/ur$/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
let html = await (await fetch(BASE + "/en")).text();
check("/en is English, left-to-right", /<html[^>]*lang="en"[^>]*dir="ltr"/.test(html));
html = await (await fetch(BASE + "/ur")).text();
check("/ur is Urdu, right-to-left", /<html[^>]*lang="ur"[^>]*dir="rtl"/.test(html) && html.includes("گلوبل کنفلکٹ واچ"));
r = await fetch(BASE + "/en/no-such-page");
check("unknown page under /en is 404", r.status === 404, String(r.status));
r = await fetch(BASE + "/wp-login.php", { redirect: "manual" });
check("old WordPress link redirects", r.status === 308, String(r.status));

// --- Public pages (needs `npm run db:seed-sample` first) -------------------
if (process.env.GCW_TEST_SAMPLE_CONTENT === "1") {
  const page = async (path) => {
    const res = await fetch(BASE + path);
    return { status: res.status, html: await res.text() };
  };
  let p = await page("/en");
  check("front page shows the latest story", p.html.includes("Aid convoys reach a besieged city"));
  check("front page map gets this week's events only", p.html.includes("fighting reported on two fronts") && !p.html.includes("old event (should be hidden)"));
  p = await page("/en/stories/sample-sudan-aid-convoys");
  check("story page shows sources and checks", p.status === 200 && p.html.includes("What we checked") && p.html.includes("example.org/sample-un-report"));
  p = await page("/ur/stories/sample-sudan-aid-convoys");
  check("Urdu story page is right-to-left", /dir="rtl"/.test(p.html) && p.html.includes("ہم نے کیا جانچا"));
  p = await page("/ur");
  check("story without approved Urdu is not on the Urdu front page", !p.html.includes("محاذ کی لکیریں"));
  p = await page("/ur/stories/sample-front-lines-analysis");
  check("story without approved Urdu shows not found in Urdu", p.html.includes("صفحہ نہیں ملا") && p.html.includes("noindex"));
  p = await page("/en/stories/no-such-story");
  check("unknown story shows not found, not indexed", p.html.includes("Page not found") && p.html.includes("noindex"));
  p = await page("/en/conflicts/sample-russia-ukraine");
  check("conflict page lists its stories", p.html.includes("2 stories"));
  p = await page("/en/topics/sample-analysis");
  check("section page lists its stories", p.html.includes("Sahel security pact"));
  p = await page("/en/search?q=Congo");
  check("search finds a story", p.html.includes("1 result") && p.html.includes("eastern Congo"));
  p = await page("/en/search?q=" + encodeURIComponent("%_"));
  check("search treats % and _ as plain text", p.html.includes("No results"));
  p = await page("/en/about");
  check("about page", p.status === 200 && p.html.includes("How a story is made"));
} else {
  console.log("SKIP  public content checks (set GCW_TEST_SAMPLE_CONTENT=1 after npm run db:seed-sample)");
}

// --- Admin is locked ------------------------------------------------------
html = await (await req("/admin")).text();
check("/admin without login goes to login", html.includes("/admin/login"));

// --- First login: password only, then two-factor setup is forced ----------
r = await post("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
let body = await r.json();
check("password sign-in works", r.ok && !body.twoFactorRedirect, String(r.status));
html = await (await req("/admin")).text();
check("dashboard sends you to two-factor setup first", html.includes("/admin/security"));

r = await post("/api/auth/two-factor/enable", { password: PASSWORD });
body = await r.json();
const secret = body.totpURI ? new URL(body.totpURI).searchParams.get("secret") : null;
check("two-factor setup returns QR data and backup codes", Boolean(secret) && body.backupCodes?.length >= 5);

r = await post("/api/auth/two-factor/verify-totp", { code: "000000" === totp(secret) ? "111111" : "000000" });
check("wrong code is rejected", !r.ok, String(r.status));
r = await post("/api/auth/two-factor/verify-totp", { code: totp(secret) });
check("correct code turns two-factor on", r.ok, String(r.status));
html = await (await req("/admin")).text();
check("dashboard opens once two-factor is on", html.includes("Welcome,") && html.includes("auth.sign_in"));

// --- Second login needs the code ------------------------------------------
await post("/api/auth/sign-out", {});
r = await (await req("/api/auth/get-session")).json();
check("sign-out ends the session", r === null);
r = await post("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
body = await r.json();
check("password alone now asks for the code", body.twoFactorRedirect === true);
html = await (await req("/admin")).text();
check("no dashboard before the code is entered", !html.includes("Welcome,"));
r = await post("/api/auth/two-factor/verify-totp", { code: totp(secret) });
check("code completes sign-in", r.ok, String(r.status));
html = await (await req("/admin")).text();
check("dashboard opens after the code", html.includes("Welcome,"));

// --- Brute-force protection -----------------------------------------------
jar.clear();
let limited = false;
for (let i = 0; i < 7; i++) {
  r = await post("/api/auth/sign-in/email", { email: EMAIL, password: "wrong-password-123" });
  if (r.status === 429) limited = true;
}
check("repeated wrong passwords are rate-limited", limited);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
