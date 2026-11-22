import type { NextConfig } from "next";

// Security headers sent on every response. A full Content-Security-Policy is
// added in Phase 5, once the ad and analytics scripts are known.
const securityHeaders = [
  // includeSubDomains/preload are added at launch, once every subdomain has HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Lets the dev server be opened through a GitHub Codespaces forwarded URL.
  allowedDevOrigins: ["*.app.github.dev"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // Old WordPress addresses. The old posts are not migrated, so these go to
  // the home page instead of returning 404s. Query-style links (?p=123,
  // ?feed=rss2) already land on the home page and need no rule.
  async redirects() {
    return [
      { source: "/wp-admin/:path*", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
      { source: "/wp-content/:path*", destination: "/", permanent: true },
      { source: "/feed/:path*", destination: "/", permanent: true },
      { source: "/category/:path*", destination: "/", permanent: true },
      { source: "/tag/:path*", destination: "/", permanent: true },
      { source: "/author/:path*", destination: "/", permanent: true },
      { source: "/:year(\\d{4})/:month(\\d{2})/:rest*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
