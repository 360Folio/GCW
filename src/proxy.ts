import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sends "/" and un-prefixed paths to /en/... or /ur/... (from the browser's
// language), and keeps the chosen language in a cookie.
export default createMiddleware(routing);

export const config = {
  // Skip the admin area, API routes, Next.js internals and files with an
  // extension (images, favicon, robots.txt...).
  matcher: ["/((?!admin|api|_next|_vercel|.*\\..*).*)"],
};
