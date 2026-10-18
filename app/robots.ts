import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  // Used only to build absolute Sitemap URL. Next can handle relative too,
  // but absolute is preferable for SEO tools.
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  return env?.trim() || "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      // Allow indexing of public/marketing pages and the provider profile page.
      // Disallow routes that are app/auth-only or APIs.
      allow: [
        "/",
        "/leaderboard",
        "/demo",
        "/recommendation-factors",
        "/referral",
        "/performance",
        "/backtest-sim",
        "/compare",
        "/provider/",
        "/tax-report",
        "/journal",
      ],
      disallow: [
        // Authenticated app area
        "/app*",
        // Account/security-only routes
        "/security*",
        "/api-keys*",
        // API endpoints
        "/api*",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

